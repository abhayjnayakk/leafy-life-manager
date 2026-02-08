import { db } from "@/lib/db/client"
import { startOfMonth, endOfMonth, format, eachDayOfInterval } from "date-fns"

export interface RevenueShareResult {
  month: string
  totalMonthlyRevenue: number
  revenueShareAmount: number
  minimumGuarantee: number
  effectiveRent: number
  rentType: "Revenue Share" | "Minimum Guarantee"
  revenueSharePercent: number
  breakEvenRevenue: number
}

export async function calculateRevenueShare(
  year: number,
  month: number
): Promise<RevenueShareResult> {
  const monthStart = startOfMonth(new Date(year, month))
  const monthEnd = endOfMonth(new Date(year, month))
  const monthStr = format(monthStart, "yyyy-MM")

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const dateStrings = days.map((d) => format(d, "yyyy-MM-dd"))

  const dailyRecords = await db.dailyRevenue
    .where("date")
    .anyOf(dateStrings)
    .toArray()

  const totalMonthlyRevenue = dailyRecords.reduce(
    (sum, record) => sum + record.totalSales,
    0
  )

  const minGuaranteeSetting = await db.appSettings
    .where("key")
    .equals("minimumGuaranteeRent")
    .first()
  const revenueShareSetting = await db.appSettings
    .where("key")
    .equals("revenueSharePercent")
    .first()

  const minimumGuarantee = minGuaranteeSetting
    ? JSON.parse(minGuaranteeSetting.value)
    : 18000
  const revenueSharePercent = revenueShareSetting
    ? JSON.parse(revenueShareSetting.value)
    : 20

  const revenueShareAmount = totalMonthlyRevenue * (revenueSharePercent / 100)
  const effectiveRent = Math.max(revenueShareAmount, minimumGuarantee)
  const rentType: "Revenue Share" | "Minimum Guarantee" =
    revenueShareAmount >= minimumGuarantee
      ? "Revenue Share"
      : "Minimum Guarantee"
  const breakEvenRevenue = minimumGuarantee / (revenueSharePercent / 100)

  return {
    month: monthStr,
    totalMonthlyRevenue,
    revenueShareAmount,
    minimumGuarantee,
    effectiveRent,
    rentType,
    revenueSharePercent,
    breakEvenRevenue,
  }
}
