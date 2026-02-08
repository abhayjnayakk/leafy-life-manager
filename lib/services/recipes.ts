import { db } from "@/lib/db/client"
import type { Recipe, RecipeIngredient } from "@/lib/db/schema"

export async function addRecipe(
  data: Omit<Recipe, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const now = new Date().toISOString()
  return db.recipes.add({ ...data, createdAt: now, updatedAt: now }) as Promise<number>
}

export async function updateRecipe(
  id: number,
  data: Partial<Omit<Recipe, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  await db.recipes.update(id, {
    ...data,
    updatedAt: new Date().toISOString(),
  })
}

export async function deleteRecipe(id: number): Promise<void> {
  await db.transaction("rw", [db.recipes, db.recipeIngredients], async () => {
    await db.recipeIngredients.where("recipeId").equals(id).delete()
    await db.recipes.delete(id)
  })
}

export async function addRecipeIngredient(
  data: Omit<RecipeIngredient, "id" | "createdAt">
): Promise<number> {
  const now = new Date().toISOString()
  return db.recipeIngredients.add({ ...data, createdAt: now }) as Promise<number>
}

export async function removeRecipeIngredient(id: number): Promise<void> {
  await db.recipeIngredients.delete(id)
}

export async function updateRecipeIngredient(
  id: number,
  data: Partial<Omit<RecipeIngredient, "id" | "createdAt">>
): Promise<void> {
  await db.recipeIngredients.update(id, data)
}
