"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { Task, TaskPriority, TaskStatus, TaskAssignee } from "@/lib/db/schema"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

// ============================================================
// Supabase row ↔ Task mapping
// ============================================================

interface SupabaseTaskRow {
  id: string
  title: string
  description: string | null
  due_date: string | null
  priority: string
  status: string
  assigned_to: string
  completed_at: string | null
  completed_by: string | null
  created_by: string
  created_at: string
  updated_at: string
}

function rowToTask(row: SupabaseTaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    dueDate: row.due_date ?? undefined,
    priority: row.priority as TaskPriority,
    status: row.status as TaskStatus,
    assignedTo: row.assigned_to as TaskAssignee,
    completedAt: row.completed_at ?? undefined,
    completedBy: row.completed_by ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================
// useTasks hook — real-time synced task list
// ============================================================

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  // Initial fetch
  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch tasks:", error.message)
      setLoading(false)
      return
    }

    if (mountedRef.current) {
      setTasks((data as SupabaseTaskRow[]).map(rowToTask))
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchTasks()

    // Subscribe to realtime changes
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload: RealtimePostgresChangesPayload<SupabaseTaskRow>) => {
          if (!mountedRef.current) return

          if (payload.eventType === "INSERT") {
            const newTask = rowToTask(payload.new as SupabaseTaskRow)
            setTasks((prev) => {
              if (prev.some((t) => t.id === newTask.id)) return prev
              return [newTask, ...prev]
            })
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToTask(payload.new as SupabaseTaskRow)
            setTasks((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id
            setTasks((prev) => prev.filter((t) => t.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchTasks])

  return { tasks, loading }
}
