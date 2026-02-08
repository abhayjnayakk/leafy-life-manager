"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { AlertRule, AlertType, AlertRuleCondition } from "@/lib/db/schema"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface SupabaseAlertRuleRow {
  id: string
  name: string
  type: string
  condition: string
  parameters: Record<string, number | string>
  is_active: boolean
  last_triggered: string | null
  created_at: string
  updated_at: string
}

function rowToAlertRule(row: SupabaseAlertRuleRow): AlertRule {
  return {
    id: row.id,
    name: row.name,
    type: row.type as AlertType,
    condition: row.condition as AlertRuleCondition,
    parameters: row.parameters,
    isActive: row.is_active,
    lastTriggered: row.last_triggered ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function useSupaAlertRules() {
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchAlertRules = useCallback(async () => {
    const { data, error } = await supabase
      .from("alert_rules")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch alert rules:", error.message)
      setLoading(false)
      return
    }
    if (mountedRef.current) {
      setAlertRules((data as SupabaseAlertRuleRow[]).map(rowToAlertRule))
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchAlertRules()

    const channel = supabase
      .channel("alert-rules-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alert_rules" },
        (payload: RealtimePostgresChangesPayload<SupabaseAlertRuleRow>) => {
          if (!mountedRef.current) return

          if (payload.eventType === "INSERT") {
            const rule = rowToAlertRule(payload.new as SupabaseAlertRuleRow)
            setAlertRules((prev) => {
              if (prev.some((r) => r.id === rule.id)) return prev
              return [rule, ...prev]
            })
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToAlertRule(payload.new as SupabaseAlertRuleRow)
            setAlertRules((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id
            setAlertRules((prev) => prev.filter((r) => r.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchAlertRules])

  const addAlertRule = useCallback(
    async (rule: Omit<AlertRule, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString()
      const { error } = await supabase.from("alert_rules").insert({
        name: rule.name,
        type: rule.type,
        condition: rule.condition,
        parameters: rule.parameters,
        is_active: rule.isActive,
        last_triggered: rule.lastTriggered ?? null,
        created_at: now,
        updated_at: now,
      })
      if (error) throw new Error(error.message)
    },
    []
  )

  const updateAlertRule = useCallback(
    async (id: string, updates: Partial<AlertRule>) => {
      const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (updates.name !== undefined) mapped.name = updates.name
      if (updates.type !== undefined) mapped.type = updates.type
      if (updates.condition !== undefined) mapped.condition = updates.condition
      if (updates.parameters !== undefined) mapped.parameters = updates.parameters
      if (updates.isActive !== undefined) mapped.is_active = updates.isActive
      if (updates.lastTriggered !== undefined) mapped.last_triggered = updates.lastTriggered

      const { error } = await supabase.from("alert_rules").update(mapped).eq("id", id)
      if (error) throw new Error(error.message)
    },
    []
  )

  const deleteAlertRule = useCallback(async (id: string) => {
    const { error } = await supabase.from("alert_rules").delete().eq("id", id)
    if (error) throw new Error(error.message)
  }, [])

  return {
    alertRules,
    loading,
    refetch: fetchAlertRules,
    addAlertRule,
    updateAlertRule,
    deleteAlertRule,
  }
}
