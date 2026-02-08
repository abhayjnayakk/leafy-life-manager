"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Alert, AlertType, AlertSeverity } from "@/lib/db/schema"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface SupabaseAlertRow {
  id: string
  type: string
  severity: string
  title: string
  description: string | null
  related_entity_id: string | null
  related_entity_type: string | null
  is_read: boolean
  resolved_at: string | null
  created_at: string
}

function rowToAlert(row: SupabaseAlertRow): Alert {
  return {
    id: row.id,
    type: row.type as AlertType,
    severity: row.severity as AlertSeverity,
    title: row.title,
    description: row.description ?? "",
    relatedEntityId: row.related_entity_id ?? undefined,
    relatedEntityType: row.related_entity_type ?? undefined,
    isRead: row.is_read,
    resolvedAt: row.resolved_at ?? undefined,
    createdAt: row.created_at,
  }
}

export function useSupaAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchAlerts = useCallback(async () => {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch alerts:", error.message)
      setLoading(false)
      return
    }
    if (mountedRef.current) {
      setAlerts((data as SupabaseAlertRow[]).map(rowToAlert))
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchAlerts()

    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        (payload: RealtimePostgresChangesPayload<SupabaseAlertRow>) => {
          if (!mountedRef.current) return

          if (payload.eventType === "INSERT") {
            const alert = rowToAlert(payload.new as SupabaseAlertRow)
            setAlerts((prev) => [alert, ...prev])
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToAlert(payload.new as SupabaseAlertRow)
            setAlerts((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a))
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id
            setAlerts((prev) => prev.filter((a) => a.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchAlerts])

  const markRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("id", id)
    if (error) throw new Error(error.message)
  }, [])

  const resolveAlert = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ resolved_at: new Date().toISOString(), is_read: true })
      .eq("id", id)
    if (error) throw new Error(error.message)
  }, [])

  const deleteAlert = useCallback(async (id: string) => {
    const { error } = await supabase.from("alerts").delete().eq("id", id)
    if (error) throw new Error(error.message)
  }, [])

  return {
    alerts,
    loading,
    refetch: fetchAlerts,
    markRead,
    resolveAlert,
    deleteAlert,
  }
}
