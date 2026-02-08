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

  // Deduct inventory for each non-customized item
  for (const item of items) {
    if (!item.customizations) {
      const { data: recipes } = await supabase
        .from("recipes")
        .select("*")
        .eq("menu_item_id", String(item.menuItemId))

      const recipe =
        recipes?.find((r: any) => r.size_variant === item.size) ?? recipes?.[0]

      if (recipe) {
        const { data: recipeIngs } = await supabase
          .from("recipe_ingredients")
          .select("*")
          .eq("recipe_id", recipe.id)

        for (const ri of recipeIngs ?? []) {
          const { data: ing } = await supabase
            .from("ingredients")
            .select("current_stock")
            .eq("id", ri.ingredient_id)
            .single()

          if (ing) {
            const newStock = Math.max(
              0,
              Number(ing.current_stock) - Number(ri.quantity) * item.quantity
            )
            await supabase
              .from("ingredients")
              .update({ current_stock: newStock, updated_at: now })
              .eq("id", ri.ingredient_id)
          }
        }
      }
    }
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
