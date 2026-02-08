"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/client"
import type { MenuCategory } from "@/lib/db/schema"

export function useMenuItems(category?: MenuCategory) {
  return useLiveQuery(
    () =>
      category
        ? db.menuItems.where("category").equals(category).toArray()
        : db.menuItems.toArray(),
    [category]
  )
}

export function useActiveMenuItems() {
  return useLiveQuery(() =>
    db.menuItems.filter((m) => m.isActive).toArray()
  )
}

export function useMenuItem(id: number) {
  return useLiveQuery(() => db.menuItems.get(id), [id])
}

export function useRecipesForMenuItem(menuItemId: number) {
  return useLiveQuery(
    () => db.recipes.where("menuItemId").equals(menuItemId).toArray(),
    [menuItemId]
  )
}

export function useRecipeIngredients(recipeId: number) {
  return useLiveQuery(
    async () => {
      const recipeIngs = await db.recipeIngredients
        .where("recipeId")
        .equals(recipeId)
        .toArray()
      const enriched = await Promise.all(
        recipeIngs.map(async (ri) => {
          const ingredient = await db.ingredients.get(ri.ingredientId)
          return { ...ri, ingredientName: ingredient?.name ?? "Unknown" }
        })
      )
      return enriched
    },
    [recipeId]
  )
}

export function useBowlTemplates() {
  return useLiveQuery(() => db.bowlTemplates.toArray())
}

export function useBowlComponents(templateId: number) {
  return useLiveQuery(
    () =>
      db.bowlComponents
        .where("bowlTemplateId")
        .equals(templateId)
        .sortBy("sortOrder"),
    [templateId]
  )
}
