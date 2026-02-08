"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/client"

export function useTodayOrders() {
  const today = new Date().toISOString().split("T")[0]
  return useLiveQuery(
    () => db.orders.where("date").equals(today).reverse().toArray(),
    [today]
  )
}

export function useOrdersByDate(date: string) {
  return useLiveQuery(
    () => db.orders.where("date").equals(date).reverse().toArray(),
    [date]
  )
}

export function useOrderCount(date?: string) {
  const d = date ?? new Date().toISOString().split("T")[0]
  return useLiveQuery(
    () => db.orders.where("date").equals(d).count(),
    [d]
  )
}
