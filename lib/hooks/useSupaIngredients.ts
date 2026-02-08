"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type {
  Ingredient,
  IngredientCategory,
  IngredientUnit,
  StorageType,
} from "@/lib/db/schema"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface SupabaseIngredientRow {
  id: string
  name: string
  category: string
  unit: string
  current_stock: number
  minimum_threshold: number
  cost_per_unit: number
  last_restocked: string | null
  expiry_date: string | null
  storage_type: string | null
  shelf_life_days: number | null
  supplier: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function rowToIngredient(row: SupabaseIngredientRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    category: row.category as IngredientCategory,
    unit: row.unit as IngredientUnit,
    currentStock: Number(row.current_stock),
    minimumThreshold: Number(row.minimum_threshold),
    costPerUnit: Number(row.cost_per_unit),
    lastRestocked: row.last_restocked ?? undefined,
    expiryDate: row.expiry_date ?? undefined,
    storageType: (row.storage_type as StorageType) ?? undefined,
    shelfLifeDays: row.shelf_life_days ?? undefined,
    supplier: row.supplier ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function useSupaIngredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchIngredients = useCallback(async () => {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      console.error("Failed to fetch ingredients:", error.message)
      setLoading(false)
      return
    }
    if (mountedRef.current) {
      setIngredients((data as SupabaseIngredientRow[]).map(rowToIngredient))
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchIngredients()

    const channel = supabase
      .channel("ingredients-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ingredients" },
        (payload: RealtimePostgresChangesPayload<SupabaseIngredientRow>) => {
          if (!mountedRef.current) return

          if (payload.eventType === "INSERT") {
            const item = rowToIngredient(payload.new as SupabaseIngredientRow)
            setIngredients((prev) => {
              if (prev.some((i) => i.id === item.id)) return prev
              return [...prev, item].sort((a, b) => a.name.localeCompare(b.name))
            })
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToIngredient(payload.new as SupabaseIngredientRow)
            setIngredients((prev) =>
              prev.map((i) => (i.id === updated.id ? updated : i))
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id
            setIngredients((prev) => prev.filter((i) => i.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchIngredients])

  const addIngredient = useCallback(
    async (ing: Omit<Ingredient, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString()
      const { error } = await supabase.from("ingredients").insert({
        name: ing.name,
        category: ing.category,
        unit: ing.unit,
        current_stock: ing.currentStock,
        minimum_threshold: ing.minimumThreshold,
        cost_per_unit: ing.costPerUnit,
        last_restocked: ing.lastRestocked ?? null,
        expiry_date: ing.expiryDate ?? null,
        storage_type: ing.storageType ?? null,
        shelf_life_days: ing.shelfLifeDays ?? null,
        supplier: ing.supplier ?? null,
        notes: ing.notes ?? null,
        created_at: now,
        updated_at: now,
      })
      if (error) throw new Error(error.message)
    },
    []
  )

  const updateIngredient = useCallback(
    async (id: string, updates: Partial<Ingredient>) => {
      const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (updates.name !== undefined) mapped.name = updates.name
      if (updates.category !== undefined) mapped.category = updates.category
      if (updates.unit !== undefined) mapped.unit = updates.unit
      if (updates.currentStock !== undefined) mapped.current_stock = updates.currentStock
      if (updates.minimumThreshold !== undefined) mapped.minimum_threshold = updates.minimumThreshold
      if (updates.costPerUnit !== undefined) mapped.cost_per_unit = updates.costPerUnit
      if (updates.lastRestocked !== undefined) mapped.last_restocked = updates.lastRestocked
      if (updates.expiryDate !== undefined) mapped.expiry_date = updates.expiryDate
      if (updates.storageType !== undefined) mapped.storage_type = updates.storageType
      if (updates.shelfLifeDays !== undefined) mapped.shelf_life_days = updates.shelfLifeDays
      if (updates.supplier !== undefined) mapped.supplier = updates.supplier
      if (updates.notes !== undefined) mapped.notes = updates.notes

      const { error } = await supabase.from("ingredients").update(mapped).eq("id", id)
      if (error) throw new Error(error.message)
    },
    []
  )

  const deleteIngredient = useCallback(async (id: string) => {
    const { error } = await supabase.from("ingredients").delete().eq("id", id)
    if (error) throw new Error(error.message)
  }, [])

  return {
    ingredients,
    loading,
    refetch: fetchIngredients,
    addIngredient,
    updateIngredient,
    deleteIngredient,
  }
}
