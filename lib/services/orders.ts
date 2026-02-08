import { supabase } from "@/lib/supabase/client"
import type { OrderItem, OrderType, PaymentMethod } from "@/lib/db/schema"

export async function generateOrderNumber(dateStr?: string): Promise<string> {
  const targetDate = dateStr ?? new Date().toISOString().split("T")[0]
  const formatted = targetDate.replace(/-/g, "")

  // Count existing orders for the target date
  const { count, error } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("date", targetDate)

  if (error) console.error("Order count error:", error.message)
  const seq = String((count ?? 0) + 1).padStart(3, "0")
  return `LL-${formatted}-${seq}`
}

export async function createOrder(
  items: OrderItem[],
  paymentMethod: PaymentMethod,
  orderType: OrderType = "DineIn",
  discount: number = 0,
  notes?: string,
  orderDate?: string,
  customerName?: string,
  customerPhone?: string,
  createdBy?: string
): Promise<string> {
  const now = new Date().toISOString()
  const date = orderDate ?? now.split("T")[0]
  const orderNumber = await generateOrderNumber(date)
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const totalAmount = Math.max(0, subtotal - discount)

  // Insert order into Supabase
  const { data: inserted, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      order_type: orderType,
      date,
      items,
      subtotal,
      discount,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      notes: notes ?? null,
      customer_name: customerName ?? null,
      customer_phone: customerPhone ?? null,
      created_by: createdBy ?? null,
      created_at: now,
    })
    .select("id")
    .single()

  if (orderError) throw new Error(`Failed to create order: ${orderError.message}`)

  // Deduct inventory — collect all deductions first, then batch update
  try {
    const deductions = new Map<string, number>()
    const ingredientIdsForExclusion = new Set<string>()

    // Phase 1: Collect deductions from all items
    for (const item of items) {
      if (item.customizations) continue // Custom bowls have no ingredient mappings

      const { data: recipes } = await supabase
        .from("recipes")
        .select("id, size_variant")
        .eq("menu_item_id", String(item.menuItemId))

      const recipe =
        recipes?.find((r: any) => r.size_variant === item.size) ?? recipes?.[0]

      if (!recipe) {
        console.warn(`No recipe found for "${item.menuItemName}" (${item.size})`)
        continue
      }

      const { data: recipeIngs } = await supabase
        .from("recipe_ingredients")
        .select("ingredient_id, quantity")
        .eq("recipe_id", recipe.id)

      if (!recipeIngs?.length) continue

      // Track ingredient IDs that may need name lookup for exclusion filtering
      const hasExclusions = item.excludedIngredients && item.excludedIngredients.length > 0
      if (hasExclusions) {
        for (const ri of recipeIngs) ingredientIdsForExclusion.add(ri.ingredient_id)
      }

      // Store recipe ingredients per item for post-exclusion processing
      for (const ri of recipeIngs) {
        // We'll apply exclusion filtering after fetching names (if needed)
        if (!hasExclusions) {
          const deductQty = Number(ri.quantity) * item.quantity
          deductions.set(ri.ingredient_id, (deductions.get(ri.ingredient_id) ?? 0) + deductQty)
        }
      }

      // For items with exclusions, store temporarily and process after name lookup
      if (hasExclusions) {
        // Tag these recipe ingredients with the item for later processing
        ;(item as any)._recipeIngs = recipeIngs
      }
    }

    // Phase 2: If any items have excluded ingredients, fetch names and filter
    if (ingredientIdsForExclusion.size > 0) {
      const { data: ingNames } = await supabase
        .from("ingredients")
        .select("id, name")
        .in("id", [...ingredientIdsForExclusion])

      const nameMap = new Map<string, string>()
      for (const ing of ingNames ?? []) nameMap.set(ing.id, ing.name)

      for (const item of items) {
        const recipeIngs = (item as any)._recipeIngs as
          | { ingredient_id: string; quantity: number }[]
          | undefined
        if (!recipeIngs) continue

        for (const ri of recipeIngs) {
          const ingName = nameMap.get(ri.ingredient_id)
          if (ingName && item.excludedIngredients?.includes(ingName)) continue
          const deductQty = Number(ri.quantity) * item.quantity
          deductions.set(ri.ingredient_id, (deductions.get(ri.ingredient_id) ?? 0) + deductQty)
        }

        delete (item as any)._recipeIngs
      }
    }

    // Phase 3: Batch fetch current stocks and update
    if (deductions.size > 0) {
      const ids = [...deductions.keys()]
      const { data: ingredients } = await supabase
        .from("ingredients")
        .select("id, current_stock")
        .in("id", ids)

      for (const ing of ingredients ?? []) {
        const deductQty = deductions.get(ing.id) ?? 0
        const newStock = Math.max(0, Number(ing.current_stock) - deductQty)
        await supabase
          .from("ingredients")
          .update({ current_stock: newStock, updated_at: now })
          .eq("id", ing.id)
      }
    }
  } catch (err) {
    // Stock deduction failure should not block the order
    console.error("Inventory deduction error (order still placed):", err)
  }

  // Update daily revenue
  await updateDailyRevenue(date, totalAmount, paymentMethod, now)

  return inserted.id as string
}

async function updateDailyRevenue(
  date: string,
  amount: number,
  paymentMethod: string,
  now: string
): Promise<void> {
  const key = paymentMethod.toLowerCase() as "cash" | "upi" | "card"

  const { data: existing } = await supabase
    .from("daily_revenue")
    .select("*")
    .eq("date", date)
    .single()

  if (existing) {
    const breakdown = { ...(existing.payment_breakdown as Record<string, number>) }
    breakdown[key] = (breakdown[key] ?? 0) + amount
    const newTotal = Number(existing.total_sales) + amount
    const newCount = Number(existing.number_of_orders) + 1
    await supabase
      .from("daily_revenue")
      .update({
        total_sales: newTotal,
        number_of_orders: newCount,
        payment_breakdown: breakdown,
        average_order_value: newTotal / newCount,
        updated_at: now,
      })
      .eq("id", existing.id)
  } else {
    const breakdown = { cash: 0, upi: 0, card: 0 }
    breakdown[key] = amount
    await supabase.from("daily_revenue").insert({
      date,
      total_sales: amount,
      number_of_orders: 1,
      payment_breakdown: breakdown,
      average_order_value: amount,
      created_at: now,
      updated_at: now,
    })
  }
}
