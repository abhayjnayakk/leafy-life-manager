"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Order, OrderItem, OrderType, PaymentMethod } from "@/lib/db/schema"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface SupabaseOrderRow {
  id: string
  order_number: string
  order_type: string
  date: string
  items: OrderItem[]
  subtotal: number
  discount: number
  total_amount: number
  payment_method: string
  notes: string | null
  customer_name: string | null
  customer_phone: string | null
  created_by: string | null
  created_at: string
}

function rowToOrder(row: SupabaseOrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    orderType: row.order_type as OrderType,
    date: row.date,
    items: row.items,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    totalAmount: Number(row.total_amount),
    paymentMethod: row.payment_method as PaymentMethod,
    notes: row.notes ?? undefined,
    customerName: row.customer_name ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
  }
}

export function useSupaOrders(dateFilter?: string) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchOrders = useCallback(async () => {
    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (dateFilter) {
      query = query.eq("date", dateFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error("Failed to fetch orders:", error.message)
      setLoading(false)
      return
    }
    if (mountedRef.current) {
      setOrders((data as SupabaseOrderRow[]).map(rowToOrder))
      setLoading(false)
    }
  }, [dateFilter])

  useEffect(() => {
    mountedRef.current = true
    fetchOrders()

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload: RealtimePostgresChangesPayload<SupabaseOrderRow>) => {
          if (!mountedRef.current) return

          if (payload.eventType === "INSERT") {
            const newOrder = rowToOrder(payload.new as SupabaseOrderRow)
            if (!dateFilter || newOrder.date === dateFilter) {
              setOrders((prev) => [newOrder, ...prev])
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToOrder(payload.new as SupabaseOrderRow)
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? updated : o))
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id
            setOrders((prev) => prev.filter((o) => o.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchOrders, dateFilter])

  return { orders, loading, refetch: fetchOrders }
}
