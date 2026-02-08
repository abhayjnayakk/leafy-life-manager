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
    if (localTasks.length === 0) {
      localStorage.setItem(MIGRATION_KEY, "true")
      return
    }

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
      // 42P01 = "relation does not exist" — table not created yet, retry next load
      if (error.code === "42P01") {
        console.warn("Tasks table does not exist yet. Will retry after table is created.")
        return
      }
      console.warn("Task migration to Supabase failed:", error.message)
      // Set flag anyway to prevent infinite retries for other errors
    } else {
      await db.tasks.clear()
    }
  } catch (err) {
    console.warn("Task migration error:", err)
  }

  localStorage.setItem(MIGRATION_KEY, "true")
}

export function DexieProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null)

  // Run seed + migration + alerts in the background — don't block rendering
  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        // Seed & migrate Dexie defaults (fast — just checks flags)
        await seedDatabase()
        await migrateIngredientDefaults()

        // Migrations run in parallel (each table is independent)
        await Promise.all([
          migrateLocalTasksToSupabase(),
          migrateAllDataToSupabase(),
        ])

        // Alert engine runs in background — don't wait
        runAlertEngine().catch(console.error)
      } catch (err: any) {
        console.error("Failed to initialize database:", err)
        if (mounted) setError(err?.message ?? "Unknown error")
      }
    }

    init()
    return () => { mounted = false }
  }, [])

  // Run alert engine every 30 minutes (was 15 — reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      runAlertEngine().catch(console.error)
    }, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

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

  // Render children immediately — no loading screen
  return <>{children}</>
}
