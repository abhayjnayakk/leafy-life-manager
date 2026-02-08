import { db } from "@/lib/db/client"
import type { Ingredient } from "@/lib/db/schema"
import { format, addDays } from "date-fns"

function computeExpiryDate(shelfLifeDays?: number): string | undefined {
  if (!shelfLifeDays) return undefined
  return format(addDays(new Date(), shelfLifeDays), "yyyy-MM-dd")
}

export async function addIngredient(
  data: Omit<Ingredient, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const now = new Date().toISOString()
  const expiryDate = data.expiryDate ?? computeExpiryDate(data.shelfLifeDays)
  return db.ingredients.add({ ...data, expiryDate, createdAt: now, updatedAt: now }) as Promise<number>
}

export async function updateIngredient(
  id: number,
  data: Partial<Omit<Ingredient, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  await db.ingredients.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  })
}

export async function updateStock(id: number, newStock: number): Promise<void> {
  const ingredient = await db.ingredients.get(id)
  const now = new Date().toISOString()
  const expiryDate = ingredient?.shelfLifeDays
    ? computeExpiryDate(ingredient.shelfLifeDays)
    : ingredient?.expiryDate
  await db.ingredients.update(id, {
    currentStock: newStock,
    lastRestocked: now,
    expiryDate,
    updatedAt: now,
  })
}

export async function restockIngredient(
  id: number,
  addedQuantity: number
): Promise<void> {
  const ingredient = await db.ingredients.get(id)
  if (!ingredient) throw new Error("Ingredient not found")
  await updateStock(id, ingredient.currentStock + addedQuantity)
}

export async function deductStock(
  ingredientId: number,
  quantity: number
): Promise<void> {
  const ingredient = await db.ingredients.get(ingredientId)
  if (!ingredient) throw new Error("Ingredient not found")
  const newStock = Math.max(0, ingredient.currentStock - quantity)
  await db.ingredients.update(ingredientId, {
    currentStock: newStock,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteIngredient(id: number): Promise<void> {
  await db.ingredients.delete(id)
}
