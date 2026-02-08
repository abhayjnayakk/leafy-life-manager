"use client"

import { useEffect, useState, type ReactNode } from "react"
import { seedDatabase, migrateIngredientDefaults } from "@/lib/db/seed"
import { runAlertEngine } from "@/lib/services/alertEngine"

export function DexieProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    seedDatabase()
      .then(() => migrateIngredientDefaults())
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
