import { db } from "@/lib/db/client"
import type { Order, OrderItem, OrderType, PaymentMethod } from "@/lib/db/schema"
import { format } from "date-fns"

export async function generateOrderNumber(): Promise<string> {
  const today = format(new Date(), "yyyyMMdd")
  const todayStr = new Date().toISOString().split("T")[0]
  const todayOrders = await db.orders.where("date").equals(todayStr).count()
  const seq = String(todayOrders + 1).padStart(3, "0")
  return `LL-${today}-${seq}`
}

export async function createOrder(
  items: OrderItem[],
  paymentMethod: PaymentMethod,
  orderType: OrderType = "DineIn",
  discount: number = 0,
  notes?: string
): Promise<number> {
  const now = new Date().toISOString()
  const date = now.split("T")[0]
  const orderNumber = await generateOrderNumber()
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const totalAmount = Math.max(0, subtotal - discount)

  const orderId = await db.transaction(
    "rw",
    [db.orders, db.ingredients, db.recipes, db.recipeIngredients, db.dailyRevenue],
    async () => {
      const id = await db.orders.add({
        orderNumber,
        orderType,
        date,
        items,
        subtotal,
        discount,
        totalAmount,
        paymentMethod,
        notes,
        createdAt: now,
      })

      // Deduct inventory for each order item
      for (const item of items) {
        if (!item.customizations) {
          const recipes = await db.recipes
            .where("menuItemId")
            .equals(item.menuItemId)
            .toArray()
          const recipe =
            recipes.find((r) => r.sizeVariant === item.size) || recipes[0]
          if (recipe) {
            const recipeIngs = await db.recipeIngredients
              .where("recipeId")
              .equals(recipe.id!)
              .toArray()
            for (const ri of recipeIngs) {
              const ingredient = await db.ingredients.get(ri.ingredientId)
              if (ingredient) {
                const newStock = Math.max(
                  0,
                  ingredient.currentStock - ri.quantity * item.quantity
                )
                await db.ingredients.update(ri.ingredientId, {
                  currentStock: newStock,
                  updatedAt: now,
                })
              }
            }
          }
        }
      }

      // Update daily revenue
      await updateDailyRevenue(date, totalAmount, paymentMethod, now)

      return id
    }
  )

  return orderId as number
}

async function updateDailyRevenue(
  date: string,
  amount: number,
  paymentMethod: string,
  now: string
): Promise<void> {
  const existing = await db.dailyRevenue.where("date").equals(date).first()
  const key = paymentMethod.toLowerCase() as "cash" | "upi" | "card"

  if (existing) {
    const breakdown = { ...existing.paymentBreakdown }
    breakdown[key] += amount
    const newTotal = existing.totalSales + amount
    const newCount = existing.numberOfOrders + 1
    await db.dailyRevenue.update(existing.id!, {
      totalSales: newTotal,
      numberOfOrders: newCount,
      paymentBreakdown: breakdown,
      averageOrderValue: newTotal / newCount,
      updatedAt: now,
    })
  } else {
    const breakdown = { cash: 0, upi: 0, card: 0 }
    breakdown[key] = amount
    await db.dailyRevenue.add({
      date,
      totalSales: amount,
      numberOfOrders: 1,
      paymentBreakdown: breakdown,
      averageOrderValue: amount,
      createdAt: now,
      updatedAt: now,
    })
  }
}
