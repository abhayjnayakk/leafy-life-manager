import { supabase } from "@/lib/supabase/client"
import type { Ingredient } from "@/lib/db/schema"
import { format, addDays } from "date-fns"

// ============================================================
// Helpers
// ============================================================

function computeExpiryDate(shelfLifeDays?: number): string | undefined {
  if (!shelfLifeDays) return undefined
  return format(addDays(new Date(), shelfLifeDays), "yyyy-MM-dd")
}

/** Map camelCase app fields to snake_case Supabase columns. */
function ingredientToRow(
  data: Partial<Omit<Ingredient, "id" | "createdAt" | "updatedAt">>
): Record<string, unknown> {
  const row: Record<string, unknown> = {}

  if (data.name !== undefined) row.name = data.name
  if (data.category !== undefined) row.category = data.category
  if (data.unit !== undefined) row.unit = data.unit
  if (data.currentStock !== undefined) row.current_stock = data.currentStock
  if (data.minimumThreshold !== undefined) row.minimum_threshold = data.minimumThreshold
  if (data.costPerUnit !== undefined) row.cost_per_unit = data.costPerUnit
  if (data.lastRestocked !== undefined) row.last_restocked = data.lastRestocked ?? null
  if (data.expiryDate !== undefined) row.expiry_date = data.expiryDate ?? null
  if (data.storageType !== undefined) row.storage_type = data.storageType ?? null
  if (data.shelfLifeDays !== undefined) row.shelf_life_days = data.shelfLifeDays ?? null
  if (data.supplier !== undefined) row.supplier = data.supplier ?? null
  if (data.notes !== undefined) row.notes = data.notes ?? null

  return row
}

// ============================================================
// CRUD operations — Supabase as source of truth
// ============================================================

export async function addIngredient(
  data: Omit<Ingredient, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const expiryDate = data.expiryDate ?? computeExpiryDate(data.shelfLifeDays)
  const row = ingredientToRow({ ...data, expiryDate })

  const { data: inserted, error } = await supabase
    .from("ingredients")
    .insert(row)
    .select("id")
    .single()

  if (error) throw new Error(`Failed to add ingredient: ${error.message}`)
  return inserted.id as string
}

export async function updateIngredient(
  id: string,
  data: Partial<Omit<Ingredient, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const row = ingredientToRow(data)
  row.updated_at = new Date().toISOString()

  const { error } = await supabase.from("ingredients").update(row).eq("id", id)
  if (error) throw new Error(`Failed to update ingredient: ${error.message}`)
}

export async function updateStock(id: string, newStock: number): Promise<void> {
  // Fetch the current ingredient to recalculate expiry if shelf_life_days is set
  const { data: ingredient, error: fetchError } = await supabase
    .from("ingredients")
    .select("shelf_life_days, expiry_date")
    .eq("id", id)
    .single()

  if (fetchError) throw new Error(`Failed to fetch ingredient: ${fetchError.message}`)

  const now = new Date().toISOString()
  const expiryDate = ingredient?.shelf_life_days
    ? computeExpiryDate(ingredient.shelf_life_days)
    : (ingredient?.expiry_date ?? null)

  const { error } = await supabase
    .from("ingredients")
    .update({
      current_stock: newStock,
      last_restocked: now,
      expiry_date: expiryDate,
      updated_at: now,
    })
    .eq("id", id)

  if (error) throw new Error(`Failed to update stock: ${error.message}`)
}

export async function restockIngredient(
  id: string,
  addedQuantity: number
): Promise<void> {
  const { data: ingredient, error: fetchError } = await supabase
    .from("ingredients")
    .select("current_stock")
    .eq("id", id)
    .single()

  if (fetchError || !ingredient) throw new Error("Ingredient not found")
  await updateStock(id, ingredient.current_stock + addedQuantity)
}

export async function deductStock(
  ingredientId: string,
  quantity: number
): Promise<void> {
  const { data: ingredient, error: fetchError } = await supabase
    .from("ingredients")
    .select("current_stock")
    .eq("id", ingredientId)
    .single()

  if (fetchError || !ingredient) throw new Error("Ingredient not found")

  const newStock = Math.max(0, ingredient.current_stock - quantity)

  const { error } = await supabase
    .from("ingredients")
    .update({
      current_stock: newStock,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ingredientId)

  if (error) throw new Error(`Failed to deduct stock: ${error.message}`)
}

export async function deleteIngredient(id: string): Promise<void> {
  const { error } = await supabase.from("ingredients").delete().eq("id", id)
  if (error) throw new Error(`Failed to delete ingredient: ${error.message}`)
}
