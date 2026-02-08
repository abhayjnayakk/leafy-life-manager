"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Expense, ExpenseCategory } from "@/lib/db/schema"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface SupabaseExpenseRow {
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

function rowToExpense(row: SupabaseExpenseRow): Expense {
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

export function useSupaExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchExpenses = useCallback(async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false })

    if (error) {
      console.error("Failed to fetch expenses:", error.message)
      setLoading(false)
      return
    }
    if (mountedRef.current) {
      setExpenses((data as SupabaseExpenseRow[]).map(rowToExpense))
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchExpenses()

    const channel = supabase
      .channel("expenses-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        (payload: RealtimePostgresChangesPayload<SupabaseExpenseRow>) => {
          if (!mountedRef.current) return

          if (payload.eventType === "INSERT") {
            const exp = rowToExpense(payload.new as SupabaseExpenseRow)
            setExpenses((prev) => {
              if (prev.some((e) => e.id === exp.id)) return prev
              return [exp, ...prev]
            })
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToExpense(payload.new as SupabaseExpenseRow)
            setExpenses((prev) =>
              prev.map((e) => (e.id === updated.id ? updated : e))
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id
            setExpenses((prev) => prev.filter((e) => e.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchExpenses])

  const addExpense = useCallback(
    async (exp: Omit<Expense, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString()
      const { error } = await supabase.from("expenses").insert({
        date: exp.date,
        category: exp.category,
        description: exp.description,
        amount: exp.amount,
        is_recurring: exp.isRecurring,
        recurring_day: exp.recurringDay ?? null,
        receipt_note: exp.receiptNote ?? null,
        created_at: now,
        updated_at: now,
      })
      if (error) throw new Error(error.message)
    },
    []
  )

  const updateExpense = useCallback(
    async (id: string, updates: Partial<Expense>) => {
      const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (updates.date !== undefined) mapped.date = updates.date
      if (updates.category !== undefined) mapped.category = updates.category
      if (updates.description !== undefined) mapped.description = updates.description
      if (updates.amount !== undefined) mapped.amount = updates.amount
      if (updates.isRecurring !== undefined) mapped.is_recurring = updates.isRecurring
      if (updates.recurringDay !== undefined) mapped.recurring_day = updates.recurringDay
      if (updates.receiptNote !== undefined) mapped.receipt_note = updates.receiptNote

      const { error } = await supabase.from("expenses").update(mapped).eq("id", id)
      if (error) throw new Error(error.message)
    },
    []
  )

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id)
    if (error) throw new Error(error.message)
  }, [])

  return {
    expenses,
    loading,
    refetch: fetchExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
  }
}
