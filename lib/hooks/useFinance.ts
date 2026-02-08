"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/client"
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns"

export function useTodayRevenue() {
  const today = new Date().toISOString().split("T")[0]
  return useLiveQuery(
    () => db.dailyRevenue.where("date").equals(today).first(),
    [today]
  )
}

export function useWeeklyRevenue() {
  const today = new Date().toISOString().split("T")[0]
  return useLiveQuery(async () => {
    const days = Array.from({ length: 7 }, (_, i) =>
      format(subDays(new Date(), 6 - i), "yyyy-MM-dd")
    )
    const records = await db.dailyRevenue.where("date").anyOf(days).toArray()
    return days.map((date) => ({
      date,
      label: format(new Date(date + "T00:00:00"), "EEE"),
      revenue: records.find((r) => r.date === date)?.totalSales ?? 0,
      orders: records.find((r) => r.date === date)?.numberOfOrders ?? 0,
    }))
  }, [today])
}

export function useMonthlyRevenueShareStatus() {
  const today = new Date().toISOString().split("T")[0]
  return useLiveQuery(async () => {
    const now = new Date()
    const monthStart = startOfMonth(now)
    const days = eachDayOfInterval({ start: monthStart, end: now })
    const dateStrings = days.map((d) => format(d, "yyyy-MM-dd"))

    const records = await db.dailyRevenue
      .where("date")
      .anyOf(dateStrings)
      .toArray()

    const totalRevenue = records.reduce((s, r) => s + r.totalSales, 0)
    const revenueShare20 = totalRevenue * 0.2
    const minimumGuarantee = 18000
    const breakEvenRevenue = 90000

    return {
      monthToDateRevenue: totalRevenue,
      revenueShare20Pct: revenueShare20,
      minimumGuarantee,
      currentRent: Math.max(revenueShare20, minimumGuarantee),
      rentType:
        revenueShare20 >= minimumGuarantee
          ? ("Revenue Share" as const)
          : ("Minimum Guarantee" as const),
      breakEvenRevenue,
      progressPercent: Math.min(100, (totalRevenue / breakEvenRevenue) * 100),
      daysElapsed: days.length,
      daysInMonth: eachDayOfInterval({
        start: monthStart,
        end: endOfMonth(now),
      }).length,
    }
  }, [today])
}

export function useExpenses(month?: string) {
  return useLiveQuery(async () => {
    if (month) {
      const [y, m] = month.split("-").map(Number)
      const start = format(new Date(y, m - 1, 1), "yyyy-MM-dd")
      const end = format(endOfMonth(new Date(y, m - 1, 1)), "yyyy-MM-dd")
      return db.expenses
        .where("date")
        .between(start, end, true, true)
        .reverse()
        .toArray()
    }
    return db.expenses.reverse().toArray()
  }, [month])
}
