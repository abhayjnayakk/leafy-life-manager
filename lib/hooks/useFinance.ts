"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase/client"
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"
import type { DailyRevenue, Expense, ExpenseCategory } from "@/lib/db/schema"

// ============================================================
// Row-to-model mappers (mirrors useSupaDailyRevenue / useSupaExpenses)
// ============================================================

interface SupaDailyRevenueRow {
  id: string
  date: string
  total_sales: number
  number_of_orders: number
  payment_breakdown: { cash: number; upi: number; card: number }
  average_order_value: number
  created_at: string
  updated_at: string
}

interface SupaExpenseRow {
  id: string
  date: string
  category: string
  description: string
  amount: number
  is_recurring: boolean
  recurring_day: number | null
  receipt_note: string | null
  created_at: string
  updated_at: string
}

function rowToRevenue(row: SupaDailyRevenueRow): DailyRevenue {
  return {
    id: row.id,
    date: row.date,
    totalSales: Number(row.total_sales),
    numberOfOrders: Number(row.number_of_orders),
    paymentBreakdown: row.payment_breakdown ?? { cash: 0, upi: 0, card: 0 },
    averageOrderValue: Number(row.average_order_value),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToExpense(row: SupaExpenseRow): Expense {
  return {
    id: row.id,
    date: row.date,
    category: row.category as ExpenseCategory,
    description: row.description,
    amount: Number(row.amount),
    isRecurring: row.is_recurring,
    recurringDay: row.recurring_day ?? undefined,
    receiptNote: row.receipt_note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================
// useTodayRevenue — returns today's DailyRevenue or undefined
// ============================================================

export function useTodayRevenue() {
  const [record, setRecord] = useState<DailyRevenue | undefined>(undefined)
  const today = useMemo(() => new Date().toISOString().split("T")[0], [])

  useEffect(() => {
    let cancelled = false

    async function fetch() {
      const { data, error } = await supabase
        .from("daily_revenue")
        .select("*")
        .eq("date", today)
        .maybeSingle()

      if (error) {
        console.error("useTodayRevenue:", error.message)
        return
      }
      if (!cancelled) {
        setRecord(data ? rowToRevenue(data as SupaDailyRevenueRow) : undefined)
      }
    }

    fetch()

    const channel = supabase
      .channel("today-revenue-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_revenue" },
        (payload) => {
          if (cancelled) return
          const row = (payload.new ?? payload.old) as SupaDailyRevenueRow | undefined
          if (!row) return
          if (row.date === today) {
            if (payload.eventType === "DELETE") {
              setRecord(undefined)
            } else {
              setRecord(rowToRevenue(payload.new as SupaDailyRevenueRow))
            }
          }
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [today])

  return record
}

// ============================================================
// useWeeklyRevenue — last 7 days, shaped for chart
// ============================================================

interface WeeklyRevenuePoint {
  date: string
  label: string
  revenue: number
  orders: number
}

export function useWeeklyRevenue() {
  const [data, setData] = useState<WeeklyRevenuePoint[] | undefined>(undefined)
  const today = useMemo(() => new Date().toISOString().split("T")[0], [])

  useEffect(() => {
    let cancelled = false

    const days = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(), 6 - i), "yyyy-MM-dd")
    )
    const startDate = days[0]
    const endDate = days[days.length - 1]

    async function fetch() {
      const { data: rows, error } = await supabase
        .from("daily_revenue")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)

      if (error) {
        console.error("useWeeklyRevenue:", error.message)
        return
      }
      if (!cancelled) {
        const records = (rows as SupaDailyRevenueRow[]).map(rowToRevenue)
        setData(
          days.map((date) => {
            const rec = records.find((r) => r.date === date)
            return {
              date,
              label: format(new Date(date + "T00:00:00"), "EEE"),
              revenue: rec?.totalSales ?? 0,
              orders: rec?.numberOfOrders ?? 0,
            }
          })
        )
      }
    }

    fetch()

    const channel = supabase
      .channel("weekly-revenue-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_revenue" },
        (payload) => {
          if (cancelled) return
          const row = payload.new as SupaDailyRevenueRow | undefined
          if (!row) return
          if (row.date >= startDate && row.date <= endDate) {
            // Re-fetch to keep the full week consistent
            fetch()
          }
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [today])

  return data
}

// ============================================================
// useMonthlyRevenueShareStatus — revenue share calculation
// ============================================================

interface RevenueShareStatus {
  monthToDateRevenue: number
  revenueShare20Pct: number
  minimumGuarantee: number
  currentRent: number
  rentType: "Revenue Share" | "Minimum Guarantee"
  breakEvenRevenue: number
  progressPercent: number
  daysElapsed: number
  daysInMonth: number
}

export function useMonthlyRevenueShareStatus() {
  const [status, setStatus] = useState<RevenueShareStatus | undefined>(undefined)
  const today = useMemo(() => new Date().toISOString().split("T")[0], [])

  useEffect(() => {
    let cancelled = false

    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const startStr = format(monthStart, "yyyy-MM-dd")
    const endStr = format(now, "yyyy-MM-dd")
    const allDays = eachDayOfInterval({ start: monthStart, end: now })
    const totalDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd }).length

    async function fetch() {
      const { data: rows, error } = await supabase
        .from("daily_revenue")
        .select("*")
        .gte("date", startStr)
        .lte("date", endStr)

      if (error) {
        console.error("useMonthlyRevenueShareStatus:", error.message)
        return
      }
      if (cancelled) return

      const records = (rows as SupaDailyRevenueRow[]).map(rowToRevenue)
      const totalRevenue = records.reduce((s, r) => s + r.totalSales, 0)
      const revenueShare20 = totalRevenue * 0.2
      const minimumGuarantee = 18000
      const breakEvenRevenue = 90000

      setStatus({
        monthToDateRevenue: totalRevenue,
        revenueShare20Pct: revenueShare20,
        minimumGuarantee,
        currentRent: Math.max(revenueShare20, minimumGuarantee),
        rentType: revenueShare20 >= minimumGuarantee ? "Revenue Share" : "Minimum Guarantee",
        breakEvenRevenue,
        progressPercent: Math.min(100, (totalRevenue / breakEvenRevenue) * 100),
        daysElapsed: allDays.length,
        daysInMonth: totalDaysInMonth,
      })
    }

    fetch()

    const channel = supabase
      .channel("monthly-revenue-share-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_revenue" },
        (payload) => {
          if (cancelled) return
          const row = payload.new as SupaDailyRevenueRow | undefined
          if (!row) return
          if (row.date >= startStr && row.date <= endStr) {
            fetch()
          }
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [today])

  return status
}

// ============================================================
// useExpenses — optionally filtered by "yyyy-MM" month string
// ============================================================

export function useExpenses(month?: string) {
  const [expenses, setExpenses] = useState<Expense[] | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    async function fetch() {
      let query = supabase.from("expenses").select("*").order("date", { ascending: false })

      if (month) {
        const [y, m] = month.split("-").map(Number)
        const start = format(new Date(y, m - 1, 1), "yyyy-MM-dd")
        const end = format(endOfMonth(new Date(y, m - 1, 1)), "yyyy-MM-dd")
        query = query.gte("date", start).lte("date", end)
      }

      const { data: rows, error } = await query

      if (error) {
        console.error("useExpenses:", error.message)
        return
      }
      if (!cancelled) {
        setExpenses((rows as SupaExpenseRow[]).map(rowToExpense))
      }
    }

    fetch()

    const channel = supabase
      .channel(`expenses-finance-${month ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
          if (!cancelled) fetch()
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [month])

  return expenses
}
