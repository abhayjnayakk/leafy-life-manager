"use client"

import { useState, useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/client"
import {
  ChevronDown,
  Plus,
  Trash2,
  Search,
  ChefHat,
  Leaf,
  UtensilsCrossed,
  X,
  Timer,
  IndianRupee,
  ArrowRight,
  Droplets,
  ListChecks,
  CookingPot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MENU_CATEGORIES, INGREDIENT_UNITS } from "@/lib/constants"
import { formatINR } from "@/lib/format"
import {
  addRecipe,
  addRecipeIngredient,
  deleteRecipe,
} from "@/lib/services/recipes"
import type { MenuItem, Recipe, IngredientUnit } from "@/lib/db/schema"
import { toast } from "sonner"
import {
  AnimatedPage,
  StaggerGroup,
  StaggerItem,
  AnimatedCollapse,
} from "@/components/ui/animated"
import { motion } from "framer-motion"
import {
  RECIPE_CONTENT,
  type RecipeContent,
  type PrepFlow,
  type DressingOption,
} from "@/lib/recipe-content"

// ============================================================
// PILL COLORS
// ============================================================
const INGREDIENT_PILL_COLORS = [
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
]

function getPillColor(index: number) {
  return INGREDIENT_PILL_COLORS[index % INGREDIENT_PILL_COLORS.length]
}

// ============================================================
// VISUAL FLOW DIAGRAM COMPONENT
// ============================================================
function FlowDiagram({ flow }: { flow: PrepFlow }) {
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      <span className="text-[10px] font-semibold text-primary mr-1.5 shrink-0">
        {flow.subject}:
      </span>
      {flow.steps.map((step, i) => (
        <div key={i} className="flex items-center gap-0.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium border border-primary/20">
            {step}
          </span>
          {i < flow.steps.length - 1 && (
            <ArrowRight className="h-3 w-3 text-primary/50 shrink-0" />
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================================
// DRESSING CARD COMPONENT
// ============================================================
function DressingCard({ dressing }: { dressing: DressingOption }) {
  return (
    <div
      className={`rounded-lg border p-2 text-xs ${dressing.isOptional ? "border-dashed opacity-70" : "bg-amber-50/50 border-amber-200/50 dark:bg-amber-950/20 dark:border-amber-800/30"}`}
    >
      <div className="flex items-center gap-1.5 font-medium">
        <Droplets className="h-3 w-3 text-amber-600 dark:text-amber-400" />
        {dressing.name}
        {dressing.isOptional && (
          <span className="text-[9px] text-muted-foreground">(optional)</span>
        )}
      </div>
      {dressing.recipe && (
        <p className="text-muted-foreground mt-0.5 leading-relaxed pl-[18px]">
          {dressing.recipe}
        </p>
      )}
    </div>
  )
}

// ============================================================
// SKELETON
// ============================================================
function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-4 w-12 bg-muted rounded-full" />
      </div>
      <div className="h-3 w-48 bg-muted rounded mt-2" />
      <div className="flex gap-2 mt-3">
        <div className="h-5 w-16 bg-muted rounded-full" />
        <div className="h-5 w-20 bg-muted rounded-full" />
      </div>
    </div>
  )
}

// ============================================================
// CUSTOM BOWL DISPLAY
// ============================================================
function CustomBowlDisplay({ type }: { type: "SaladBowl" | "RiceBowl" }) {
  const template = useLiveQuery(
    () => db.bowlTemplates.filter((t) => t.type === type).first(),
    [type]
  )
  const components = useLiveQuery(
    async () => {
      if (!template?.id) return []
      return db.bowlComponents
        .where("bowlTemplateId")
        .equals(template.id)
        .sortBy("sortOrder")
    },
    [template?.id]
  )

  if (!template || !components) return null

  const grouped = (components ?? []).reduce(
    (acc, c) => {
      if (!acc[c.componentType]) acc[c.componentType] = []
      acc[c.componentType].push(c)
      return acc
    },
    {} as Record<string, typeof components>
  )

  const stepLabels: Record<string, { num: number; title: string; subtitle: string }> = type === "SaladBowl"
    ? {
        Base: { num: 1, title: "Choose Your Base", subtitle: "Included in base price" },
        Protein: { num: 2, title: "Choose Your Protein", subtitle: "Select one" },
        Vegetable: { num: 3, title: "Add Extra Veggies", subtitle: "Optional \u2013 multiple allowed" },
        Dressing: { num: 4, title: "Choose Your Dressing", subtitle: "Select one \u2013 included" },
        Topping: { num: 5, title: "Add Toppings", subtitle: "Optional" },
      }
    : {
        Protein: { num: 1, title: "Choose Your Protein", subtitle: "Select one or multiple" },
        Vegetable: { num: 2, title: "Add Veggies", subtitle: "Optional \u2013 multiple allowed" },
        Topping: { num: 3, title: "Add Premium Toppings", subtitle: "Optional" },
        Dressing: { num: 4, title: "Choose Dressing", subtitle: "Optional" },
      }

  return (
    <div className="space-y-3">
      {/* Base price header */}
      <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
        <div className="text-sm font-semibold text-primary flex items-center gap-2">
          <CookingPot className="h-4 w-4" />
          Base Price:{" "}
          {formatINR(template.basePriceRegular)}
          {template.basePriceLarge && ` (Regular) | ${formatINR(template.basePriceLarge)} (Large)`}
        </div>
        {type === "RiceBowl" && (
          <p className="text-xs text-muted-foreground mt-1">
            Includes Herb Rice + Signature Sauce
          </p>
        )}
      </div>

      {/* Steps */}
      {Object.entries(stepLabels).map(([compType, meta]) => {
        const items = grouped[compType]
        if (!items || items.length === 0) return null
        return (
          <div key={compType} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                {meta.num}
              </span>
              <div>
                <span className="text-xs font-semibold">{meta.title}</span>
                <span className="text-[10px] text-muted-foreground ml-1.5">
                  {meta.subtitle}
                </span>
              </div>
            </div>
            <div className="ml-7 grid gap-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border bg-background px-2.5 py-1.5 text-xs"
                >
                  <span className="font-medium">{item.name}</span>
                  <div className="flex gap-2 text-muted-foreground shrink-0">
                    {item.isIncluded ? (
                      <Badge variant="secondary" className="text-[9px] rounded-full px-1.5 py-0">
                        Included
                      </Badge>
                    ) : (
                      <>
                        <span>+{formatINR(item.priceRegular)}</span>
                        {item.priceLarge !== undefined &&
                          item.priceLarge !== item.priceRegular && (
                            <span className="text-muted-foreground/60">
                              / +{formatINR(item.priceLarge)}
                            </span>
                          )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function RecipesPage() {
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null)
  const [addRecipeOpen, setAddRecipeOpen] = useState(false)
  const [addRecipeItem, setAddRecipeItem] = useState<MenuItem | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>(
    MENU_CATEGORIES[0]
  )
  const [search, setSearch] = useState("")

  const menuItems = useLiveQuery(() => db.menuItems.toArray(), [])
  const allRecipes = useLiveQuery(() => db.recipes.toArray(), [])

  const recipeCounts = useMemo(() => {
    if (!allRecipes) return {}
    const counts: Record<number, number> = {}
    for (const r of allRecipes) {
      counts[r.menuItemId] = (counts[r.menuItemId] || 0) + 1
    }
    return counts
  }, [allRecipes])

  const totalRecipeCount = allRecipes?.length ?? 0

  const grouped = (menuItems ?? []).reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, MenuItem[]>
  )

  const currentItems = grouped[activeCategory] ?? []

  const filteredItems = useMemo(() => {
    if (!search.trim()) return currentItems
    const q = search.toLowerCase()
    return currentItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false)
    )
  }, [currentItems, search])

  const isLoading = menuItems === undefined
  const isCustomBowl =
    activeCategory === "Custom Salad Bowl" ||
    activeCategory === "Custom Rice Bowl"

  return (
    <AnimatedPage className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-primary" />
          Recipes
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {totalRecipeCount} recipe{totalRecipeCount !== 1 ? "s" : ""} across{" "}
          {menuItems?.length ?? 0} menu items
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search menu items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl h-9 text-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {MENU_CATEGORIES.map((cat) => {
          const catItemCount = grouped[cat]?.length ?? 0
          return (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat)
                setExpandedItemId(null)
                setSearch("")
              }}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
              <span
                className={`text-[10px] ${
                  activeCategory === cat
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground/60"
                }`}
              >
                {catItemCount}
              </span>
            </button>
          )
        })}
      </div>

      {/* Custom Bowl builder display */}
      {isCustomBowl && !search && (
        <div className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
            <CookingPot className="h-4 w-4 text-primary" />
            {activeCategory === "Custom Salad Bowl"
              ? "Custom Salad Bowl Builder"
              : "Custom Rice Bowl Builder"}
          </h2>
          <CustomBowlDisplay
            type={
              activeCategory === "Custom Salad Bowl"
                ? "SaladBowl"
                : "RiceBowl"
            }
          />
        </div>
      )}

      {/* Menu items list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <UtensilsCrossed className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">
            {search
              ? "No items match your search"
              : "No items in this category"}
          </p>
          {search && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs rounded-full"
              onClick={() => setSearch("")}
            >
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <StaggerGroup className="space-y-2" key={activeCategory + search}>
          {filteredItems.map((item) => (
            <StaggerItem key={item.id}>
              <MenuItemCard
                item={item}
                recipeCount={recipeCounts[item.id!] ?? 0}
                expanded={expandedItemId === item.id}
                onToggle={() =>
                  setExpandedItemId(
                    expandedItemId === item.id ? null : item.id!
                  )
                }
                onAddRecipe={() => {
                  setAddRecipeItem(item)
                  setAddRecipeOpen(true)
                }}
              />
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}

      {addRecipeOpen && addRecipeItem && (
        <AddRecipeDialog
          menuItem={addRecipeItem}
          onClose={() => {
            setAddRecipeOpen(false)
            setAddRecipeItem(null)
          }}
        />
      )}
    </AnimatedPage>
  )
}

// ============================================================
// MENU ITEM CARD
// ============================================================
function MenuItemCard({
  item,
  recipeCount,
  expanded,
  onToggle,
  onAddRecipe,
}: {
  item: MenuItem
  recipeCount: number
  expanded: boolean
  onToggle: () => void
  onAddRecipe: () => void
}) {
  const recipes = useLiveQuery(
    () =>
      expanded
        ? db.recipes.where("menuItemId").equals(item.id!).toArray()
        : Promise.resolve([] as Recipe[]),
    [item.id, expanded]
  )

  const content = RECIPE_CONTENT[item.name]

  const priceRange =
    item.sizes.length === 1
      ? formatINR(item.sizes[0].dineInPrice ?? item.sizes[0].price)
      : `${formatINR(item.sizes[0].dineInPrice ?? item.sizes[0].price)} \u2013 ${formatINR(item.sizes[item.sizes.length - 1].price)}`

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{item.name}</span>
            {item.isCustomizable && (
              <Badge
                variant="outline"
                className="text-[10px] rounded-full px-1.5 py-0 border-primary/30 text-primary"
              >
                Custom
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {item.description}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{priceRange}</span>
            {content && (
              <span className="flex items-center gap-1">
                <Leaf className="h-3 w-3" />
                {content.mainIngredients.length} items
              </span>
            )}
            {content && content.dressings.length > 0 && (
              <span className="flex items-center gap-1">
                <Droplets className="h-3 w-3" />
                {content.dressings.length} dressing
                {content.dressings.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 ml-2"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatedCollapse open={expanded}>
        <div className="border-t px-3 pb-3 pt-2 space-y-3">
          {/* Sizes & Pricing */}
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Pricing (Dine-in / Delivery)
            </div>
            <div className="flex gap-2 flex-wrap">
              {item.sizes.map((s) => (
                <Badge
                  key={s.size}
                  variant="secondary"
                  className="rounded-full text-[11px]"
                >
                  {s.size}: {formatINR(s.dineInPrice ?? s.price)} /{" "}
                  {formatINR(s.price)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Rich Content Section */}
          {content && (
            <>
              {/* Main Ingredients */}
              <div>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Leaf className="h-3 w-3" />
                  Ingredients
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {content.mainIngredients.map((ing, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${getPillColor(idx)}`}
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preparation Flow Diagrams */}
              {content.prepFlows.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    Preparation Flow
                  </div>
                  <div className="space-y-1.5">
                    {content.prepFlows.map((flow, idx) => (
                      <FlowDiagram key={idx} flow={flow} />
                    ))}
                  </div>
                </div>
              )}

              {/* Dressings */}
              {content.dressings.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Droplets className="h-3 w-3" />
                    Dressings
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {content.dressings.map((d, idx) => (
                      <DressingCard key={idx} dressing={d} />
                    ))}
                  </div>
                </div>
              )}

              {/* Step-by-step */}
              <div>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <ListChecks className="h-3 w-3" />
                  Steps
                </div>
                <div className="space-y-1">
                  {content.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs"
                    >
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-muted-foreground text-[9px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-medium">{step.label}</span>
                        {step.detail && (
                          <span className="text-muted-foreground ml-1">
                            ({step.detail})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* DB Recipes section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Saved Recipes ({recipes?.length ?? 0})
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 rounded-full text-xs px-3"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddRecipe()
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            {(recipes ?? []).length === 0 ? (
              !content && (
                <div className="text-center py-3 border border-dashed rounded-lg">
                  <ChefHat className="h-5 w-5 mx-auto text-muted-foreground/40 mb-1" />
                  <p className="text-[11px] text-muted-foreground">
                    No recipes yet. Add one to track ingredient quantities &
                    costs.
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-2">
                {(recipes ?? []).map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
          </div>
        </div>
      </AnimatedCollapse>
    </div>
  )
}

// ============================================================
// RECIPE CARD (DB stored recipes with quantities)
// ============================================================
function RecipeCard({ recipe }: { recipe: Recipe }) {
  const ingredientsData = useLiveQuery(
    async () => {
      const recipeIngs = await db.recipeIngredients
        .where("recipeId")
        .equals(recipe.id!)
        .toArray()
      return Promise.all(
        recipeIngs.map(async (ri) => {
          const ing = await db.ingredients.get(ri.ingredientId)
          return { ...ri, ingredient: ing }
        })
      )
    },
    [recipe.id]
  )

  const costPerServing = useMemo(() => {
    if (!ingredientsData) return null
    let total = 0
    for (const ri of ingredientsData) {
      if (ri.ingredient) {
        total += ri.quantity * ri.ingredient.costPerUnit
      }
    }
    return total
  }, [ingredientsData])

  return (
    <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-xs">{recipe.name}</span>
            {recipe.sizeVariant && (
              <Badge
                variant="outline"
                className="text-[9px] rounded-full px-1.5 py-0"
              >
                {recipe.sizeVariant}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
            {recipe.prepTimeMinutes && (
              <span className="flex items-center gap-0.5">
                <Timer className="h-2.5 w-2.5" />
                {recipe.prepTimeMinutes}m
              </span>
            )}
            {costPerServing !== null && costPerServing > 0 && (
              <span className="flex items-center gap-0.5">
                <IndianRupee className="h-2.5 w-2.5" />
                {formatINR(Math.round(costPerServing))} cost
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Leaf className="h-2.5 w-2.5" />
              {ingredientsData?.length ?? 0} items
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive h-6 w-6 p-0 rounded-lg shrink-0"
          onClick={async () => {
            await deleteRecipe(recipe.id!)
            toast.success("Recipe deleted")
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {(ingredientsData ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(ingredientsData ?? []).map((ing, idx) => (
            <span
              key={ing.id}
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${getPillColor(idx)} ${ing.isOptional ? "opacity-60 border border-dashed" : ""}`}
            >
              {ing.ingredient?.name ?? "?"}
              <span className="opacity-70">
                {ing.quantity}
                {ing.unit}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// ADD RECIPE DIALOG
// ============================================================
function AddRecipeDialog({
  menuItem,
  onClose,
}: {
  menuItem: MenuItem
  onClose: () => void
}) {
  const [name, setName] = useState(menuItem.name)
  const [instructions, setInstructions] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [sizeVariant, setSizeVariant] = useState<string>(
    menuItem.sizes[0]?.size ?? ""
  )
  const [recipeIngredients, setRecipeIngredients] = useState<
    Array<{
      ingredientId: number
      quantity: number
      unit: IngredientUnit
      isOptional: boolean
    }>
  >([])
  const [selIngId, setSelIngId] = useState("")
  const [selQty, setSelQty] = useState("")
  const [selUnit, setSelUnit] = useState<IngredientUnit>("g")
  const [selOptional, setSelOptional] = useState(false)

  const allIngredients = useLiveQuery(() =>
    db.ingredients.orderBy("name").toArray(),
    []
  )

  const estimatedCost = useMemo(() => {
    if (!allIngredients) return 0
    let total = 0
    for (const ri of recipeIngredients) {
      const ing = allIngredients.find((i) => i.id === ri.ingredientId)
      if (ing) total += ri.quantity * ing.costPerUnit
    }
    return total
  }, [recipeIngredients, allIngredients])

  function handleAddIngredient() {
    if (!selIngId || !selQty) return
    const qty = parseFloat(selQty)
    if (isNaN(qty) || qty <= 0) return
    if (
      recipeIngredients.some(
        (ri) => ri.ingredientId === parseInt(selIngId)
      )
    ) {
      toast.error("Ingredient already added")
      return
    }
    setRecipeIngredients((prev) => [
      ...prev,
      {
        ingredientId: parseInt(selIngId),
        quantity: qty,
        unit: selUnit,
        isOptional: selOptional,
      },
    ])
    setSelIngId("")
    setSelQty("")
    setSelOptional(false)
  }

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Recipe name is required")
      return
    }
    const pt = prepTime ? parseInt(prepTime) : undefined
    const recipeId = await addRecipe({
      menuItemId: menuItem.id!,
      name: name.trim(),
      sizeVariant: sizeVariant as any,
      preparationInstructions: instructions.trim() || undefined,
      prepTimeMinutes: pt,
    })
    for (const ri of recipeIngredients) {
      await addRecipeIngredient({
        recipeId,
        ingredientId: ri.ingredientId,
        quantity: ri.quantity,
        unit: ri.unit,
        isOptional: ri.isOptional,
      })
    }
    toast.success("Recipe created")
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-primary" />
            Add Recipe for {menuItem.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Recipe Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Size Variant</Label>
              <Select value={sizeVariant} onValueChange={setSizeVariant}>
                <SelectTrigger className="rounded-lg h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {menuItem.sizes.map((s) => (
                    <SelectItem key={s.size} value={s.size}>
                      {s.size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Prep Time (min)
              </Label>
              <Input
                type="number"
                min="1"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="e.g. 10"
                className="rounded-lg h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                Est. Cost
              </Label>
              <div className="h-9 rounded-lg border bg-muted/50 px-3 flex items-center text-sm font-medium">
                {formatINR(Math.round(estimatedCost))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Preparation Instructions</Label>
            <textarea
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Step by step instructions..."
            />
          </div>

          <div className="border-t pt-3 space-y-3">
            <Label className="text-xs">Ingredients</Label>
            <div className="flex gap-2 flex-wrap">
              <Select value={selIngId} onValueChange={setSelIngId}>
                <SelectTrigger className="flex-1 min-w-[140px] rounded-lg h-9 text-sm">
                  <SelectValue placeholder="Select ingredient" />
                </SelectTrigger>
                <SelectContent>
                  {(allIngredients ?? []).map((ing) => (
                    <SelectItem key={ing.id} value={String(ing.id)}>
                      {ing.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={selQty}
                onChange={(e) => setSelQty(e.target.value)}
                placeholder="Qty"
                className="w-20 rounded-lg h-9 text-sm"
              />
              <Select
                value={selUnit}
                onValueChange={(v) => setSelUnit(v as IngredientUnit)}
              >
                <SelectTrigger className="w-20 rounded-lg h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INGREDIENT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg h-9 px-3"
                onClick={handleAddIngredient}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={selOptional}
                onChange={(e) => setSelOptional(e.target.checked)}
                className="rounded"
              />
              Mark next ingredient as optional
            </label>

            {recipeIngredients.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recipeIngredients.map((ri, idx) => {
                  const ing = (allIngredients ?? []).find(
                    (i) => i.id === ri.ingredientId
                  )
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-1 py-0.5 text-[11px] font-medium ${getPillColor(idx)} ${ri.isOptional ? "opacity-60 border border-dashed" : ""}`}
                    >
                      {ing?.name ?? "Unknown"}
                      <span className="opacity-70">
                        {ri.quantity}
                        {ri.unit}
                      </span>
                      {ri.isOptional && (
                        <span className="text-[9px] opacity-50">(opt)</span>
                      )}
                      <button
                        className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        onClick={() =>
                          setRecipeIngredients((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          <Button className="w-full rounded-xl h-10" onClick={handleSubmit}>
            <ChefHat className="h-4 w-4 mr-2" />
            Create Recipe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
