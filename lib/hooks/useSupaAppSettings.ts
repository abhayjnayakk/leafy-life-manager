"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { AppSettings } from "@/lib/db/schema"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface SupabaseSettingsRow {
  id: string
  key: string
  value: string
  updated_at: string
}

function rowToSetting(row: SupabaseSettingsRow): AppSettings {
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at,
  }
}

export function useSupaAppSettings() {
  const [settings, setSettings] = useState<AppSettings[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .order("key", { ascending: true })

    if (error) {
      console.error("Failed to fetch app settings:", error.message)
      setLoading(false)
      return
    }
    if (mountedRef.current) {
      setSettings((data as SupabaseSettingsRow[]).map(rowToSetting))
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchSettings()

    const channel = supabase
      .channel("app-settings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload: RealtimePostgresChangesPayload<SupabaseSettingsRow>) => {
          if (!mountedRef.current) return

          if (payload.eventType === "INSERT") {
            const s = rowToSetting(payload.new as SupabaseSettingsRow)
            setSettings((prev) => {
              if (prev.some((x) => x.id === s.id)) return prev
              return [...prev, s]
            })
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToSetting(payload.new as SupabaseSettingsRow)
            setSettings((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s))
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id
            setSettings((prev) => prev.filter((s) => s.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchSettings])

  // Get a setting by key
  const getSetting = useCallback(
    (key: string): string | undefined => {
      return settings.find((s) => s.key === key)?.value
    },
    [settings]
  )

  // Upsert a setting
  const setSetting = useCallback(async (key: string, value: string) => {
    const now = new Date().toISOString()
    // Try to find existing
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("key", key)
      .single()

    if (existing) {
      const { error } = await supabase
        .from("app_settings")
        .update({ value, updated_at: now })
        .eq("id", existing.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from("app_settings").insert({
        key,
        value,
        updated_at: now,
      })
      if (error) throw new Error(error.message)
    }
  }, [])

  return {
    settings,
    loading,
    refetch: fetchSettings,
    getSetting,
    setSetting,
  }
}
