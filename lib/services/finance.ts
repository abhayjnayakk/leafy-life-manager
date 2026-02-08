import { db } from "@/lib/db/client"
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

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const dateStrings = days.map((d) => format(d, "yyyy-MM-dd"))

  const dailyRecords = await db.dailyRevenue
    .where("date")
    .anyOf(dateStrings)
    .toArray()

  const totalRevenue = dailyRecords.reduce((s, r) => s + r.totalSales, 0)
  const totalOrders = dailyRecords.reduce((s, r) => s + r.numberOfOrders, 0)

  const allExpenses = await db.expenses
    .where("date")
    .between(
      format(monthStart, "yyyy-MM-dd"),
      format(monthEnd, "yyyy-MM-dd"),
      true,
      true
    )
    .toArray()

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
    const dayRev = dailyRecords.find((r) => r.date === dateStr)
    const dayExpenses = allExpenses
      .filter((e) => e.date === dateStr)
      .reduce((s, e) => s + e.amount, 0)
    return {
      date: dateStr,
      revenue: dayRev?.totalSales ?? 0,
      orders: dayRev?.numberOfOrders ?? 0,
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
