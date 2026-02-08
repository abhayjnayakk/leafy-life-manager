"use client"

import { useState } from "react"
import { useSupaIngredients } from "@/lib/hooks/useSupaIngredients"
import { Plus, Search, Minus, Trash2, Package, Snowflake, Sun, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { INGREDIENT_CATEGORIES, INGREDIENT_UNITS, STORAGE_TYPES } from "@/lib/constants"
import { formatINR } from "@/lib/format"
import {
  addIngredient,
  updateStock,
  deleteIngredient,
} from "@/lib/services/inventory"
import type { Ingredient, IngredientCategory, IngredientUnit, StorageType } from "@/lib/db/schema"
import { toast } from "sonner"
import { AnimatedPage, StaggerGroup, StaggerItem } from "@/components/ui/animated"
import { motion } from "framer-motion"
import { differenceInDays, parseISO } from "date-fns"

type ViewMode = "category" | "storage"

export default function InventoryPage() {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("category")

  const { ingredients: allIngredients } = useSupaIngredients()

  const filtered = (allIngredients ?? [])
    .filter((ing) => {
      const matchesSearch = ing.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory =
        viewMode === "storage" || categoryFilter === "all" || ing.category === categoryFilter
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      // Expired first, then expiring soon, then low stock
      const aExpiry = getExpiryDaysLeft(a)
      const bExpiry = getExpiryDaysLeft(b)
      if (aExpiry !== null && bExpiry !== null) {
        if (aExpiry < 0 && bExpiry >= 0) return -1
        if (bExpiry < 0 && aExpiry >= 0) return 1
      }
      const aLow = a.currentStock <= a.minimumThreshold ? 0 : 1
      const bLow = b.currentStock <= b.minimumThreshold ? 0 : 1
      if (aLow !== bLow) return aLow - bLow
      return a.name.localeCompare(b.name)
    })

  const lowStockCount = filtered.filter(
    (i) => i.currentStock <= i.minimumThreshold
  ).length

  const expiringCount = filtered.filter((i) => {
    const d = getExpiryDaysLeft(i)
    return d !== null && d <= 3
  }).length

  const categories = ["all", ...INGREDIENT_CATEGORIES]

  // Group by storage for storage view
  const storageGroups = viewMode === "storage" ? groupByStorage(filtered) : null

  return (
    <AnimatedPage className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {filtered.length} items
            {lowStockCount > 0 && (
              <span className="text-destructive"> · {lowStockCount} low</span>
            )}
            {expiringCount > 0 && (
              <span className="text-orange-500"> · {expiringCount} expiring</span>
            )}
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-xl">
            <DialogHeader>
              <DialogTitle>Add Ingredient</DialogTitle>
            </DialogHeader>
            <AddIngredientForm onSuccess={() => setAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg bg-muted p-0.5 gap-0.5">
          {(["category", "storage"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`relative rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                viewMode === mode
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "category" ? "By Category" : "By Storage"}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter chips (only in category view) */}
      {viewMode === "category" && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      )}

      {/* Cards */}
      {filtered.length > 0 ? (
        viewMode === "storage" && storageGroups ? (
          <div className="space-y-4">
            {(["Refrigerator", "Freezer", "Room Temperature"] as StorageType[]).map((st) => {
              const items = storageGroups[st]
              if (!items || items.length === 0) return null
              return (
                <div key={st}>
                  <div className="flex items-center gap-2 mb-2">
                    <StorageIcon type={st} className="h-4 w-4" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {st} ({items.length})
                    </h3>
                  </div>
                  <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {items.map((ing) => (
                      <StaggerItem key={ing.id}>
                        <IngredientCard
                          ingredient={ing}
                          onDelete={async () => {
                            await deleteIngredient(String(ing.id!))
                            toast.success(`Deleted ${ing.name}`)
                          }}
                        />
                      </StaggerItem>
                    ))}
                  </StaggerGroup>
                </div>
              )
            })}
          </div>
        ) : (
          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filtered.map((ing) => (
              <StaggerItem key={ing.id}>
                <IngredientCard
                  ingredient={ing}
                  onDelete={async () => {
                    await deleteIngredient(String(ing.id!))
                    toast.success(`Deleted ${ing.name}`)
                  }}
                />
              </StaggerItem>
            ))}
          </StaggerGroup>
        )
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No ingredients found
        </div>
      )}
    </AnimatedPage>
  )
}

// ============================================================
// Helpers
// ============================================================

function getExpiryDaysLeft(ing: Ingredient): number | null {
  if (!ing.expiryDate) return null
  try {
    return differenceInDays(parseISO(ing.expiryDate), new Date())
  } catch {
    return null
  }
}

function groupByStorage(items: Ingredient[]): Record<string, Ingredient[]> {
  const groups: Record<string, Ingredient[]> = {}
  for (const item of items) {
    const st = item.storageType ?? "Room Temperature"
    if (!groups[st]) groups[st] = []
    groups[st].push(item)
  }
  return groups
}

function StorageIcon({ type, className }: { type: StorageType; className?: string }) {
  if (type === "Refrigerator" || type === "Freezer") {
    return <Snowflake className={`${className} text-blue-500`} />
  }
  return <Sun className={`${className} text-amber-500`} />
}

function ExpiryBadge({ ingredient }: { ingredient: Ingredient }) {
  const daysLeft = getExpiryDaysLeft(ingredient)
  if (daysLeft === null || daysLeft > 7) return null

  if (daysLeft < 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold px-2 py-0.5">
        Expired {Math.abs(daysLeft)}d ago
      </span>
    )
  }
  if (daysLeft <= 1) {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold px-2 py-0.5">
        {daysLeft === 0 ? "Expires today" : "Expires tomorrow"}
      </span>
    )
  }
  if (daysLeft <= 3) {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-500/10 text-orange-600 text-[10px] font-semibold px-2 py-0.5">
        {daysLeft}d left
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5">
      {daysLeft}d left
    </span>
  )
}

// ============================================================
// Stock progress bar color logic
// ============================================================
function getStockColor(current: number, threshold: number): string {
  if (threshold === 0) return "bg-emerald-500"
  const ratio = current / threshold
  if (ratio <= 1) return "bg-destructive"
  if (ratio <= 2) return "bg-amber-500"
  return "bg-emerald-500"
}

function getStockPercent(current: number, threshold: number): number {
  if (threshold === 0) return current > 0 ? 100 : 0
  const ratio = current / (threshold * 3)
  return Math.min(Math.max(ratio * 100, 0), 100)
}

// ============================================================
// Ingredient Card with inline restock stepper
// ============================================================
function IngredientCard({
  ingredient: ing,
  onDelete,
}: {
  ingredient: Ingredient
  onDelete: () => void
}) {
  const isLow = ing.currentStock <= ing.minimumThreshold
  const [restocking, setRestocking] = useState(false)
  const [restockQty, setRestockQty] = useState(1)

  async function handleRestock() {
    if (restockQty <= 0) return
    await updateStock(String(ing.id!), ing.currentStock + restockQty)
    toast.success(`Restocked ${ing.name} by ${restockQty} ${ing.unit}`)
    setRestocking(false)
    setRestockQty(1)
  }

  return (
    <div
      className={`rounded-xl border p-3 space-y-2 transition-colors ${
        isLow ? "border-destructive/20" : ""
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{ing.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            {ing.category}
            {ing.storageType && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <StorageIcon type={ing.storageType} className="h-3 w-3" />
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ExpiryBadge ingredient={ing} />
          {isLow && (
            <span className="rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold px-2 py-0.5">
              Low
            </span>
          )}
        </div>
      </div>

      {/* Stock progress bar */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between text-xs">
          <span className={isLow ? "text-destructive font-medium" : "font-medium"}>
            {ing.currentStock} {ing.unit}
          </span>
          <span className="text-muted-foreground">
            min {ing.minimumThreshold}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${getStockColor(ing.currentStock, ing.minimumThreshold)}`}
            initial={{ width: 0 }}
            animate={{ width: `${getStockPercent(ing.currentStock, ing.minimumThreshold)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Compact info row */}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{formatINR(ing.costPerUnit)}/{ing.unit}</span>
        {ing.shelfLifeDays && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span>{ing.shelfLifeDays}d shelf life</span>
          </>
        )}
      </div>

      {/* Actions */}
      {!restocking ? (
        <div className="flex gap-2 pt-0.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs rounded-lg"
            onClick={() => {
              setRestocking(true)
              setRestockQty(1)
            }}
          >
            Restock
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-2 pt-0.5"
        >
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 rounded-lg"
              onClick={() => setRestockQty(Math.max(1, restockQty - 1))}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <Input
              type="number"
              min="1"
              step="1"
              value={restockQty}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                if (!isNaN(v) && v > 0) setRestockQty(v)
              }}
              className="h-7 w-16 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0 rounded-lg"
              onClick={() => setRestockQty(restockQty + 1)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground">{ing.unit}</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-7 text-xs rounded-lg"
              onClick={handleRestock}
            >
              Add {restockQty} {ing.unit}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs rounded-lg"
              onClick={() => setRestocking(false)}
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ============================================================
// Add ingredient form with storage & shelf life
// ============================================================
function AddIngredientForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState<IngredientCategory>("Vegetables")
  const [unit, setUnit] = useState<IngredientUnit>("kg")
  const [stock, setStock] = useState("")
  const [threshold, setThreshold] = useState("")
  const [cost, setCost] = useState("")
  const [storageType, setStorageType] = useState<StorageType>("Refrigerator")
  const [shelfLifeDays, setShelfLifeDays] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !stock || !threshold || !cost) return

    await addIngredient({
      name: name.trim(),
      category,
      unit,
      currentStock: parseFloat(stock),
      minimumThreshold: parseFloat(threshold),
      costPerUnit: parseFloat(cost),
      storageType,
      shelfLifeDays: shelfLifeDays ? parseInt(shelfLifeDays) : undefined,
    })
    toast.success(`Added ${name.trim()}`)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Name
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Paneer"
          required
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Category
          </Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as IngredientCategory)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INGREDIENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Unit
          </Label>
          <Select
            value={unit}
            onValueChange={(v) => setUnit(v as IngredientUnit)}
          >
            <SelectTrigger>
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
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Current Stock
          </Label>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Min Threshold
          </Label>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Cost/Unit (Rs)
          </Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Storage Type
          </Label>
          <Select
            value={storageType}
            onValueChange={(v) => setStorageType(v as StorageType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STORAGE_TYPES.map((st) => (
                <SelectItem key={st} value={st}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Shelf Life (days)
          </Label>
          <Input
            type="number"
            min="1"
            step="1"
            value={shelfLifeDays}
            onChange={(e) => setShelfLifeDays(e.target.value)}
            placeholder="e.g., 7"
          />
        </div>
      </div>
      <Button type="submit" className="w-full">
        Add Ingredient
      </Button>
    </form>
  )
}
