import Dexie, { type EntityTable } from "dexie"
import type {
  Ingredient,
  MenuItem,
  Recipe,
  RecipeIngredient,
  BowlTemplate,
  BowlComponent,
  Order,
  DailyRevenue,
  Expense,
  Alert,
  AlertRule,
  AppSettings,
  Task,
} from "./schema"

type LeafyLifeDB = Dexie & {
  ingredients: EntityTable<Ingredient, "id">
  menuItems: EntityTable<MenuItem, "id">
  recipes: EntityTable<Recipe, "id">
  recipeIngredients: EntityTable<RecipeIngredient, "id">
  bowlTemplates: EntityTable<BowlTemplate, "id">
  bowlComponents: EntityTable<BowlComponent, "id">
  orders: EntityTable<Order, "id">
  dailyRevenue: EntityTable<DailyRevenue, "id">
  expenses: EntityTable<Expense, "id">
  alerts: EntityTable<Alert, "id">
  alertRules: EntityTable<AlertRule, "id">
  appSettings: EntityTable<AppSettings, "id">
  tasks: EntityTable<Task, "id">
}

let _db: LeafyLifeDB | null = null

function getDb(): LeafyLifeDB {
  if (_db) return _db

  _db = new Dexie("LeafyLifeManager") as LeafyLifeDB

  _db.version(2).stores({
    ingredients: "++id, name, category, currentStock",
    menuItems: "++id, name, category, isActive",
    recipes: "++id, menuItemId, name",
    recipeIngredients: "++id, recipeId, ingredientId",
    bowlTemplates: "++id, name, type",
    bowlComponents: "++id, bowlTemplateId, componentType",
    orders: "++id, orderNumber, orderType, date, paymentMethod",
    dailyRevenue: "++id, &date",
    expenses: "++id, date, category, isRecurring",
    alerts: "++id, type, severity, isRead, createdAt",
    alertRules: "++id, type, condition, isActive",
    appSettings: "++id, &key",
  })

  // Version 3: Add storageType and expiryDate indexes to ingredients
  _db.version(3).stores({
    ingredients: "++id, name, category, currentStock, storageType, expiryDate",
  })

  // Version 4: Add tasks table
  _db.version(4).stores({
    tasks: "++id, status, priority, assignedTo, dueDate",
  })

  return _db
}

// Lazy getter — binds methods to the real instance so `this` context is correct
export const db = new Proxy({} as LeafyLifeDB, {
  get(_target, prop) {
    const instance = getDb()
    const value = (instance as any)[prop]
    if (typeof value === "function") return value.bind(instance)
    return value
  },
})
