import { supabase } from "@/lib/supabase/client"
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
  const startDate = format(days[0], "yyyy-MM-dd")
  const endDate = format(days[days.length - 1], "yyyy-MM-dd")

  const { data: dailyRecords, error: revError } = await supabase
    .from("daily_revenue")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)

  if (revError) throw new Error(`Failed to fetch daily revenue: ${revError.message}`)

  const totalMonthlyRevenue = (dailyRecords ?? []).reduce(
    (sum, record) => sum + record.total_sales,
    0
  )

  const { data: minGuaranteeSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "minimumGuaranteeRent")
    .single()

  const { data: revenueShareSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "revenueSharePercent")
    .single()

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
