"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { DailyRevenue } from "@/lib/db/schema"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

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

export function useSupaDailyRevenue() {
  const [revenue, setRevenue] = useState<DailyRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchRevenue = useCallback(async () => {
    const { data, error } = await supabase
      .from("daily_revenue")
      .select("*")
      .order("date", { ascending: false })

    if (error) {
      console.error("Failed to fetch daily revenue:", error.message)
      setLoading(false)
      return
    }
    if (mountedRef.current) {
      setRevenue((data as SupaDailyRevenueRow[]).map(rowToRevenue))
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchRevenue()

    const channel = supabase
      .channel("daily-revenue-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_revenue" },
        (payload: RealtimePostgresChangesPayload<SupaDailyRevenueRow>) => {
          if (!mountedRef.current) return

          if (payload.eventType === "INSERT") {
            const rev = rowToRevenue(payload.new as SupaDailyRevenueRow)
            setRevenue((prev) => [rev, ...prev])
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToRevenue(payload.new as SupaDailyRevenueRow)
            setRevenue((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id
            setRevenue((prev) => prev.filter((r) => r.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchRevenue])

  return { revenue, loading, refetch: fetchRevenue }
}
