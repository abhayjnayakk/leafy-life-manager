import { supabase } from "@/lib/supabase/client"
import type { Recipe, RecipeIngredient } from "@/lib/db/schema"

export async function addRecipe(
  data: Omit<Recipe, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = new Date().toISOString()
  const { data: result, error } = await supabase
    .from("recipes")
    .insert({
      menu_item_id: String(data.menuItemId),
      name: data.name,
      size_variant: data.sizeVariant ?? null,
      preparation_instructions: data.preparationInstructions ?? null,
      prep_time_minutes: data.prepTimeMinutes ?? null,
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)
  return result.id
}

export async function updateRecipe(
  id: string,
  data: Partial<Omit<Recipe, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) mapped.name = data.name
  if (data.menuItemId !== undefined) mapped.menu_item_id = String(data.menuItemId)
  if (data.sizeVariant !== undefined) mapped.size_variant = data.sizeVariant
  if (data.preparationInstructions !== undefined) mapped.preparation_instructions = data.preparationInstructions
  if (data.prepTimeMinutes !== undefined) mapped.prep_time_minutes = data.prepTimeMinutes

  const { error } = await supabase.from("recipes").update(mapped).eq("id", id)
  if (error) throw new Error(error.message)
}

export async function deleteRecipe(id: string): Promise<void> {
  // Delete recipe ingredients first, then the recipe
  const { error: riError } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", id)
  if (riError) throw new Error(riError.message)

  const { error } = await supabase.from("recipes").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function addRecipeIngredient(
  data: Omit<RecipeIngredient, "id" | "createdAt">
): Promise<string> {
  const now = new Date().toISOString()
  const { data: result, error } = await supabase
    .from("recipe_ingredients")
    .insert({
      recipe_id: String(data.recipeId),
      ingredient_id: String(data.ingredientId),
      quantity: data.quantity,
      unit: data.unit,
      is_optional: data.isOptional,
      notes: data.notes ?? null,
      created_at: now,
    })
    .select("id")
    .single()

  if (error) throw new Error(error.message)
  return result.id
}

export async function removeRecipeIngredient(id: string): Promise<void> {
  const { error } = await supabase.from("recipe_ingredients").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function updateRecipeIngredient(
  id: string,
  data: Partial<Omit<RecipeIngredient, "id" | "createdAt">>
): Promise<void> {
  const mapped: Record<string, unknown> = {}
  if (data.recipeId !== undefined) mapped.recipe_id = String(data.recipeId)
  if (data.ingredientId !== undefined) mapped.ingredient_id = String(data.ingredientId)
  if (data.quantity !== undefined) mapped.quantity = data.quantity
  if (data.unit !== undefined) mapped.unit = data.unit
  if (data.isOptional !== undefined) mapped.is_optional = data.isOptional
  if (data.notes !== undefined) mapped.notes = data.notes

  const { error } = await supabase.from("recipe_ingredients").update(mapped).eq("id", id)
  if (error) throw new Error(error.message)
}
