import { db } from "@/lib/db/client"
import { supabase } from "@/lib/supabase/client"

const MIGRATION_KEY = "all_data_migrated_to_supabase"
const TABLE_FLAG = "supa_migrated_"

function isTableMigrated(table: string): boolean {
  return localStorage.getItem(TABLE_FLAG + table) === "true"
}

function markTableMigrated(table: string): void {
  localStorage.setItem(TABLE_FLAG + table, "true")
}

async function supabaseHasData(table: string): Promise<boolean> {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
  return (count ?? 0) > 0
}

/**
 * Migrate a single table from Dexie → Supabase.
 * Skips if already migrated or Supabase already has data.
 */
async function migrateTable(
  table: string,
  getLocal: () => Promise<any[]>,
  mapRows: (items: any[], now: string) => any[]
): Promise<void> {
  if (isTableMigrated(table)) return
  try {
    const localData = await getLocal()
    if (localData.length > 0 && !(await supabaseHasData(table))) {
      const now = new Date().toISOString()
      const { error } = await supabase.from(table).insert(mapRows(localData, now))
      if (error) console.warn(`${table} migration failed:`, error.message)
    }
    markTableMigrated(table)
  } catch (err) {
    console.warn(`${table} migration error:`, err)
  }
}

/**
 * One-time migration of ALL Dexie tables → Supabase.
 * All tables migrate in parallel for speed.
 */
export async function migrateAllDataToSupabase(): Promise<void> {
  if (typeof window === "undefined") return
  if (localStorage.getItem(MIGRATION_KEY)) return

  try {
    await Promise.all([
      migrateTable("ingredients", () => db.ingredients.toArray(), (items, now) =>
        items.map((i) => ({
          name: i.name, category: i.category, unit: i.unit,
          current_stock: i.currentStock, minimum_threshold: i.minimumThreshold,
          cost_per_unit: i.costPerUnit, last_restocked: i.lastRestocked ?? null,
          expiry_date: i.expiryDate ?? null, storage_type: i.storageType ?? null,
          shelf_life_days: i.shelfLifeDays ?? null, supplier: i.supplier ?? null,
          notes: i.notes ?? null, created_at: i.createdAt ?? now, updated_at: i.updatedAt ?? now,
        }))
      ),

      migrateTable("menu_items", () => db.menuItems.toArray(), (items, now) =>
        items.map((m) => ({
          name: m.name, category: m.category, description: m.description ?? null,
          sizes: m.sizes, is_customizable: m.isCustomizable, is_active: m.isActive,
          created_at: m.createdAt ?? now, updated_at: m.updatedAt ?? now,
        }))
      ),

      migrateTable("orders", () => db.orders.toArray(), (items, now) =>
        items.map((o) => ({
          order_number: o.orderNumber, order_type: o.orderType, date: o.date,
          items: o.items, subtotal: o.subtotal, discount: o.discount,
          total_amount: o.totalAmount, payment_method: o.paymentMethod,
          notes: o.notes ?? null, customer_name: o.customerName ?? null,
          customer_phone: o.customerPhone ?? null, created_by: o.createdBy ?? null,
          created_at: o.createdAt ?? now,
        }))
      ),

      migrateTable("daily_revenue", () => db.dailyRevenue.toArray(), (items, now) =>
        items.map((r) => ({
          date: r.date, total_sales: r.totalSales, number_of_orders: r.numberOfOrders,
          payment_breakdown: r.paymentBreakdown, average_order_value: r.averageOrderValue,
          created_at: r.createdAt ?? now, updated_at: r.updatedAt ?? now,
        }))
      ),

      migrateTable("expenses", () => db.expenses.toArray(), (items, now) =>
        items.map((e) => ({
          date: e.date, category: e.category, description: e.description,
          amount: e.amount, is_recurring: e.isRecurring, recurring_day: e.recurringDay ?? null,
          receipt_note: e.receiptNote ?? null, created_at: e.createdAt ?? now,
          updated_at: e.updatedAt ?? now,
        }))
      ),

      migrateTable("alert_rules", () => db.alertRules.toArray(), (items, now) =>
        items.map((r) => ({
          name: r.name, type: r.type, condition: r.condition, parameters: r.parameters,
          is_active: r.isActive, last_triggered: r.lastTriggered ?? null,
          created_at: r.createdAt ?? now, updated_at: r.updatedAt ?? now,
        }))
      ),

      migrateTable("alerts", () => db.alerts.toArray(), (items, now) =>
        items.map((a) => ({
          type: a.type, severity: a.severity, title: a.title,
          description: a.description ?? null,
          related_entity_id: a.relatedEntityId ? String(a.relatedEntityId) : null,
          related_entity_type: a.relatedEntityType ?? null,
          is_read: a.isRead, resolved_at: a.resolvedAt ?? null, created_at: a.createdAt ?? now,
        }))
      ),

      migrateTable("app_settings", () => db.appSettings.toArray(), (items, now) =>
        items.map((s) => ({
          key: s.key, value: s.value, updated_at: s.updatedAt ?? now,
        }))
      ),

      migrateTable("recipes", () => db.recipes.toArray(), (items, now) =>
        items.map((r) => ({
          menu_item_id: String(r.menuItemId), name: r.name,
          size_variant: r.sizeVariant ?? null,
          preparation_instructions: r.preparationInstructions ?? null,
          prep_time_minutes: r.prepTimeMinutes ?? null,
          created_at: r.createdAt ?? now, updated_at: r.updatedAt ?? now,
        }))
      ),

      migrateTable("recipe_ingredients", () => db.recipeIngredients.toArray(), (items, now) =>
        items.map((ri) => ({
          recipe_id: String(ri.recipeId), ingredient_id: String(ri.ingredientId),
          quantity: ri.quantity, unit: ri.unit, is_optional: ri.isOptional,
          notes: ri.notes ?? null, created_at: ri.createdAt ?? now,
        }))
      ),

      migrateTable("bowl_templates", () => db.bowlTemplates.toArray(), (items, now) =>
        items.map((bt) => ({
          name: bt.name, type: bt.type, base_price_regular: bt.basePriceRegular,
          base_price_large: bt.basePriceLarge ?? null,
          created_at: bt.createdAt ?? now, updated_at: bt.updatedAt ?? now,
        }))
      ),

      migrateTable("bowl_components", () => db.bowlComponents.toArray(), (items, now) =>
        items.map((bc) => ({
          bowl_template_id: String(bc.bowlTemplateId), component_type: bc.componentType,
          name: bc.name, price_regular: bc.priceRegular, price_large: bc.priceLarge ?? null,
          is_included: bc.isIncluded, sort_order: bc.sortOrder, created_at: bc.createdAt ?? now,
        }))
      ),
    ])

    localStorage.setItem(MIGRATION_KEY, "true")
  } catch (err) {
    console.error("Migration error:", err)
  }
}
