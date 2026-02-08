// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type IngredientCategory =
  | "Greens"
  | "Vegetables"
  | "Fruits"
  | "Proteins"
  | "Grains & Cereals"
  | "Dairy"
  | "Dressings & Sauces"
  | "Toppings & Seeds"
  | "Spices & Seasonings"
  | "Oils"
  | "Beverages & Powders"
  | "Other"

export type IngredientUnit = "kg" | "g" | "L" | "ml" | "pcs" | "dozen" | "bunch" | "pack"

export type MenuCategory =
  | "Salads"
  | "Soups"
  | "Juices"
  | "Sides"
  | "Oats"
  | "Custom Salad Bowl"
  | "Custom Rice Bowl"

export type SizeOption = "Regular" | "Large" | "Single"

export type OrderType = "DineIn" | "Delivery" | "Takeaway"

export type PaymentMethod = "Cash" | "UPI" | "Card"

export type ExpenseCategory =
  | "Rent"
  | "RevenueShare"
  | "Electricity"
  | "Water"
  | "Ingredients"
  | "Equipment"
  | "Salaries"
  | "Marketing"
  | "Maintenance"
  | "Other"

export type AlertSeverity = "low" | "medium" | "high" | "critical"

export type AlertType =
  | "LowStock"
  | "RentDue"
  | "RevenueThreshold"
  | "HighExpense"
  | "ExpiryWarning"
  | "TaskDue"
  | "Custom"

export type StorageType = "Refrigerator" | "Room Temperature" | "Freezer"

export type AlertRuleCondition =
  | "stock_below_threshold"
  | "monthly_rent_due"
  | "daily_revenue_below"
  | "daily_revenue_above"
  | "expense_exceeds_budget"
  | "expiry_within_days"
  | "task_overdue"

export type BowlComponentType = "Base" | "Protein" | "Vegetable" | "Dressing" | "Topping"

// ============================================================
// TABLE INTERFACES — IDs are string (UUID from Supabase)
// Dexie still uses number IDs for local tables during migration
// ============================================================

export interface Ingredient {
  id?: number | string
  name: string
  category: IngredientCategory
  unit: IngredientUnit
  currentStock: number
  minimumThreshold: number
  costPerUnit: number
  lastRestocked?: string
  expiryDate?: string
  storageType?: StorageType
  shelfLifeDays?: number
  supplier?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface MenuItemSize {
  size: SizeOption
  price: number // Delivery price (original)
  dineInPrice: number // DineIn price (price - 30)
  takeawayPrice?: number // Takeaway price (price + 10)
}

export interface MenuItem {
  id?: number | string
  name: string
  category: MenuCategory
  description?: string
  sizes: MenuItemSize[]
  isCustomizable: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Recipe {
  id?: number | string
  menuItemId: number | string
  name: string
  sizeVariant?: SizeOption
  preparationInstructions?: string
  prepTimeMinutes?: number
  createdAt: string
  updatedAt: string
}

export interface RecipeIngredient {
  id?: number | string
  recipeId: number | string
  ingredientId: number | string
  quantity: number
  unit: IngredientUnit
  isOptional: boolean
  notes?: string
  createdAt: string
}

export interface BowlTemplate {
  id?: number | string
  name: string
  type: "SaladBowl" | "RiceBowl"
  basePriceRegular: number
  basePriceLarge?: number
  createdAt: string
  updatedAt: string
}

export interface BowlComponent {
  id?: number | string
  bowlTemplateId: number | string
  componentType: BowlComponentType
  name: string
  priceRegular: number
  priceLarge?: number
  isIncluded: boolean
  sortOrder: number
  createdAt: string
}

export interface OrderItem {
  menuItemId: number | string
  menuItemName: string
  size: SizeOption
  quantity: number
  unitPrice: number
  customizations?: CustomBowlSelection
  excludedIngredients?: string[]
  specialInstructions?: string
  lineTotal: number
}

export interface CustomBowlSelection {
  base?: string
  proteins?: string[]
  veggies?: string[]
  dressing?: string
  toppings?: string[]
  addOnTotal: number
}

export interface Order {
  id?: number | string
  orderNumber: string
  orderType: OrderType
  date: string
  items: OrderItem[]
  subtotal: number
  discount: number
  totalAmount: number
  paymentMethod: PaymentMethod
  notes?: string
  customerName?: string
  customerPhone?: string
  createdBy?: string
  createdAt: string
}

export interface DailyRevenue {
  id?: number | string
  date: string
  totalSales: number
  numberOfOrders: number
  paymentBreakdown: {
    cash: number
    upi: number
    card: number
  }
  averageOrderValue: number
  createdAt: string
  updatedAt: string
}

export interface Expense {
  id?: number | string
  date: string
  category: ExpenseCategory
  description: string
  amount: number
  isRecurring: boolean
  recurringDay?: number
  receiptNote?: string
  createdAt: string
  updatedAt: string
}

export interface Alert {
  id?: number | string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  relatedEntityId?: number | string
  relatedEntityType?: string
  isRead: boolean
  resolvedAt?: string
  createdAt: string
}

export interface AlertRule {
  id?: number | string
  name: string
  type: AlertType
  condition: AlertRuleCondition
  parameters: Record<string, number | string>
  isActive: boolean
  lastTriggered?: string
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  id?: number | string
  key: string
  value: string
  updatedAt: string
}

// ============================================================
// TASK TYPES
// ============================================================

export type TaskPriority = "low" | "medium" | "high" | "urgent"

export type TaskStatus = "pending" | "in_progress" | "completed"

export type TaskAssignee = "admin" | "staff"

export interface Task {
  id?: string
  title: string
  description?: string
  dueDate?: string
  priority: TaskPriority
  status: TaskStatus
  assignedTo: TaskAssignee
  completedAt?: string
  completedBy?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}
