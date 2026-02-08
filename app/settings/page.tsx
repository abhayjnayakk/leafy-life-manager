"use client"

import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/client"
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Settings2,
  UtensilsCrossed,
  Leaf,
  BellRing,
  ChevronRight,
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
import { MENU_CATEGORIES, INGREDIENT_CATEGORIES, INGREDIENT_UNITS } from "@/lib/constants"
import { formatINR } from "@/lib/format"
import type {
  MenuItem,
  MenuCategory,
  Ingredient,
  IngredientCategory,
  IngredientUnit,
  SizeOption,
} from "@/lib/db/schema"
import { toast } from "sonner"
import { AnimatedPage, AnimatedCollapse, StaggerGroup, StaggerItem } from "@/components/ui/animated"
import { motion } from "framer-motion"

// ============================================================
// COLLAPSIBLE SECTION WRAPPER
// ============================================================

function SettingsSection({
  icon: Icon,
  title,
  count,
  children,
  defaultOpen = false,
}: {
  icon: React.ElementType
  title: string
  count?: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold flex-1 text-left">{title}</span>
        {count !== undefined && (
          <Badge variant="secondary" className="text-xs mr-1">
            {count}
          </Badge>
        )}
        <motion.div
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatedCollapse open={open}>
        <div className="px-4 pb-4 pt-1 border-t">
          {children}
        </div>
      </AnimatedCollapse>
    </div>
  )
}

// ============================================================
// MAIN SETTINGS PAGE
// ============================================================

export default function SettingsPage() {
  const menuItems = useLiveQuery(() => db.menuItems.toArray(), [])
  const ingredients = useLiveQuery(() => db.ingredients.orderBy("name").toArray(), [])
  const rules = useLiveQuery(() => db.alertRules.toArray(), [])

  return (
    <AnimatedPage className="space-y-3 pb-24">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">
          Business, menu, ingredients & alert rules
        </p>
      </div>

      <StaggerGroup className="space-y-3">
        <StaggerItem>
          <SettingsSection
            icon={Settings2}
            title="Business"
            defaultOpen={true}
          >
            <BusinessSettings />
          </SettingsSection>
        </StaggerItem>

        <StaggerItem>
          <SettingsSection
            icon={UtensilsCrossed}
            title="Menu Items"
            count={menuItems?.length ?? 0}
          >
            <MenuSettings items={menuItems ?? []} />
          </SettingsSection>
        </StaggerItem>

        <StaggerItem>
          <SettingsSection
            icon={Leaf}
            title="Ingredients"
            count={ingredients?.length ?? 0}
          >
            <IngredientsSettings ingredients={ingredients ?? []} />
          </SettingsSection>
        </StaggerItem>

        <StaggerItem>
          <SettingsSection
            icon={BellRing}
            title="Alert Rules"
            count={rules?.length ?? 0}
          >
            <AlertRulesSettings rules={rules ?? []} />
          </SettingsSection>
        </StaggerItem>
      </StaggerGroup>

      {/* Danger Zone */}
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2">
        <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider">
          Danger Zone
        </h3>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 text-xs"
            onClick={async () => {
              if (
                window.confirm(
                  "This will delete ALL data and re-seed. Are you sure?"
                )
              ) {
                await db.delete()
                window.location.reload()
              }
            }}
          >
            Reset Database
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 text-xs"
            onClick={async () => {
              await db.alerts.clear()
              toast.success("All alerts cleared")
            }}
          >
            Clear All Alerts
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Reset re-seeds fresh data. Clear alerts removes all alert history.
        </p>
      </div>
    </AnimatedPage>
  )
}

// ============================================================
// BUSINESS SETTINGS
// ============================================================

function BusinessSettings() {
  const settings = useLiveQuery(() => db.appSettings.toArray(), [])

  const getVal = (key: string) => {
    const s = (settings ?? []).find((s) => s.key === key)
    if (!s) return ""
    try {
      return JSON.parse(s.value)
    } catch {
      return s.value
    }
  }

  const [businessName, setBusinessName] = useState("")
  const [minGuarantee, setMinGuarantee] = useState("")
  const [revenueShare, setRevenueShare] = useState("")
  const [deposit, setDeposit] = useState("")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (settings && !loaded) {
      setBusinessName(getVal("businessName") || "Leafy Life")
      setMinGuarantee(String(getVal("minimumGuaranteeRent") || 18000))
      setRevenueShare(String(getVal("revenueSharePercent") || 20))
      setDeposit(String(getVal("securityDeposit") || 100000))
      setLoaded(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, loaded])

  async function handleSave() {
    const now = new Date().toISOString()
    const updates = [
      { key: "businessName", value: JSON.stringify(businessName) },
      { key: "minimumGuaranteeRent", value: JSON.stringify(Number(minGuarantee)) },
      { key: "revenueSharePercent", value: JSON.stringify(Number(revenueShare)) },
      { key: "securityDeposit", value: JSON.stringify(Number(deposit)) },
    ]
    for (const u of updates) {
      const existing = await db.appSettings.where("key").equals(u.key).first()
      if (existing) {
        await db.appSettings.update(existing.id!, { value: u.value, updatedAt: now })
      } else {
        await db.appSettings.add({ ...u, updatedAt: now })
      }
    }
    toast.success("Settings saved")
  }

  return (
    <div className="space-y-4 max-w-lg pt-2">
      <div className="space-y-2">
        <Label className="text-xs">Business Name</Label>
        <Input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="h-9"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Min Guarantee (₹)</Label>
          <Input
            type="number"
            value={minGuarantee}
            onChange={(e) => setMinGuarantee(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Rev Share (%)</Label>
          <Input
            type="number"
            value={revenueShare}
            onChange={(e) => setRevenueShare(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Security Dep (₹)</Label>
          <Input
            type="number"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            className="h-9"
          />
        </div>
      </div>
      <div className="p-2.5 rounded-lg bg-muted/40 text-xs text-muted-foreground">
        <strong>Rent:</strong> {revenueShare}% of revenue or ₹{Number(minGuarantee).toLocaleString("en-IN")} min.{" "}
        <strong>Breakeven:</strong> ₹
        {Math.round(
          Number(minGuarantee) / (Number(revenueShare) / 100 || 1)
        ).toLocaleString("en-IN")}
        /mo
      </div>
      <Button size="sm" onClick={handleSave}>
        <Save className="h-3.5 w-3.5 mr-1.5" />
        Save Settings
      </Button>
    </div>
  )
}

// ============================================================
// MENU SETTINGS
// ============================================================

function MenuSettings({ items }: { items: MenuItem[] }) {
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  const grouped = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, MenuItem[]>
  )

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{items.length} items</p>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-1.5">
        {MENU_CATEGORIES.map((cat) => {
          const catItems = grouped[cat] ?? []
          if (catItems.length === 0) return null
          const isExpanded = expandedCat === cat
          return (
            <div key={cat} className="rounded-lg border overflow-hidden">
              <button
                onClick={() => setExpandedCat(isExpanded ? null : cat)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors text-left"
              >
                <span className="text-xs font-medium">{cat}</span>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {catItems.length}
                </Badge>
              </button>
              <AnimatedCollapse open={isExpanded}>
                <div className="border-t divide-y">
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium truncate">
                            {item.name}
                          </span>
                          {!item.isActive && (
                            <Badge variant="outline" className="text-[10px] text-destructive h-4 px-1">
                              Off
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {item.sizes
                            .map((s) => `${s.size}: ${formatINR(s.dineInPrice ?? s.price)}/${formatINR(s.price)}`)
                            .join(" · ")}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setEditItem(item)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={async () => {
                            await db.menuItems.delete(item.id!)
                            toast.success("Deleted")
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </AnimatedCollapse>
            </div>
          )
        })}
      </div>

      {editItem && <MenuItemDialog item={editItem} onClose={() => setEditItem(null)} />}
      {addOpen && <MenuItemDialog item={null} onClose={() => setAddOpen(false)} />}
    </div>
  )
}

function MenuItemDialog({
  item,
  onClose,
}: {
  item: MenuItem | null
  onClose: () => void
}) {
  const isNew = item === null
  const [name, setName] = useState(item?.name ?? "")
  const [description, setDescription] = useState(item?.description ?? "")
  const [category, setCategory] = useState<MenuCategory>(item?.category ?? "Salads")
  const [isActive, setIsActive] = useState(item?.isActive ?? true)
  const [isCustomizable, setIsCustomizable] = useState(item?.isCustomizable ?? false)
  const [sizes, setSizes] = useState(
    item?.sizes ?? [{ size: "Single" as SizeOption, price: 0, dineInPrice: 0 }]
  )

  function updateSize(idx: number, field: "size" | "price" | "dineInPrice", value: string | number) {
    setSizes((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, [field]: field === "size" ? value : Number(value) } : s
      )
    )
  }

  async function handleSave() {
    if (!name.trim()) return
    const now = new Date().toISOString()
    const data = {
      name: name.trim(),
      description: description.trim(),
      category,
      sizes,
      isActive,
      isCustomizable,
      updatedAt: now,
    }
    if (isNew) {
      await db.menuItems.add({ ...data, createdAt: now })
      toast.success("Item added")
    } else {
      await db.menuItems.update(item!.id!, data)
      toast.success("Item updated")
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {isNew ? "Add Menu Item" : "Edit Menu Item"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-xs min-h-[50px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ingredients and preparation..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as MenuCategory)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MENU_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={isActive ? "active" : "inactive"}
                onValueChange={(v) => setIsActive(v === "active")}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Pricing (Dine In / Delivery)</Label>
              {sizes.length < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={() =>
                    setSizes((prev) => [...prev, { size: "Large" as SizeOption, price: 0, dineInPrice: 0 }])
                  }
                >
                  <Plus className="h-3 w-3 mr-0.5" />
                  Size
                </Button>
              )}
            </div>
            {sizes.map((s, idx) => (
              <div key={idx} className="flex gap-2 items-end">
                <div className="w-20">
                  <Select value={s.size} onValueChange={(v) => updateSize(idx, "size", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  min="0"
                  placeholder="Dine In ₹"
                  value={s.dineInPrice || ""}
                  onChange={(e) => updateSize(idx, "dineInPrice", e.target.value)}
                  className="h-8 text-xs flex-1"
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Delivery ₹"
                  value={s.price || ""}
                  onChange={(e) => updateSize(idx, "price", e.target.value)}
                  className="h-8 text-xs flex-1"
                />
                {sizes.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive shrink-0"
                    onClick={() => setSizes((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="customizable"
              checked={isCustomizable}
              onChange={(e) => setIsCustomizable(e.target.checked)}
              className="rounded border"
            />
            <Label htmlFor="customizable" className="text-xs">
              Customizable (build-your-own bowl)
            </Label>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-9 text-xs" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1 h-9 text-xs" onClick={handleSave}>
              {isNew ? "Add Item" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// INGREDIENTS SETTINGS
// ============================================================

function IngredientsSettings({ ingredients }: { ingredients: Ingredient[] }) {
  const [editIng, setEditIng] = useState<Ingredient | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = ingredients.filter(
    (i) =>
      !search ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-8 text-xs"
        />
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
        {filtered.map((ing) => (
          <div
            key={ing.id}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{ing.name}</div>
              <div className="text-[10px] text-muted-foreground">
                {ing.category} · {ing.currentStock} {ing.unit} · {formatINR(ing.costPerUnit)}/{ing.unit}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setEditIng(ing)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive"
                onClick={async () => {
                  await db.ingredients.delete(ing.id!)
                  toast.success("Deleted")
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            No ingredients found
          </p>
        )}
      </div>

      {editIng && <IngredientDialog ingredient={editIng} onClose={() => setEditIng(null)} />}
      {addOpen && <IngredientDialog ingredient={null} onClose={() => setAddOpen(false)} />}
    </div>
  )
}

function IngredientDialog({
  ingredient,
  onClose,
}: {
  ingredient: Ingredient | null
  onClose: () => void
}) {
  const isNew = ingredient === null
  const [name, setName] = useState(ingredient?.name ?? "")
  const [category, setCategory] = useState<IngredientCategory>(ingredient?.category ?? "Vegetables")
  const [unit, setUnit] = useState<IngredientUnit>(ingredient?.unit ?? "kg")
  const [stock, setStock] = useState(String(ingredient?.currentStock ?? 0))
  const [threshold, setThreshold] = useState(String(ingredient?.minimumThreshold ?? 1))
  const [cost, setCost] = useState(String(ingredient?.costPerUnit ?? 0))
  const [supplier, setSupplier] = useState(ingredient?.supplier ?? "")

  async function handleSave() {
    if (!name.trim()) return
    const now = new Date().toISOString()
    const data = {
      name: name.trim(),
      category,
      unit,
      currentStock: Number(stock),
      minimumThreshold: Number(threshold),
      costPerUnit: Number(cost),
      supplier: supplier.trim() || undefined,
      updatedAt: now,
    }
    if (isNew) {
      await db.ingredients.add({ ...data, createdAt: now })
      toast.success("Added")
    } else {
      await db.ingredients.update(ingredient!.id!, data)
      toast.success("Updated")
    }
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {isNew ? "Add Ingredient" : "Edit Ingredient"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as IngredientCategory)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INGREDIENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unit</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as IngredientUnit)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INGREDIENT_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Stock</Label>
              <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Min Threshold</Label>
              <Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cost/Unit</Label>
              <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Supplier (optional)</Label>
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="Supplier name"
              className="h-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-9 text-xs" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1 h-9 text-xs" onClick={handleSave}>
              {isNew ? "Add" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// ALERT RULES SETTINGS
// ============================================================

function AlertRulesSettings({ rules }: { rules: Array<{
  id?: number
  name: string
  type: string
  condition: string
  parameters: Record<string, number | string>
  isActive: boolean
}> }) {

  async function toggleRule(id: number, isActive: boolean) {
    await db.alertRules.update(id, {
      isActive: !isActive,
      updatedAt: new Date().toISOString(),
    })
    toast.success(isActive ? "Disabled" : "Enabled")
  }

  async function updateParam(id: number, params: Record<string, number | string>, key: string, value: string) {
    const newParams = { ...params, [key]: Number(value) }
    await db.alertRules.update(id, {
      parameters: newParams,
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-3 pt-2">
      <p className="text-xs text-muted-foreground">
        Alert engine runs every 15 minutes.
      </p>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">{rule.name}</span>
                <div
                  className={`h-2 w-2 rounded-full ${
                    rule.isActive ? "bg-success" : "bg-muted-foreground/30"
                  }`}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => toggleRule(rule.id!, rule.isActive)}
              >
                {rule.isActive ? "Disable" : "Enable"}
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {rule.type} · {rule.condition}
            </div>
            {Object.keys(rule.parameters).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(rule.parameters).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1 text-[10px]">
                    <span className="text-muted-foreground">{key}:</span>
                    <Input
                      type="number"
                      value={String(val)}
                      onChange={(e) =>
                        updateParam(rule.id!, rule.parameters, key, e.target.value)
                      }
                      className="h-6 w-20 text-[10px]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {rules.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No alert rules configured
          </p>
        )}
      </div>
    </div>
  )
}
