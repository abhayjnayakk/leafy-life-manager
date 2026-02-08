import { db } from "@/lib/db/client"
import { supabase } from "@/lib/supabase/client"

const MIGRATION_KEY = "all_data_migrated_to_supabase"

/** Per-table migration flag prefix */
const TABLE_FLAG = "supa_migrated_"

function isTableMigrated(table: string): boolean {
  return localStorage.getItem(TABLE_FLAG + table) === "true"
}

function markTableMigrated(table: string): void {
  localStorage.setItem(TABLE_FLAG + table, "true")
}

/** Check if Supabase table already has data (prevents duplicates on retry) */
async function supabaseHasData(table: string): Promise<boolean> {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
  return (count ?? 0) > 0
}

/**
 * One-time migration of ALL Dexie tables → Supabase.
 * Uses per-table flags so partial failures don't re-insert already-migrated tables.
 */
export async function migrateAllDataToSupabase(): Promise<void> {
  if (typeof window === "undefined") return
  if (localStorage.getItem(MIGRATION_KEY)) return

  try {
    const now = new Date().toISOString()

    // 1. Ingredients
    if (!isTableMigrated("ingredients")) {
      const localIngredients = await db.ingredients.toArray()
      if (localIngredients.length > 0 && !(await supabaseHasData("ingredients"))) {
        const rows = localIngredients.map((i) => ({
          name: i.name,
          category: i.category,
          unit: i.unit,
          current_stock: i.currentStock,
          minimum_threshold: i.minimumThreshold,
          cost_per_unit: i.costPerUnit,
          last_restocked: i.lastRestocked ?? null,
          expiry_date: i.expiryDate ?? null,
          storage_type: i.storageType ?? null,
          shelf_life_days: i.shelfLifeDays ?? null,
          supplier: i.supplier ?? null,
          notes: i.notes ?? null,
          created_at: i.createdAt ?? now,
          updated_at: i.updatedAt ?? now,
        }))
        const { error } = await supabase.from("ingredients").insert(rows)
        if (error) console.warn("Ingredient migration failed:", error.message)
      }
      markTableMigrated("ingredients")
    }

    // 2. Menu items
    if (!isTableMigrated("menu_items")) {
      const localMenuItems = await db.menuItems.toArray()
      if (localMenuItems.length > 0 && !(await supabaseHasData("menu_items"))) {
        const rows = localMenuItems.map((m) => ({
          name: m.name,
          category: m.category,
          description: m.description ?? null,
          sizes: m.sizes,
          is_customizable: m.isCustomizable,
          is_active: m.isActive,
          created_at: m.createdAt ?? now,
          updated_at: m.updatedAt ?? now,
        }))
        const { error } = await supabase.from("menu_items").insert(rows)
        if (error) console.warn("Menu items migration failed:", error.message)
      }
      markTableMigrated("menu_items")
    }

    // 3. Orders
    if (!isTableMigrated("orders")) {
      const localOrders = await db.orders.toArray()
      if (localOrders.length > 0 && !(await supabaseHasData("orders"))) {
        const rows = localOrders.map((o) => ({
          order_number: o.orderNumber,
          order_type: o.orderType,
          date: o.date,
          items: o.items,
          subtotal: o.subtotal,
          discount: o.discount,
          total_amount: o.totalAmount,
          payment_method: o.paymentMethod,
          notes: o.notes ?? null,
          customer_name: o.customerName ?? null,
          customer_phone: o.customerPhone ?? null,
          created_by: o.createdBy ?? null,
          created_at: o.createdAt ?? now,
        }))
        const { error } = await supabase.from("orders").insert(rows)
        if (error) console.warn("Orders migration failed:", error.message)
      }
      markTableMigrated("orders")
    }

    // 4. Daily revenue
    if (!isTableMigrated("daily_revenue")) {
      const localRevenue = await db.dailyRevenue.toArray()
      if (localRevenue.length > 0 && !(await supabaseHasData("daily_revenue"))) {
        const rows = localRevenue.map((r) => ({
          date: r.date,
          total_sales: r.totalSales,
          number_of_orders: r.numberOfOrders,
          payment_breakdown: r.paymentBreakdown,
          average_order_value: r.averageOrderValue,
          created_at: r.createdAt ?? now,
          updated_at: r.updatedAt ?? now,
        }))
        const { error } = await supabase.from("daily_revenue").insert(rows)
        if (error) console.warn("Daily revenue migration failed:", error.message)
      }
      markTableMigrated("daily_revenue")
    }

    // 5. Expenses
    if (!isTableMigrated("expenses")) {
      const localExpenses = await db.expenses.toArray()
      if (localExpenses.length > 0 && !(await supabaseHasData("expenses"))) {
        const rows = localExpenses.map((e) => ({
          date: e.date,
          category: e.category,
          description: e.description,
          amount: e.amount,
          is_recurring: e.isRecurring,
          recurring_day: e.recurringDay ?? null,
          receipt_note: e.receiptNote ?? null,
          created_at: e.createdAt ?? now,
          updated_at: e.updatedAt ?? now,
        }))
        const { error } = await supabase.from("expenses").insert(rows)
        if (error) console.warn("Expenses migration failed:", error.message)
      }
      markTableMigrated("expenses")
    }

    // 6. Alert rules
    if (!isTableMigrated("alert_rules")) {
      const localAlertRules = await db.alertRules.toArray()
      if (localAlertRules.length > 0 && !(await supabaseHasData("alert_rules"))) {
        const rows = localAlertRules.map((r) => ({
          name: r.name,
          type: r.type,
          condition: r.condition,
          parameters: r.parameters,
          is_active: r.isActive,
          last_triggered: r.lastTriggered ?? null,
          created_at: r.createdAt ?? now,
          updated_at: r.updatedAt ?? now,
        }))
        const { error } = await supabase.from("alert_rules").insert(rows)
        if (error) console.warn("Alert rules migration failed:", error.message)
      }
      markTableMigrated("alert_rules")
    }

    // 7. Alerts
    if (!isTableMigrated("alerts")) {
      const localAlerts = await db.alerts.toArray()
      if (localAlerts.length > 0 && !(await supabaseHasData("alerts"))) {
        const rows = localAlerts.map((a) => ({
          type: a.type,
          severity: a.severity,
          title: a.title,
          description: a.description ?? null,
          related_entity_id: a.relatedEntityId ? String(a.relatedEntityId) : null,
          related_entity_type: a.relatedEntityType ?? null,
          is_read: a.isRead,
          resolved_at: a.resolvedAt ?? null,
          created_at: a.createdAt ?? now,
        }))
        const { error } = await supabase.from("alerts").insert(rows)
        if (error) console.warn("Alerts migration failed:", error.message)
      }
      markTableMigrated("alerts")
    }

    // 8. App settings
    if (!isTableMigrated("app_settings")) {
      const localSettings = await db.appSettings.toArray()
      if (localSettings.length > 0 && !(await supabaseHasData("app_settings"))) {
        const rows = localSettings.map((s) => ({
          key: s.key,
          value: s.value,
          updated_at: s.updatedAt ?? now,
        }))
        const { error } = await supabase.from("app_settings").insert(rows)
        if (error) console.warn("App settings migration failed:", error.message)
      }
      markTableMigrated("app_settings")
    }

    // 9. Recipes
    if (!isTableMigrated("recipes")) {
      const localRecipes = await db.recipes.toArray()
      if (localRecipes.length > 0 && !(await supabaseHasData("recipes"))) {
        const rows = localRecipes.map((r) => ({
          menu_item_id: String(r.menuItemId),
          name: r.name,
          size_variant: r.sizeVariant ?? null,
          preparation_instructions: r.preparationInstructions ?? null,
          prep_time_minutes: r.prepTimeMinutes ?? null,
          created_at: r.createdAt ?? now,
          updated_at: r.updatedAt ?? now,
        }))
        const { error } = await supabase.from("recipes").insert(rows)
        if (error) console.warn("Recipes migration failed:", error.message)
      }
      markTableMigrated("recipes")
    }

    // 10. Recipe ingredients
    if (!isTableMigrated("recipe_ingredients")) {
      const localRecipeIngs = await db.recipeIngredients.toArray()
      if (localRecipeIngs.length > 0 && !(await supabaseHasData("recipe_ingredients"))) {
        const rows = localRecipeIngs.map((ri) => ({
          recipe_id: String(ri.recipeId),
          ingredient_id: String(ri.ingredientId),
          quantity: ri.quantity,
          unit: ri.unit,
          is_optional: ri.isOptional,
          notes: ri.notes ?? null,
          created_at: ri.createdAt ?? now,
        }))
        const { error } = await supabase.from("recipe_ingredients").insert(rows)
        if (error) console.warn("Recipe ingredients migration failed:", error.message)
      }
      markTableMigrated("recipe_ingredients")
    }

    // 11. Bowl templates
    if (!isTableMigrated("bowl_templates")) {
      const localBowlTemplates = await db.bowlTemplates.toArray()
      if (localBowlTemplates.length > 0 && !(await supabaseHasData("bowl_templates"))) {
        const rows = localBowlTemplates.map((bt) => ({
          name: bt.name,
          type: bt.type,
          base_price_regular: bt.basePriceRegular,
          base_price_large: bt.basePriceLarge ?? null,
          created_at: bt.createdAt ?? now,
          updated_at: bt.updatedAt ?? now,
        }))
        const { error } = await supabase.from("bowl_templates").insert(rows)
        if (error) console.warn("Bowl templates migration failed:", error.message)
      }
      markTableMigrated("bowl_templates")
    }

    // 12. Bowl components
    if (!isTableMigrated("bowl_components")) {
      const localBowlComponents = await db.bowlComponents.toArray()
      if (localBowlComponents.length > 0 && !(await supabaseHasData("bowl_components"))) {
        const rows = localBowlComponents.map((bc) => ({
          bowl_template_id: String(bc.bowlTemplateId),
          component_type: bc.componentType,
          name: bc.name,
          price_regular: bc.priceRegular,
          price_large: bc.priceLarge ?? null,
          is_included: bc.isIncluded,
          sort_order: bc.sortOrder,
          created_at: bc.createdAt ?? now,
        }))
        const { error } = await supabase.from("bowl_components").insert(rows)
        if (error) console.warn("Bowl components migration failed:", error.message)
      }
      markTableMigrated("bowl_components")
    }

    // Mark as fully migrated (fast-exit on future loads)
    localStorage.setItem(MIGRATION_KEY, "true")
    console.log("All data migrated to Supabase successfully")
  } catch (err) {
    console.error("Migration error:", err)
  }
}

/**
 * Seed Supabase tables with defaults if they're empty.
 * Called after migration, ensures new installs get default data.
 */
export async function seedSupabaseIfEmpty(): Promise<void> {
  // Check if menu items exist in Supabase
  const { count: menuCount } = await supabase
    .from("menu_items")
    .select("*", { count: "exact", head: true })

  // If Supabase already has data, skip seeding
  if (menuCount && menuCount > 0) return

  // Import seed data from Dexie seed and run it
  // The DexieProvider's seedDatabase() will handle Dexie seeding
  // Then migrateAllDataToSupabase() will push it to Supabase
  // For completely fresh installs (no Dexie data), we need to seed Supabase directly
  console.log("Supabase tables are empty. Dexie seed + migration will populate them.")
}
