"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

export interface LoginRecord {
  id: string
  userId: string
  userName: string
  role: string
  loginAt: string
  logoutAt?: string
}

interface SupabaseLoginRow {
  id: string
  user_id: string
  user_name: string
  role: string
  login_at: string
  logout_at: string | null
}

function rowToLogin(row: SupabaseLoginRow): LoginRecord {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    role: row.role,
    loginAt: row.login_at,
    logoutAt: row.logout_at ?? undefined,
  }
}

export function useLoginHistory(limit = 50) {
  const [history, setHistory] = useState<LoginRecord[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from("login_history")
      .select("*")
      .order("login_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Failed to fetch login history:", error.message)
      setLoading(false)
      return
    }
    if (mountedRef.current) {
      setHistory((data as SupabaseLoginRow[]).map(rowToLogin))
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    mountedRef.current = true
    fetchHistory()

    const channel = supabase
      .channel("login-history-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "login_history" },
        (payload: RealtimePostgresChangesPayload<SupabaseLoginRow>) => {
          if (!mountedRef.current) return

          if (payload.eventType === "INSERT") {
            const rec = rowToLogin(payload.new as SupabaseLoginRow)
            setHistory((prev) => {
              if (prev.some((r) => r.id === rec.id)) return prev
              return [rec, ...prev].slice(0, limit)
            })
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToLogin(payload.new as SupabaseLoginRow)
            setHistory((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            )
          }
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchHistory, limit])

  return { history, loading }
}
