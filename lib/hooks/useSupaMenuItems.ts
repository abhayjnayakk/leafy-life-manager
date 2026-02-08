"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase/client"
import type { MenuItem, MenuCategory, MenuItemSize } from "@/lib/db/schema"
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js"

interface SupabaseMenuItemRow {
  id: string
  name: string
  category: string
  description: string | null
  sizes: MenuItemSize[]
  is_customizable: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

function rowToMenuItem(row: SupabaseMenuItemRow): MenuItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category as MenuCategory,
    description: row.description ?? undefined,
    sizes: row.sizes,
    isCustomizable: row.is_customizable,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function useSupaMenuItems() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const fetchMenuItems = useCallback(async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("category", { ascending: true })

    if (error) {
      console.error("Failed to fetch menu items:", error.message)
      setLoading(false)
      return
    }
    if (mountedRef.current) {
      setMenuItems((data as SupabaseMenuItemRow[]).map(rowToMenuItem))
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchMenuItems()

    const channel = supabase
      .channel("menu-items-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_items" },
        (payload: RealtimePostgresChangesPayload<SupabaseMenuItemRow>) => {
          if (!mountedRef.current) return

          if (payload.eventType === "INSERT") {
            const item = rowToMenuItem(payload.new as SupabaseMenuItemRow)
            setMenuItems((prev) => {
              if (prev.some((m) => m.id === item.id)) return prev
              return [...prev, item]
            })
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToMenuItem(payload.new as SupabaseMenuItemRow)
            setMenuItems((prev) =>
              prev.map((m) => (m.id === updated.id ? updated : m))
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id
            setMenuItems((prev) => prev.filter((m) => m.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      supabase.removeChannel(channel)
    }
  }, [fetchMenuItems])

  const addMenuItem = useCallback(
    async (item: Omit<MenuItem, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString()
      const { error } = await supabase.from("menu_items").insert({
        name: item.name,
        category: item.category,
        description: item.description ?? null,
        sizes: item.sizes,
        is_customizable: item.isCustomizable,
        is_active: item.isActive,
        created_at: now,
        updated_at: now,
      })
      if (error) throw new Error(error.message)
    },
    []
  )

  const updateMenuItem = useCallback(
    async (id: string, updates: Partial<MenuItem>) => {
      const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (updates.name !== undefined) mapped.name = updates.name
      if (updates.category !== undefined) mapped.category = updates.category
      if (updates.description !== undefined) mapped.description = updates.description
      if (updates.sizes !== undefined) mapped.sizes = updates.sizes
      if (updates.isCustomizable !== undefined) mapped.is_customizable = updates.isCustomizable
      if (updates.isActive !== undefined) mapped.is_active = updates.isActive

      const { error } = await supabase.from("menu_items").update(mapped).eq("id", id)
      if (error) throw new Error(error.message)
    },
    []
  )

  const deleteMenuItem = useCallback(async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id)
    if (error) throw new Error(error.message)
  }, [])

  return {
    menuItems,
    loading,
    refetch: fetchMenuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
  }
}
