import { db } from "./client"
import type {
  MenuItem,
  Ingredient,
  BowlTemplate,
  BowlComponent,
  AlertRule,
  AppSettings,
  Recipe,
  RecipeIngredient,
  StorageType,
} from "./schema"

// ============================================================
// MENU ITEMS - Exact Leafy Life Menu
// ============================================================

// Helper: creates dual pricing (delivery = given price, dineIn = price - 30, min 0)
function dp(price: number): { price: number; dineInPrice: number } {
  return { price, dineInPrice: Math.max(0, price - 30) }
}

const MENU_ITEMS: Omit<MenuItem, "id" | "createdAt" | "updatedAt">[] = [
  // --- SALADS (7 types, Regular/Large) ---
  {
    name: "Aloo Masti",
    category: "Salads",
    description: "Steamed Aloo, finely chopped onion, cucumber cubes, chilly & coriander, white sesame seeds with curd dressing",
    sizes: [{ size: "Regular", ...dp(80) }, { size: "Large", ...dp(110) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Mexican Loaded",
    category: "Salads",
    description: "Boiled kidney beans, corn, bell peppers, lettuce, sesame seeds with chipotle or chilly lime dressing",
    sizes: [{ size: "Regular", ...dp(100) }, { size: "Large", ...dp(130) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Desi Chatpata",
    category: "Salads",
    description: "Marinated air-fried chickpeas, tomato, cucumber, onion, lettuce, sesame seeds with mint coriander dressing",
    sizes: [{ size: "Regular", ...dp(100) }, { size: "Large", ...dp(130) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Paneer Tikka Salad",
    category: "Salads",
    description: "Air-fried paneer tikka, bell peppers, onion, lettuce, sesame seeds with mint coriander dressing",
    sizes: [{ size: "Regular", ...dp(115) }, { size: "Large", ...dp(145) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Egg Salad",
    category: "Salads",
    description: "Bell peppers, onion, lettuce, boiled egg, sesame seeds with choice of dressing",
    sizes: [{ size: "Regular", ...dp(130) }, { size: "Large", ...dp(160) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Protein Salad (Veg)",
    category: "Salads",
    description: "Paneer tikka, boiled rajma, broccoli, corn, capsicum, onion, lettuce with mint coriander or chipotle",
    sizes: [{ size: "Regular", ...dp(150) }, { size: "Large", ...dp(180) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Protein Salad (Veg + Egg)",
    category: "Salads",
    description: "Boiled egg, rajma, broccoli, corn, capsicum, onion, lettuce with mint coriander or chipotle",
    sizes: [{ size: "Regular", ...dp(160) }, { size: "Large", ...dp(190) }],
    isCustomizable: false,
    isActive: true,
  },

  // --- SOUPS (4 types, single size) ---
  {
    name: "Millet & Dry Fruits Soup",
    category: "Soups",
    description: "Millet soup with dry fruits, pepper, salt, oregano",
    sizes: [{ size: "Single", ...dp(90) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Tomato Soup",
    category: "Soups",
    description: "Classic tomato soup with pepper, salt, oregano",
    sizes: [{ size: "Single", ...dp(50) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Carrot Soup",
    category: "Soups",
    description: "Fresh carrot soup with pepper, salt, oregano",
    sizes: [{ size: "Single", ...dp(50) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Pumpkin Soup",
    category: "Soups",
    description: "Pumpkin soup with pepper, salt, oregano",
    sizes: [{ size: "Single", ...dp(50) }],
    isCustomizable: false,
    isActive: true,
  },

  // --- JUICES (4 types, single size) ---
  {
    name: "Whey Protein + Water",
    category: "Juices",
    description: "Good quality whey protein mixed with water",
    sizes: [{ size: "Single", ...dp(120) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Whey Protein + Milk",
    category: "Juices",
    description: "Whey protein with 200ml milk",
    sizes: [{ size: "Single", ...dp(150) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "ABC Juice",
    category: "Juices",
    description: "Apple, Beet and Carrot juice",
    sizes: [{ size: "Single", ...dp(100) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Millet & Dry Fruits Juice",
    category: "Juices",
    description: "Aakarsh protein powder (millets & dry fruits)",
    sizes: [{ size: "Single", ...dp(100) }],
    isCustomizable: false,
    isActive: true,
  },

  // --- SIDES (2 types, single size) ---
  {
    name: "Paneer Tikka",
    category: "Sides",
    description: "Marinated paneer (curd, chilly, garam masala, coriander powder, salt) air-fried, with mint coriander or chipotle",
    sizes: [{ size: "Single", ...dp(80) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Paneer 65",
    category: "Sides",
    description: "Marinated paneer (oil, chilly, garam masala, coriander powder, salt) air-fried, with mint coriander or chipotle",
    sizes: [{ size: "Single", ...dp(70) }],
    isCustomizable: false,
    isActive: true,
  },

  // --- OATS (5 types, single size) ---
  {
    name: "Masala Oats",
    category: "Oats",
    description: "Safola Oats prepared masala style",
    sizes: [{ size: "Single", ...dp(60) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Masala Paneer Oats",
    category: "Oats",
    description: "Safola Oats with paneer, masala style",
    sizes: [{ size: "Single", ...dp(90) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Masala Egg Oats",
    category: "Oats",
    description: "Safola Oats with egg, masala style",
    sizes: [{ size: "Single", ...dp(90) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Masala Paneer and Egg Oats",
    category: "Oats",
    description: "Safola Oats with paneer and egg, masala style",
    sizes: [{ size: "Single", ...dp(110) }],
    isCustomizable: false,
    isActive: true,
  },
  {
    name: "Fruits and Nuts Milk Oats Bowl",
    category: "Oats",
    description: "Quaker multigrain plain oats + banana + apple + dry fruits (almond, cashew, raisins) + 7-element mix seeds + hot milk",
    sizes: [{ size: "Single", ...dp(120) }],
    isCustomizable: false,
    isActive: true,
  },

  // --- CUSTOM BOWLS ---
  {
    name: "Custom Salad Bowl",
    category: "Custom Salad Bowl",
    description: "Build your own salad: base + protein + veggies + dressing + toppings",
    sizes: [{ size: "Regular", ...dp(70) }, { size: "Large", ...dp(90) }],
    isCustomizable: true,
    isActive: true,
  },
  {
    name: "Custom Rice Bowl",
    category: "Custom Rice Bowl",
    description: "Build your own rice bowl: herb rice base + protein + veggies + toppings + dressing",
    sizes: [{ size: "Single", ...dp(99) }],
    isCustomizable: true,
    isActive: true,
  },
]

// ============================================================
// INGREDIENTS - Actual ingredients from the menu
// ============================================================

const DEFAULT_INGREDIENTS: Omit<Ingredient, "id" | "createdAt" | "updatedAt">[] = [
  // Vegetables
  { name: "Potato (Aloo)", category: "Vegetables", unit: "kg", currentStock: 10, minimumThreshold: 3, costPerUnit: 30, storageType: "Room Temperature", shelfLifeDays: 14 },
  { name: "Onion", category: "Vegetables", unit: "kg", currentStock: 10, minimumThreshold: 3, costPerUnit: 35, storageType: "Room Temperature", shelfLifeDays: 21 },
  { name: "Cucumber", category: "Vegetables", unit: "kg", currentStock: 8, minimumThreshold: 3, costPerUnit: 30, storageType: "Refrigerator", shelfLifeDays: 5 },
  { name: "Tomato", category: "Vegetables", unit: "kg", currentStock: 8, minimumThreshold: 3, costPerUnit: 40, storageType: "Room Temperature", shelfLifeDays: 5 },
  { name: "Green Bell Pepper", category: "Vegetables", unit: "kg", currentStock: 4, minimumThreshold: 2, costPerUnit: 80, storageType: "Refrigerator", shelfLifeDays: 7 },
  { name: "Yellow/Red Bell Pepper", category: "Vegetables", unit: "kg", currentStock: 3, minimumThreshold: 1, costPerUnit: 200, storageType: "Refrigerator", shelfLifeDays: 7 },
  { name: "Capsicum", category: "Vegetables", unit: "kg", currentStock: 4, minimumThreshold: 2, costPerUnit: 60, storageType: "Refrigerator", shelfLifeDays: 7 },
  { name: "Corn", category: "Vegetables", unit: "kg", currentStock: 5, minimumThreshold: 2, costPerUnit: 60, storageType: "Freezer", shelfLifeDays: 30 },
  { name: "Broccoli", category: "Vegetables", unit: "kg", currentStock: 3, minimumThreshold: 1, costPerUnit: 120, storageType: "Refrigerator", shelfLifeDays: 5 },
  { name: "Carrot", category: "Vegetables", unit: "kg", currentStock: 5, minimumThreshold: 2, costPerUnit: 40, storageType: "Refrigerator", shelfLifeDays: 14 },
  { name: "Pumpkin", category: "Vegetables", unit: "kg", currentStock: 4, minimumThreshold: 2, costPerUnit: 30, storageType: "Room Temperature", shelfLifeDays: 14 },
  { name: "Beetroot", category: "Vegetables", unit: "kg", currentStock: 3, minimumThreshold: 1, costPerUnit: 40, storageType: "Refrigerator", shelfLifeDays: 14 },

  // Greens
  { name: "Lettuce", category: "Greens", unit: "kg", currentStock: 5, minimumThreshold: 2, costPerUnit: 100, storageType: "Refrigerator", shelfLifeDays: 3 },
  { name: "Fresh Coriander", category: "Greens", unit: "bunch", currentStock: 10, minimumThreshold: 4, costPerUnit: 10, storageType: "Refrigerator", shelfLifeDays: 3 },
  { name: "Fresh Mint (Pudina)", category: "Greens", unit: "bunch", currentStock: 8, minimumThreshold: 3, costPerUnit: 10, storageType: "Refrigerator", shelfLifeDays: 3 },
  { name: "Green Chilly", category: "Greens", unit: "kg", currentStock: 1, minimumThreshold: 0.5, costPerUnit: 80, storageType: "Refrigerator", shelfLifeDays: 7 },

  // Proteins
  { name: "Paneer", category: "Proteins", unit: "kg", currentStock: 5, minimumThreshold: 2, costPerUnit: 320, storageType: "Refrigerator", shelfLifeDays: 5 },
  { name: "Eggs", category: "Proteins", unit: "dozen", currentStock: 5, minimumThreshold: 2, costPerUnit: 80, storageType: "Refrigerator", shelfLifeDays: 14 },
  { name: "Chickpeas (Chole)", category: "Proteins", unit: "kg", currentStock: 5, minimumThreshold: 2, costPerUnit: 120, storageType: "Room Temperature", shelfLifeDays: 180 },
  { name: "Kidney Beans (Rajma)", category: "Proteins", unit: "kg", currentStock: 5, minimumThreshold: 2, costPerUnit: 140, storageType: "Room Temperature", shelfLifeDays: 180 },

  // Dairy
  { name: "Curd (Dahi)", category: "Dairy", unit: "kg", currentStock: 5, minimumThreshold: 2, costPerUnit: 60, storageType: "Refrigerator", shelfLifeDays: 5 },
  { name: "Milk", category: "Dairy", unit: "L", currentStock: 10, minimumThreshold: 3, costPerUnit: 55, storageType: "Refrigerator", shelfLifeDays: 2 },

  // Grains & Cereals
  { name: "Safola Masala Oats", category: "Grains & Cereals", unit: "pack", currentStock: 10, minimumThreshold: 4, costPerUnit: 45, storageType: "Room Temperature", shelfLifeDays: 180 },
  { name: "Quaker Multigrain Oats", category: "Grains & Cereals", unit: "pack", currentStock: 6, minimumThreshold: 2, costPerUnit: 55, storageType: "Room Temperature", shelfLifeDays: 180 },
  { name: "Rice", category: "Grains & Cereals", unit: "kg", currentStock: 10, minimumThreshold: 3, costPerUnit: 60, storageType: "Room Temperature", shelfLifeDays: 365 },

  // Toppings & Seeds
  { name: "White Sesame Seeds", category: "Toppings & Seeds", unit: "kg", currentStock: 2, minimumThreshold: 0.5, costPerUnit: 250, storageType: "Room Temperature", shelfLifeDays: 180 },
  { name: "Almonds", category: "Toppings & Seeds", unit: "kg", currentStock: 2, minimumThreshold: 0.5, costPerUnit: 800, storageType: "Room Temperature", shelfLifeDays: 180 },
  { name: "Cashews", category: "Toppings & Seeds", unit: "kg", currentStock: 2, minimumThreshold: 0.5, costPerUnit: 900, storageType: "Room Temperature", shelfLifeDays: 180 },
  { name: "Raisins", category: "Toppings & Seeds", unit: "kg", currentStock: 2, minimumThreshold: 0.5, costPerUnit: 300, storageType: "Room Temperature", shelfLifeDays: 180 },
  { name: "7 Elements Mix Seeds", category: "Toppings & Seeds", unit: "pack", currentStock: 5, minimumThreshold: 2, costPerUnit: 150, storageType: "Room Temperature", shelfLifeDays: 120 },

  // Fruits
  { name: "Banana", category: "Fruits", unit: "dozen", currentStock: 5, minimumThreshold: 2, costPerUnit: 50, storageType: "Room Temperature", shelfLifeDays: 3 },
  { name: "Apple", category: "Fruits", unit: "kg", currentStock: 5, minimumThreshold: 2, costPerUnit: 150, storageType: "Refrigerator", shelfLifeDays: 14 },
  { name: "Lemon", category: "Fruits", unit: "kg", currentStock: 3, minimumThreshold: 1, costPerUnit: 60, storageType: "Room Temperature", shelfLifeDays: 14 },

  // Spices & Seasonings
  { name: "Salt", category: "Spices & Seasonings", unit: "kg", currentStock: 5, minimumThreshold: 2, costPerUnit: 20, storageType: "Room Temperature", shelfLifeDays: 365 },
  { name: "Black Pepper", category: "Spices & Seasonings", unit: "kg", currentStock: 1, minimumThreshold: 0.3, costPerUnit: 600, storageType: "Room Temperature", shelfLifeDays: 365 },
  { name: "Chilly Powder", category: "Spices & Seasonings", unit: "kg", currentStock: 1, minimumThreshold: 0.3, costPerUnit: 300, storageType: "Room Temperature", shelfLifeDays: 180 },
  { name: "Chilly Flakes", category: "Spices & Seasonings", unit: "kg", currentStock: 0.5, minimumThreshold: 0.2, costPerUnit: 400, storageType: "Room Temperature", shelfLifeDays: 180 },
  { name: "Chat Masala", category: "Spices & Seasonings", unit: "kg", currentStock: 1, minimumThreshold: 0.3, costPerUnit: 250, storageType: "Room Temperature", shelfLifeDays: 180 },
  { name: "Garam Masala Powder", category: "Spices & Seasonings", unit: "kg", currentStock: 1, minimumThreshold: 0.3, costPerUnit: 350, storageType: "Room Temperature", shelfLifeDays: 180 },
  { name: "Coriander Powder", category: "Spices & Seasonings", unit: "kg", currentStock: 1, minimumThreshold: 0.3, costPerUnit: 200, storageType: "Room Temperature", shelfLifeDays: 180 },
  { name: "Oregano", category: "Spices & Seasonings", unit: "kg", currentStock: 0.5, minimumThreshold: 0.2, costPerUnit: 500, storageType: "Room Temperature", shelfLifeDays: 365 },
  { name: "Garlic", category: "Spices & Seasonings", unit: "kg", currentStock: 3, minimumThreshold: 1, costPerUnit: 150, storageType: "Room Temperature", shelfLifeDays: 21 },

  // Oils
  { name: "Olive Oil", category: "Oils", unit: "L", currentStock: 3, minimumThreshold: 1, costPerUnit: 600, storageType: "Room Temperature", shelfLifeDays: 365 },

  // Dressings & Sauces
  { name: "Chipotle Sauce", category: "Dressings & Sauces", unit: "L", currentStock: 3, minimumThreshold: 1, costPerUnit: 300, storageType: "Refrigerator", shelfLifeDays: 30 },
  { name: "Tomato Sauce", category: "Dressings & Sauces", unit: "L", currentStock: 3, minimumThreshold: 1, costPerUnit: 100, storageType: "Room Temperature", shelfLifeDays: 90 },

  // Beverages & Powders
  { name: "Whey Protein Powder", category: "Beverages & Powders", unit: "kg", currentStock: 3, minimumThreshold: 1, costPerUnit: 1500, storageType: "Room Temperature", shelfLifeDays: 365 },
  { name: "Millet & Dry Fruits Powder", category: "Beverages & Powders", unit: "kg", currentStock: 3, minimumThreshold: 1, costPerUnit: 400, storageType: "Room Temperature", shelfLifeDays: 180 },
]

// ============================================================
// BOWL TEMPLATES & COMPONENTS - Exact pricing
// ============================================================

const BOWL_TEMPLATES: Omit<BowlTemplate, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Custom Salad Bowl",
    type: "SaladBowl",
    basePriceRegular: 70,
    basePriceLarge: 90,
  },
  {
    name: "Custom Rice Bowl",
    type: "RiceBowl",
    basePriceRegular: 99,
  },
]

// Components keyed by template index (0 = salad, 1 = rice)
interface SeedBowlComponent extends Omit<BowlComponent, "id" | "bowlTemplateId" | "createdAt"> {
  templateIndex: number
}

const BOWL_COMPONENTS: SeedBowlComponent[] = [
  // ===== CUSTOM SALAD BOWL =====
  // Base (included)
  { templateIndex: 0, componentType: "Base", name: "Lettuce + Cucumber + Onion + Tomato", priceRegular: 0, priceLarge: 0, isIncluded: true, sortOrder: 0 },

  // Proteins
  { templateIndex: 0, componentType: "Protein", name: "Steamed Aloo", priceRegular: 15, priceLarge: 20, isIncluded: false, sortOrder: 1 },
  { templateIndex: 0, componentType: "Protein", name: "Boiled Chickpeas (Marinated & Air-fried)", priceRegular: 30, priceLarge: 40, isIncluded: false, sortOrder: 2 },
  { templateIndex: 0, componentType: "Protein", name: "Boiled Rajma (Kidney Beans)", priceRegular: 30, priceLarge: 40, isIncluded: false, sortOrder: 3 },
  { templateIndex: 0, componentType: "Protein", name: "Paneer 65", priceRegular: 40, priceLarge: 50, isIncluded: false, sortOrder: 4 },
  { templateIndex: 0, componentType: "Protein", name: "Paneer Tikka", priceRegular: 45, priceLarge: 55, isIncluded: false, sortOrder: 5 },
  { templateIndex: 0, componentType: "Protein", name: "Boiled Egg", priceRegular: 20, priceLarge: 30, isIncluded: false, sortOrder: 6 },

  // Extra Veggies
  { templateIndex: 0, componentType: "Vegetable", name: "Bell Pepper (Green/Yellow/Red)", priceRegular: 20, priceLarge: 20, isIncluded: false, sortOrder: 7 },
  { templateIndex: 0, componentType: "Vegetable", name: "Boiled Corn", priceRegular: 15, priceLarge: 15, isIncluded: false, sortOrder: 8 },
  { templateIndex: 0, componentType: "Vegetable", name: "Broccoli", priceRegular: 25, priceLarge: 25, isIncluded: false, sortOrder: 9 },
  { templateIndex: 0, componentType: "Vegetable", name: "Extra Cucumber", priceRegular: 10, priceLarge: 10, isIncluded: false, sortOrder: 10 },
  { templateIndex: 0, componentType: "Vegetable", name: "Capsicum", priceRegular: 15, priceLarge: 15, isIncluded: false, sortOrder: 11 },

  // Dressings (included - choose one)
  { templateIndex: 0, componentType: "Dressing", name: "Mint Coriander Dressing", priceRegular: 0, priceLarge: 0, isIncluded: true, sortOrder: 12 },
  { templateIndex: 0, componentType: "Dressing", name: "Chilly Lime Dressing", priceRegular: 0, priceLarge: 0, isIncluded: true, sortOrder: 13 },
  { templateIndex: 0, componentType: "Dressing", name: "Curd-based Creamy Dressing", priceRegular: 0, priceLarge: 0, isIncluded: true, sortOrder: 14 },
  { templateIndex: 0, componentType: "Dressing", name: "Chipotle Sauce", priceRegular: 0, priceLarge: 0, isIncluded: true, sortOrder: 15 },

  // Toppings
  { templateIndex: 0, componentType: "Topping", name: "White Sesame Seeds", priceRegular: 10, priceLarge: 10, isIncluded: false, sortOrder: 16 },
  { templateIndex: 0, componentType: "Topping", name: "Extra Chilly & Coriander", priceRegular: 10, priceLarge: 10, isIncluded: false, sortOrder: 17 },

  // ===== CUSTOM RICE BOWL =====
  // Proteins
  { templateIndex: 1, componentType: "Protein", name: "Paneer Tikka", priceRegular: 45, isIncluded: false, sortOrder: 1 },
  { templateIndex: 1, componentType: "Protein", name: "Paneer 65", priceRegular: 40, isIncluded: false, sortOrder: 2 },
  { templateIndex: 1, componentType: "Protein", name: "Boiled Egg", priceRegular: 20, isIncluded: false, sortOrder: 3 },
  { templateIndex: 1, componentType: "Protein", name: "Boiled Chickpeas (Marinated)", priceRegular: 30, isIncluded: false, sortOrder: 4 },
  { templateIndex: 1, componentType: "Protein", name: "Boiled Rajma", priceRegular: 30, isIncluded: false, sortOrder: 5 },

  // Veggies
  { templateIndex: 1, componentType: "Vegetable", name: "Stir-fry Veggies (Mixed)", priceRegular: 40, isIncluded: false, sortOrder: 6 },
  { templateIndex: 1, componentType: "Vegetable", name: "Bell Pepper Mix", priceRegular: 20, isIncluded: false, sortOrder: 7 },
  { templateIndex: 1, componentType: "Vegetable", name: "Broccoli", priceRegular: 25, isIncluded: false, sortOrder: 8 },
  { templateIndex: 1, componentType: "Vegetable", name: "Boiled Corn", priceRegular: 15, isIncluded: false, sortOrder: 9 },
  { templateIndex: 1, componentType: "Vegetable", name: "Lettuce & Cucumber Mix", priceRegular: 15, isIncluded: false, sortOrder: 10 },

  // Premium Toppings
  { templateIndex: 1, componentType: "Topping", name: "Dry Fruits (Almonds, Cashew, Raisins)", priceRegular: 50, isIncluded: false, sortOrder: 11 },
  { templateIndex: 1, componentType: "Topping", name: "Fresh Fruits (Banana, Apple)", priceRegular: 30, isIncluded: false, sortOrder: 12 },
  { templateIndex: 1, componentType: "Topping", name: "White Sesame Seeds", priceRegular: 10, isIncluded: false, sortOrder: 13 },

  // Additional Dressings (paid for rice bowl)
  { templateIndex: 1, componentType: "Dressing", name: "Mint Coriander Dressing", priceRegular: 15, isIncluded: false, sortOrder: 14 },
  { templateIndex: 1, componentType: "Dressing", name: "Chipotle Sauce", priceRegular: 15, isIncluded: false, sortOrder: 15 },
  { templateIndex: 1, componentType: "Dressing", name: "Chilly Lime Dressing", priceRegular: 15, isIncluded: false, sortOrder: 16 },
]

// ============================================================
// DEFAULT ALERT RULES
// ============================================================

const DEFAULT_ALERT_RULES: Omit<AlertRule, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Low Stock Warning",
    type: "LowStock",
    condition: "stock_below_threshold",
    parameters: {},
    isActive: true,
  },
  {
    name: "Monthly Rent Reminder",
    type: "RentDue",
    condition: "monthly_rent_due",
    parameters: { dayOfMonth: 1, reminderDaysBefore: 3 },
    isActive: true,
  },
  {
    name: "Low Daily Revenue Warning",
    type: "RevenueThreshold",
    condition: "daily_revenue_below",
    parameters: { amount: 3000 },
    isActive: true,
  },
  {
    name: "High Daily Revenue Alert",
    type: "RevenueThreshold",
    condition: "daily_revenue_above",
    parameters: { amount: 15000 },
    isActive: true,
  },
  {
    name: "Monthly Expense Budget Warning",
    type: "HighExpense",
    condition: "expense_exceeds_budget",
    parameters: { monthlyBudget: 50000 },
    isActive: true,
  },
  {
    name: "Expiry Warning",
    type: "ExpiryWarning",
    condition: "expiry_within_days",
    parameters: { days: 3 },
    isActive: true,
  },
  {
    name: "Overdue Task Warning",
    type: "TaskDue",
    condition: "task_overdue",
    parameters: {},
    isActive: true,
  },
]

// ============================================================
// DEFAULT APP SETTINGS
// ============================================================

const DEFAULT_SETTINGS: Omit<AppSettings, "id" | "updatedAt">[] = [
  { key: "businessName", value: JSON.stringify("Leafy Life") },
  { key: "securityDeposit", value: JSON.stringify(100000) },
  { key: "minimumGuaranteeRent", value: JSON.stringify(18000) },
  { key: "revenueSharePercent", value: JSON.stringify(20) },
  { key: "currency", value: JSON.stringify("INR") },
  { key: "orderNumberPrefix", value: JSON.stringify("LL") },
]

// ============================================================
// RECIPES - Actual recipe-ingredient mappings per menu item
// Each recipe references ingredients by name (resolved to IDs at seed time)
// ============================================================

interface SeedRecipe {
  menuItemName: string
  sizeVariant?: string
  preparationInstructions: string
  prepTimeMinutes: number
  ingredients: Array<{ ingredientName: string; quantity: number; unit: string; isOptional?: boolean }>
}

const SEED_RECIPES: SeedRecipe[] = [
  // --- SALADS ---
  {
    menuItemName: "Aloo Masti",
    preparationInstructions: "1. Steam and cube potato. 2. Finely chop onion and dice cucumber. 3. Mix chilly flakes & fresh coriander. 4. Toss with sesame seeds. 5. Top with curd dressing.",
    prepTimeMinutes: 8,
    ingredients: [
      { ingredientName: "Potato (Aloo)", quantity: 0.15, unit: "kg" },
      { ingredientName: "Onion", quantity: 0.05, unit: "kg" },
      { ingredientName: "Cucumber", quantity: 0.08, unit: "kg" },
      { ingredientName: "Fresh Coriander", quantity: 0.25, unit: "bunch" },
      { ingredientName: "Green Chilly", quantity: 0.01, unit: "kg" },
      { ingredientName: "White Sesame Seeds", quantity: 0.005, unit: "kg" },
      { ingredientName: "Curd (Dahi)", quantity: 0.03, unit: "kg" },
      { ingredientName: "Salt", quantity: 0.003, unit: "kg" },
      { ingredientName: "Chilly Flakes", quantity: 0.002, unit: "kg" },
    ],
  },
  {
    menuItemName: "Mexican Loaded",
    preparationInstructions: "1. Boil kidney beans until soft. 2. Boil corn kernels. 3. Dice bell peppers. 4. Tear lettuce. 5. Mix all with sesame seeds. 6. Dress with chipotle or chilly lime.",
    prepTimeMinutes: 10,
    ingredients: [
      { ingredientName: "Kidney Beans (Rajma)", quantity: 0.06, unit: "kg" },
      { ingredientName: "Corn", quantity: 0.05, unit: "kg" },
      { ingredientName: "Green Bell Pepper", quantity: 0.04, unit: "kg" },
      { ingredientName: "Yellow/Red Bell Pepper", quantity: 0.03, unit: "kg" },
      { ingredientName: "Lettuce", quantity: 0.06, unit: "kg" },
      { ingredientName: "White Sesame Seeds", quantity: 0.005, unit: "kg" },
      { ingredientName: "Chipotle Sauce", quantity: 0.02, unit: "L" },
      { ingredientName: "Lemon", quantity: 0.02, unit: "kg", isOptional: true },
      { ingredientName: "Salt", quantity: 0.003, unit: "kg" },
    ],
  },
  {
    menuItemName: "Desi Chatpata",
    preparationInstructions: "1. Soak and boil chickpeas. 2. Marinate with chat masala, chilly powder. 3. Air-fry chickpeas until crispy. 4. Dice tomato, cucumber, onion. 5. Tear lettuce. 6. Toss with sesame seeds. 7. Drizzle mint coriander dressing.",
    prepTimeMinutes: 12,
    ingredients: [
      { ingredientName: "Chickpeas (Chole)", quantity: 0.06, unit: "kg" },
      { ingredientName: "Tomato", quantity: 0.05, unit: "kg" },
      { ingredientName: "Cucumber", quantity: 0.05, unit: "kg" },
      { ingredientName: "Onion", quantity: 0.04, unit: "kg" },
      { ingredientName: "Lettuce", quantity: 0.06, unit: "kg" },
      { ingredientName: "White Sesame Seeds", quantity: 0.005, unit: "kg" },
      { ingredientName: "Fresh Mint (Pudina)", quantity: 0.25, unit: "bunch" },
      { ingredientName: "Fresh Coriander", quantity: 0.25, unit: "bunch" },
      { ingredientName: "Chat Masala", quantity: 0.003, unit: "kg" },
      { ingredientName: "Chilly Powder", quantity: 0.002, unit: "kg" },
      { ingredientName: "Salt", quantity: 0.003, unit: "kg" },
    ],
  },
  {
    menuItemName: "Paneer Tikka Salad",
    preparationInstructions: "1. Marinate paneer cubes with curd, chilly, garam masala, coriander powder, salt. 2. Air-fry paneer tikka. 3. Dice bell peppers and onion. 4. Tear lettuce. 5. Assemble with sesame seeds. 6. Top with mint coriander dressing.",
    prepTimeMinutes: 15,
    ingredients: [
      { ingredientName: "Paneer", quantity: 0.1, unit: "kg" },
      { ingredientName: "Curd (Dahi)", quantity: 0.03, unit: "kg" },
      { ingredientName: "Green Bell Pepper", quantity: 0.04, unit: "kg" },
      { ingredientName: "Onion", quantity: 0.04, unit: "kg" },
      { ingredientName: "Lettuce", quantity: 0.06, unit: "kg" },
      { ingredientName: "White Sesame Seeds", quantity: 0.005, unit: "kg" },
      { ingredientName: "Fresh Mint (Pudina)", quantity: 0.25, unit: "bunch" },
      { ingredientName: "Fresh Coriander", quantity: 0.25, unit: "bunch" },
      { ingredientName: "Garam Masala Powder", quantity: 0.002, unit: "kg" },
      { ingredientName: "Coriander Powder", quantity: 0.002, unit: "kg" },
      { ingredientName: "Chilly Powder", quantity: 0.002, unit: "kg" },
      { ingredientName: "Salt", quantity: 0.003, unit: "kg" },
    ],
  },
  {
    menuItemName: "Egg Salad",
    preparationInstructions: "1. Boil eggs, peel and slice. 2. Dice bell peppers and onion. 3. Tear lettuce. 4. Assemble with sesame seeds. 5. Serve with choice of dressing.",
    prepTimeMinutes: 12,
    ingredients: [
      { ingredientName: "Eggs", quantity: 0.17, unit: "dozen" },
      { ingredientName: "Green Bell Pepper", quantity: 0.04, unit: "kg" },
      { ingredientName: "Onion", quantity: 0.04, unit: "kg" },
      { ingredientName: "Lettuce", quantity: 0.06, unit: "kg" },
      { ingredientName: "White Sesame Seeds", quantity: 0.005, unit: "kg" },
      { ingredientName: "Salt", quantity: 0.003, unit: "kg" },
      { ingredientName: "Black Pepper", quantity: 0.001, unit: "kg" },
    ],
  },
  {
    menuItemName: "Protein Salad (Veg)",
    preparationInstructions: "1. Marinate and air-fry paneer tikka. 2. Boil rajma. 3. Steam broccoli and corn. 4. Slice capsicum and onion. 5. Tear lettuce. 6. Assemble all. 7. Dress with mint coriander or chipotle.",
    prepTimeMinutes: 18,
    ingredients: [
      { ingredientName: "Paneer", quantity: 0.08, unit: "kg" },
      { ingredientName: "Kidney Beans (Rajma)", quantity: 0.04, unit: "kg" },
      { ingredientName: "Broccoli", quantity: 0.05, unit: "kg" },
      { ingredientName: "Corn", quantity: 0.04, unit: "kg" },
      { ingredientName: "Capsicum", quantity: 0.04, unit: "kg" },
      { ingredientName: "Onion", quantity: 0.04, unit: "kg" },
      { ingredientName: "Lettuce", quantity: 0.06, unit: "kg" },
      { ingredientName: "Curd (Dahi)", quantity: 0.02, unit: "kg" },
      { ingredientName: "Fresh Mint (Pudina)", quantity: 0.25, unit: "bunch" },
      { ingredientName: "Fresh Coriander", quantity: 0.25, unit: "bunch" },
      { ingredientName: "Garam Masala Powder", quantity: 0.002, unit: "kg" },
      { ingredientName: "Salt", quantity: 0.003, unit: "kg" },
    ],
  },
  {
    menuItemName: "Protein Salad (Veg + Egg)",
    preparationInstructions: "1. Boil eggs and slice. 2. Boil rajma. 3. Steam broccoli and corn. 4. Slice capsicum and onion. 5. Tear lettuce. 6. Assemble all. 7. Dress with mint coriander or chipotle.",
    prepTimeMinutes: 18,
    ingredients: [
      { ingredientName: "Eggs", quantity: 0.17, unit: "dozen" },
      { ingredientName: "Kidney Beans (Rajma)", quantity: 0.04, unit: "kg" },
      { ingredientName: "Broccoli", quantity: 0.05, unit: "kg" },
      { ingredientName: "Corn", quantity: 0.04, unit: "kg" },
      { ingredientName: "Capsicum", quantity: 0.04, unit: "kg" },
      { ingredientName: "Onion", quantity: 0.04, unit: "kg" },
      { ingredientName: "Lettuce", quantity: 0.06, unit: "kg" },
      { ingredientName: "Fresh Mint (Pudina)", quantity: 0.25, unit: "bunch" },
      { ingredientName: "Fresh Coriander", quantity: 0.25, unit: "bunch" },
      { ingredientName: "Salt", quantity: 0.003, unit: "kg" },
    ],
  },

  // --- SOUPS ---
  {
    menuItemName: "Millet & Dry Fruits Soup",
    preparationInstructions: "1. Mix millet & dry fruits powder with hot water. 2. Cook until thick consistency. 3. Season with pepper, salt, oregano. 4. Serve hot.",
    prepTimeMinutes: 8,
    ingredients: [
      { ingredientName: "Millet & Dry Fruits Powder", quantity: 0.04, unit: "kg" },
      { ingredientName: "Almonds", quantity: 0.01, unit: "kg" },
      { ingredientName: "Cashews", quantity: 0.01, unit: "kg" },
      { ingredientName: "Black Pepper", quantity: 0.002, unit: "kg" },
      { ingredientName: "Salt", quantity: 0.003, unit: "kg" },
      { ingredientName: "Oregano", quantity: 0.002, unit: "kg" },
    ],
  },
  {
    menuItemName: "Tomato Soup",
    preparationInstructions: "1. Blanch and puree tomatoes. 2. Cook with garlic. 3. Season with pepper, salt, oregano. 4. Serve hot.",
    prepTimeMinutes: 10,
    ingredients: [
      { ingredientName: "Tomato", quantity: 0.2, unit: "kg" },
      { ingredientName: "Garlic", quantity: 0.01, unit: "kg" },
      { ingredientName: "Olive Oil", quantity: 0.01, unit: "L" },
      { ingredientName: "Black Pepper", quantity: 0.002, unit: "kg" },
      { ingredientName: "Salt", quantity: 0.003, unit: "kg" },
      { ingredientName: "Oregano", quantity: 0.002, unit: "kg" },
    ],
  },
  {
    menuItemName: "Carrot Soup",
    preparationInstructions: "1. Peel and chop carrots. 2. Cook until soft. 3. Blend to smooth puree. 4. Season with pepper, salt, oregano. 5. Serve hot.",
    prepTimeMinutes: 12,
    ingredients: [
      { ingredientName: "Carrot", quantity: 0.2, unit: "kg" },
      { ingredientName: "Garlic", quantity: 0.01, unit: "kg" },
      { ingredientName: "Olive Oil", quantity: 0.01, unit: "L" },
      { ingredientName: "Black Pepper", quantity: 0.002, unit: "kg" },
      { ingredientName: "Salt", quantity: 0.003, unit: "kg" },
      { ingredientName: "Oregano", quantity: 0.002, unit: "kg" },
    ],
  },
  {
    menuItemName: "Pumpkin Soup",
    preparationInstructions: "1. Roast pumpkin chunks. 2. Blend with garlic until smooth. 3. Season with pepper, salt, oregano. 4. Serve hot.",
    prepTimeMinutes: 15,
    ingredients: [
      { ingredientName: "Pumpkin", quantity: 0.2, unit: "kg" },
      { ingredientName: "Garlic", quantity: 0.01, unit: "kg" },
      { ingredientName: "Olive Oil", quantity: 0.01, unit: "L" },
      { ingredientName: "Black Pepper", quantity: 0.002, unit: "kg" },
      { ingredientName: "Salt", quantity: 0.003, unit: "kg" },
      { ingredientName: "Oregano", quantity: 0.002, unit: "kg" },
    ],
  },

  // --- JUICES ---
  {
    menuItemName: "Whey Protein + Water",
    preparationInstructions: "1. Add one scoop whey protein powder to shaker. 2. Add 300ml water. 3. Shake well until mixed. 4. Serve immediately.",
    prepTimeMinutes: 2,
    ingredients: [
      { ingredientName: "Whey Protein Powder", quantity: 0.03, unit: "kg" },
    ],
  },
  {
    menuItemName: "Whey Protein + Milk",
    preparationInstructions: "1. Add one scoop whey protein powder. 2. Add 200ml milk. 3. Blend or shake well. 4. Serve immediately.",
    prepTimeMinutes: 2,
    ingredients: [
      { ingredientName: "Whey Protein Powder", quantity: 0.03, unit: "kg" },
      { ingredientName: "Milk", quantity: 0.2, unit: "L" },
    ],
  },
  {
    menuItemName: "ABC Juice",
    preparationInstructions: "1. Peel and chop apple, beet, and carrot. 2. Juice all together. 3. Strain if needed. 4. Serve fresh.",
    prepTimeMinutes: 5,
    ingredients: [
      { ingredientName: "Apple", quantity: 0.1, unit: "kg" },
      { ingredientName: "Beetroot", quantity: 0.08, unit: "kg" },
      { ingredientName: "Carrot", quantity: 0.08, unit: "kg" },
    ],
  },
  {
    menuItemName: "Millet & Dry Fruits Juice",
    preparationInstructions: "1. Add millet & dry fruits powder to glass. 2. Mix with water or milk. 3. Blend until smooth. 4. Serve immediately.",
    prepTimeMinutes: 3,
    ingredients: [
      { ingredientName: "Millet & Dry Fruits Powder", quantity: 0.04, unit: "kg" },
    ],
  },

  // --- SIDES ---
  {
    menuItemName: "Paneer Tikka",
    preparationInstructions: "1. Cube paneer. 2. Marinate with curd, chilly powder, garam masala, coriander powder, salt. 3. Air-fry until golden. 4. Serve with mint coriander or chipotle.",
    prepTimeMinutes: 15,
    ingredients: [
      { ingredientName: "Paneer", quantity: 0.12, unit: "kg" },
      { ingredientName: "Curd (Dahi)", quantity: 0.03, unit: "kg" },
      { ingredientName: "Chilly Powder", quantity: 0.003, unit: "kg" },
      { ingredientName: "Garam Masala Powder", quantity: 0.002, unit: "kg" },
      { ingredientName: "Coriander Powder", quantity: 0.002, unit: "kg" },
      { ingredientName: "Salt", quantity: 0.003, unit: "kg" },
    ],
  },
  {
    menuItemName: "Paneer 65",
    preparationInstructions: "1. Cube paneer. 2. Marinate with olive oil, chilly powder, garam masala, coriander powder, salt. 3. Air-fry until crispy. 4. Serve with mint coriander or chipotle.",
    prepTimeMinutes: 15,
    ingredients: [
      { ingredientName: "Paneer", quantity: 0.1, unit: "kg" },
      { ingredientName: "Olive Oil", quantity: 0.01, unit: "L" },
      { ingredientName: "Chilly Powder", quantity: 0.003, unit: "kg" },
      { ingredientName: "Garam Masala Powder", quantity: 0.002, unit: "kg" },
      { ingredientName: "Coriander Powder", quantity: 0.002, unit: "kg" },
      { ingredientName: "Salt", quantity: 0.003, unit: "kg" },
    ],
  },

  // --- OATS ---
  {
    menuItemName: "Masala Oats",
    preparationInstructions: "1. Boil water. 2. Add Safola Masala Oats. 3. Stir and cook for 3 minutes. 4. Serve hot.",
    prepTimeMinutes: 5,
    ingredients: [
      { ingredientName: "Safola Masala Oats", quantity: 1, unit: "pack" },
      { ingredientName: "Salt", quantity: 0.002, unit: "kg" },
    ],
  },
  {
    menuItemName: "Masala Paneer Oats",
    preparationInstructions: "1. Boil water. 2. Add Safola Masala Oats. 3. Cube paneer and add. 4. Stir and cook for 3-4 minutes. 5. Serve hot.",
    prepTimeMinutes: 7,
    ingredients: [
      { ingredientName: "Safola Masala Oats", quantity: 1, unit: "pack" },
      { ingredientName: "Paneer", quantity: 0.06, unit: "kg" },
      { ingredientName: "Salt", quantity: 0.002, unit: "kg" },
    ],
  },
  {
    menuItemName: "Masala Egg Oats",
    preparationInstructions: "1. Boil water. 2. Add Safola Masala Oats. 3. Scramble egg and fold in. 4. Cook for 3-4 minutes. 5. Serve hot.",
    prepTimeMinutes: 7,
    ingredients: [
      { ingredientName: "Safola Masala Oats", quantity: 1, unit: "pack" },
      { ingredientName: "Eggs", quantity: 0.08, unit: "dozen" },
      { ingredientName: "Salt", quantity: 0.002, unit: "kg" },
    ],
  },
  {
    menuItemName: "Masala Paneer and Egg Oats",
    preparationInstructions: "1. Boil water. 2. Add Safola Masala Oats. 3. Cube paneer and add. 4. Scramble egg and fold in. 5. Cook for 4 minutes. 6. Serve hot.",
    prepTimeMinutes: 8,
    ingredients: [
      { ingredientName: "Safola Masala Oats", quantity: 1, unit: "pack" },
      { ingredientName: "Paneer", quantity: 0.05, unit: "kg" },
      { ingredientName: "Eggs", quantity: 0.08, unit: "dozen" },
      { ingredientName: "Salt", quantity: 0.002, unit: "kg" },
    ],
  },
  {
    menuItemName: "Fruits and Nuts Milk Oats Bowl",
    preparationInstructions: "1. Heat milk. 2. Cook Quaker multigrain oats in hot milk. 3. Slice banana and apple. 4. Top with almonds, cashews, raisins. 5. Add 7-element mix seeds. 6. Serve warm.",
    prepTimeMinutes: 8,
    ingredients: [
      { ingredientName: "Quaker Multigrain Oats", quantity: 1, unit: "pack" },
      { ingredientName: "Milk", quantity: 0.2, unit: "L" },
      { ingredientName: "Banana", quantity: 0.08, unit: "dozen" },
      { ingredientName: "Apple", quantity: 0.08, unit: "kg" },
      { ingredientName: "Almonds", quantity: 0.01, unit: "kg" },
      { ingredientName: "Cashews", quantity: 0.01, unit: "kg" },
      { ingredientName: "Raisins", quantity: 0.01, unit: "kg" },
      { ingredientName: "7 Elements Mix Seeds", quantity: 0.2, unit: "pack" },
    ],
  },
]

// ============================================================
// SEED FUNCTION
// ============================================================

export async function seedDatabase(): Promise<void> {
  const now = new Date().toISOString()

  const existingItems = await db.menuItems.count()
  const existingSettings = await db.appSettings.count()
  if (existingItems > 0 && existingSettings > 0) return

  await db.transaction(
    "rw",
    [db.menuItems, db.ingredients, db.bowlTemplates, db.bowlComponents, db.alertRules, db.appSettings, db.recipes, db.recipeIngredients, db.tasks],
    async () => {
      // Seed menu items
      const menuItemIds = await db.menuItems.bulkAdd(
        MENU_ITEMS.map((item) => ({ ...item, createdAt: now, updatedAt: now })),
        { allKeys: true }
      )

      // Build name -> ID map for menu items
      const menuItemNameToId: Record<string, number> = {}
      MENU_ITEMS.forEach((item, idx) => {
        menuItemNameToId[item.name] = menuItemIds[idx]!
      })

      // Seed ingredients and build name -> ID map
      const ingredientIds = await db.ingredients.bulkAdd(
        DEFAULT_INGREDIENTS.map((ing) => ({ ...ing, createdAt: now, updatedAt: now })),
        { allKeys: true }
      )
      const ingredientNameToId: Record<string, number> = {}
      DEFAULT_INGREDIENTS.forEach((ing, idx) => {
        ingredientNameToId[ing.name] = ingredientIds[idx]!
      })

      // Seed bowl templates and get their IDs
      const templateIds: number[] = []
      for (const template of BOWL_TEMPLATES) {
        const id = await db.bowlTemplates.add({ ...template, createdAt: now, updatedAt: now })
        templateIds.push(id as number)
      }

      // Seed bowl components with correct template IDs
      await db.bowlComponents.bulkAdd(
        BOWL_COMPONENTS.map(({ templateIndex, ...comp }) => ({
          ...comp,
          bowlTemplateId: templateIds[templateIndex],
          createdAt: now,
        }))
      )

      // Seed alert rules
      await db.alertRules.bulkAdd(
        DEFAULT_ALERT_RULES.map((rule) => ({ ...rule, createdAt: now, updatedAt: now }))
      )

      // Seed app settings (bulkPut to avoid ConstraintError on unique &key)
      await db.appSettings.bulkPut(
        DEFAULT_SETTINGS.map((setting) => ({ ...setting, updatedAt: now }))
      )

      // Seed recipes with ingredient mappings
      for (const seedRecipe of SEED_RECIPES) {
        const menuItemId = menuItemNameToId[seedRecipe.menuItemName]
        if (!menuItemId) continue

        const recipeId = (await db.recipes.add({
          menuItemId,
          name: seedRecipe.menuItemName,
          sizeVariant: (seedRecipe.sizeVariant as any) || undefined,
          preparationInstructions: seedRecipe.preparationInstructions,
          prepTimeMinutes: seedRecipe.prepTimeMinutes,
          createdAt: now,
          updatedAt: now,
        })) as number

        for (const ing of seedRecipe.ingredients) {
          const ingredientId = ingredientNameToId[ing.ingredientName]
          if (!ingredientId) continue
          await db.recipeIngredients.add({
            recipeId,
            ingredientId,
            quantity: ing.quantity,
            unit: ing.unit as any,
            isOptional: ing.isOptional ?? false,
            createdAt: now,
          })
        }
      }
    }
  )
}

// ============================================================
// MIGRATION: Fill storageType/shelfLifeDays for existing installs
// ============================================================

const CATEGORY_STORAGE_DEFAULTS: Record<string, { storageType: StorageType; shelfLifeDays: number }> = {
  "Greens": { storageType: "Refrigerator", shelfLifeDays: 3 },
  "Vegetables": { storageType: "Refrigerator", shelfLifeDays: 7 },
  "Fruits": { storageType: "Room Temperature", shelfLifeDays: 5 },
  "Proteins": { storageType: "Refrigerator", shelfLifeDays: 7 },
  "Grains & Cereals": { storageType: "Room Temperature", shelfLifeDays: 180 },
  "Dairy": { storageType: "Refrigerator", shelfLifeDays: 3 },
  "Dressings & Sauces": { storageType: "Refrigerator", shelfLifeDays: 30 },
  "Toppings & Seeds": { storageType: "Room Temperature", shelfLifeDays: 180 },
  "Spices & Seasonings": { storageType: "Room Temperature", shelfLifeDays: 180 },
  "Oils": { storageType: "Room Temperature", shelfLifeDays: 365 },
  "Beverages & Powders": { storageType: "Room Temperature", shelfLifeDays: 180 },
  "Other": { storageType: "Room Temperature", shelfLifeDays: 30 },
}

export async function migrateIngredientDefaults(): Promise<void> {
  const all = await db.ingredients.toArray()
  const toUpdate = all.filter((ing) => !ing.storageType || !ing.shelfLifeDays)

  const now = new Date().toISOString()

  if (toUpdate.length > 0) {
  await Promise.all(
    toUpdate.map((ing) => {
      const defaults = CATEGORY_STORAGE_DEFAULTS[ing.category] ?? CATEGORY_STORAGE_DEFAULTS["Other"]
      return db.ingredients.update(ing.id!, {
        storageType: ing.storageType ?? defaults.storageType,
        shelfLifeDays: ing.shelfLifeDays ?? defaults.shelfLifeDays,
        updatedAt: now,
      })
    })
  )
  }

  // Ensure the task_overdue alert rule exists
  const taskRule = await db.alertRules.filter((r) => r.condition === "task_overdue").first()
  if (!taskRule) {
    await db.alertRules.add({
      name: "Overdue Task Warning",
      type: "TaskDue",
      condition: "task_overdue",
      parameters: {},
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  }

  // Also ensure the ExpiryWarning alert rule exists
  const expiryRule = await db.alertRules.filter((r) => r.condition === "expiry_within_days").first()
  if (!expiryRule) {
    await db.alertRules.add({
      name: "Expiry Warning",
      type: "ExpiryWarning",
      condition: "expiry_within_days",
      parameters: { days: 3 },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
  }
}
