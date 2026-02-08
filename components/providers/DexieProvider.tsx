"use client"

import { useEffect, useState, type ReactNode } from "react"
import { seedDatabase, migrateIngredientDefaults } from "@/lib/db/seed"
import { runAlertEngine } from "@/lib/services/alertEngine"
import { db } from "@/lib/db/client"
import { supabase } from "@/lib/supabase/client"
import { migrateAllDataToSupabase } from "@/lib/supabase/migrate"

// One-time migrate local Dexie tasks → Supabase
async function migrateLocalTasksToSupabase() {
  const MIGRATION_KEY = "tasks_migrated_to_supabase"
  if (typeof window === "undefined") return
  if (localStorage.getItem(MIGRATION_KEY)) return

  try {
    const localTasks = await db.tasks.toArray()
    if (localTasks.length > 0) {
      const rows = localTasks.map((t) => ({
        title: t.title,
        description: t.description ?? null,
        due_date: t.dueDate ?? null,
        priority: t.priority,
        status: t.status,
        assigned_to: t.assignedTo,
        completed_at: t.completedAt ?? null,
        created_by: t.createdBy,
      }))
      const { error } = await supabase.from("tasks").insert(rows)
      if (error) {
        console.warn("Task migration to Supabase failed:", error.message)
        return // don't mark as migrated, will retry next load
      }
      // Clear local tasks
      await db.tasks.clear()
    }
  } catch (err) {
    console.warn("Task migration error:", err)
    return
  }

  localStorage.setItem(MIGRATION_KEY, "true")
}

export function DexieProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    seedDatabase()
      .then(() => migrateIngredientDefaults())
      .then(() => migrateLocalTasksToSupabase())
      .then(() => migrateAllDataToSupabase())
      .then(() => runAlertEngine())
      .then(() => setReady(true))
      .catch((err) => {
        console.error("Failed to initialize database:", err)
        setError(err?.message ?? "Unknown error")
      })
  }, [])

  // Run alert engine every 15 minutes
  useEffect(() => {
    if (!ready) return
    const interval = setInterval(() => {
      runAlertEngine().catch(console.error)
    }, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [ready])

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          background: "#f5f0e8",
        }}
      >
        <div style={{ maxWidth: "24rem", textAlign: "center" }}>
          <div style={{ fontSize: "1.125rem", fontWeight: "bold", color: "#c00", marginBottom: "0.75rem" }}>
            Database Error
          </div>
          <p style={{ fontSize: "0.8125rem", color: "#555", marginBottom: "1rem" }}>
            {error}
          </p>
          <button
            onClick={() => {
              if (typeof indexedDB !== "undefined") {
                indexedDB.deleteDatabase("LeafyLifeManager")
              }
              window.location.reload()
            }}
            style={{
              padding: "0.5rem 1.5rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              color: "#fff",
              background: "#5B8C5A",
              border: "none",
              cursor: "pointer",
            }}
          >
            Reset & Reload
          </button>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="text-lg font-semibold tracking-tight">Leafy Life</div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
