import { supabase } from "@/lib/supabase/client"
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from "date-fns"
import { calculateRevenueShare } from "./revenueShare"

export interface MonthlyPnL {
  month: string
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  expenses: {
    rent: number
    electricity: number
    water: number
    ingredients: number
    salaries: number
    other: number
    total: number
  }
  grossProfit: number
  netProfit: number
  profitMargin: number
  dailyBreakdown: DailySnapshot[]
}

export interface DailySnapshot {
  date: string
  revenue: number
  orders: number
  expenses: number
}

export async function calculateMonthlyPnL(
  year: number,
  month: number
): Promise<MonthlyPnL> {
  const monthStart = startOfMonth(new Date(year, month))
  const monthEnd = endOfMonth(new Date(year, month))
  const monthStr = format(monthStart, "yyyy-MM")

  const startDate = format(monthStart, "yyyy-MM-dd")
  const endDate = format(monthEnd, "yyyy-MM-dd")

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const dateStrings = days.map((d) => format(d, "yyyy-MM-dd"))

  const { data: dailyRecords, error: revenueError } = await supabase
    .from("daily_revenue")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)

  if (revenueError) {
    throw new Error(`Failed to fetch daily revenue: ${revenueError.message}`)
  }

  const records = dailyRecords ?? []

  const totalRevenue = records.reduce((s, r) => s + r.total_sales, 0)
  const totalOrders = records.reduce((s, r) => s + r.number_of_orders, 0)

  const { data: allExpensesData, error: expensesError } = await supabase
    .from("expenses")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)

  if (expensesError) {
    throw new Error(`Failed to fetch expenses: ${expensesError.message}`)
  }

  const allExpenses = allExpensesData ?? []

  const expensesByCategory = {
    rent: 0,
    electricity: 0,
    water: 0,
    ingredients: 0,
    salaries: 0,
    other: 0,
    total: 0,
  }

  for (const exp of allExpenses) {
    const cat = exp.category.toLowerCase()
    if (cat === "rent" || cat === "revenueshare") {
      expensesByCategory.rent += exp.amount
    } else if (cat === "electricity") {
      expensesByCategory.electricity += exp.amount
    } else if (cat === "water") {
      expensesByCategory.water += exp.amount
    } else if (cat === "ingredients") {
      expensesByCategory.ingredients += exp.amount
    } else if (cat === "salaries") {
      expensesByCategory.salaries += exp.amount
    } else {
      expensesByCategory.other += exp.amount
    }
  }

  if (expensesByCategory.rent === 0) {
    const revenueShareResult = await calculateRevenueShare(year, month)
    expensesByCategory.rent = revenueShareResult.effectiveRent
  }

  expensesByCategory.total =
    expensesByCategory.rent +
    expensesByCategory.electricity +
    expensesByCategory.water +
    expensesByCategory.ingredients +
    expensesByCategory.salaries +
    expensesByCategory.other

  const netProfit = totalRevenue - expensesByCategory.total

  const dailyBreakdown: DailySnapshot[] = dateStrings.map((dateStr) => {
    const dayRev = records.find((r) => r.date === dateStr)
    const dayExpenses = allExpenses
      .filter((e) => e.date === dateStr)
      .reduce((s, e) => s + e.amount, 0)
    return {
      date: dateStr,
      revenue: dayRev?.total_sales ?? 0,
      orders: dayRev?.number_of_orders ?? 0,
      expenses: dayExpenses,
    }
  })

  return {
    month: monthStr,
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    expenses: expensesByCategory,
    grossProfit: totalRevenue - expensesByCategory.ingredients,
    netProfit,
    profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
    dailyBreakdown,
  }
}
