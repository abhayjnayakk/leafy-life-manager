export const INGREDIENT_CATEGORIES = [
  "Greens",
  "Vegetables",
  "Fruits",
  "Proteins",
  "Grains & Cereals",
  "Dairy",
  "Dressings & Sauces",
  "Toppings & Seeds",
  "Spices & Seasonings",
  "Oils",
  "Beverages & Powders",
  "Other",
] as const

export const INGREDIENT_UNITS = [
  "kg",
  "g",
  "L",
  "ml",
  "pcs",
  "dozen",
  "bunch",
  "pack",
] as const

export const MENU_CATEGORIES = [
  "Salads",
  "Soups",
  "Juices",
  "Sides",
  "Oats",
  "Custom Salad Bowl",
  "Custom Rice Bowl",
] as const

export const STORAGE_TYPES = [
  "Refrigerator",
  "Room Temperature",
  "Freezer",
] as const

export const SIZE_OPTIONS = ["Regular", "Large"] as const

export const ORDER_TYPES = ["DineIn", "Delivery"] as const

export const PAYMENT_METHODS = ["Cash", "UPI", "Card"] as const

export const EXPENSE_CATEGORIES = [
  "Rent",
  "RevenueShare",
  "Electricity",
  "Water",
  "Ingredients",
  "Equipment",
  "Salaries",
  "Marketing",
  "Maintenance",
  "Other",
] as const

export const ALERT_TYPES = [
  "LowStock",
  "RentDue",
  "RevenueThreshold",
  "HighExpense",
  "ExpiryWarning",
  "Custom",
] as const

export const ALERT_SEVERITIES = ["low", "medium", "high", "critical"] as const

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Orders", href: "/orders", icon: "ShoppingCart" },
  { label: "Inventory", href: "/inventory", icon: "Package" },
  { label: "Recipes", href: "/recipes", icon: "BookOpen" },
  { label: "Finance", href: "/finance", icon: "IndianRupee" },
] as const
