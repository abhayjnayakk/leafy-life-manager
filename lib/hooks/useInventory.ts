"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/client"
import type { IngredientCategory } from "@/lib/db/schema"

export function useIngredients(category?: IngredientCategory) {
  return useLiveQuery(
    () =>
      category
        ? db.ingredients.where("category").equals(category).sortBy("name")
        : db.ingredients.orderBy("name").toArray(),
    [category]
  )
}

export function useLowStockIngredients() {
  return useLiveQuery(() =>
    db.ingredients
      .filter((ing) => ing.currentStock <= ing.minimumThreshold)
      .toArray()
  )
}

export function useIngredient(id: number) {
  return useLiveQuery(() => db.ingredients.get(id), [id])
}

export function useIngredientCount() {
  return useLiveQuery(() => db.ingredients.count())
}

export function useIngredientSearch(query: string) {
  return useLiveQuery(
    () =>
      query.trim()
        ? db.ingredients
            .filter((ing) =>
              ing.name.toLowerCase().includes(query.toLowerCase())
            )
            .toArray()
        : db.ingredients.orderBy("name").toArray(),
    [query]
  )
}
