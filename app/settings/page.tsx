"use client"

import { useState, useEffect } from "react"
import { useSupaMenuItems } from "@/lib/hooks/useSupaMenuItems"
import { useSupaIngredients } from "@/lib/hooks/useSupaIngredients"
import { useSupaAlertRules } from "@/lib/hooks/useSupaAlertRules"
import { useSupaAppSettings } from "@/lib/hooks/useSupaAppSettings"
import { useLoginHistory } from "@/lib/hooks/useLoginHistory"
import { supabase } from "@/lib/supabase/client"
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
  ClipboardList,
  Clock,
  CheckCircle2,
  History,
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
import { MENU_CATEGORIES, INGREDIENT_CATEGORIES, INGREDIENT_UNITS, TASK_PRIORITIES, ALERT_RULE_CONDITIONS } from "@/lib/constants"
import { formatINR } from "@/lib/format"
import type {
  MenuItem,
  MenuCategory,
  Ingredient,
  IngredientCategory,
  IngredientUnit,
  SizeOption,
  Task,
  TaskPriority,
  TaskStatus,
  TaskAssignee,
  AlertRuleCondition,
} from "@/lib/db/schema"
import { useAuth } from "@/lib/auth"
import { updateTaskStatus, updateTask, deleteTask as deleteTaskService, addTask } from "@/lib/services/tasks"
import { useTasks } from "@/lib/hooks/useTasks"
import { formatDateShort } from "@/lib/format"
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
  const { menuItems } = useSupaMenuItems()
  const { ingredients } = useSupaIngredients()
  const { alertRules } = useSupaAlertRules()
  const { tasks, loading: tasksLoading } = useTasks()

  const [dangerPassword, setDangerPassword] = useState("")
  const [dangerAction, setDangerAction] = useState<string | null>(null)
  const [dangerError, setDangerError] = useState("")

  const DANGER_PASSWORD = "AbhayLifeLeafy@2026"

  const DANGER_ACTIONS: { key: string; label: string; description: string; color?: string }[] = [
    { key: "clearOrders", label: "Clear All Orders", description: "Removes all orders and daily revenue data" },
    { key: "clearTasks", label: "Clear All Tasks", description: "Removes all tasks" },
    { key: "clearRecipes", label: "Clear All Recipes", description: "Removes all recipes and recipe ingredients" },
    { key: "clearAlerts", label: "Clear All Alerts", description: "Removes all alert history" },
    { key: "clearLoginHistory", label: "Clear Login History", description: "Removes all login history records" },
    { key: "resetInventory", label: "Reset Inventory Stock", description: "Resets all ingredient stock to 0" },
    { key: "reset", label: "Reset Entire Database", description: "Deletes ALL data from every table", color: "destructive" },
  ]

  async function executeDangerAction() {
    if (dangerPassword !== DANGER_PASSWORD) {
      setDangerError("Incorrect password")
      return
    }
    setDangerError("")
    try {
      switch (dangerAction) {
        case "clearOrders":
          await supabase.from("orders").delete().neq("id", "")
          await supabase.from("daily_revenue").delete().neq("id", "")
          toast.success("All orders and revenue data cleared")
          break
        case "clearTasks":
          await supabase.from("tasks").delete().neq("id", "")
          toast.success("All tasks cleared")
          break
        case "clearRecipes":
          await supabase.from("recipe_ingredients").delete().neq("id", "")
          await supabase.from("recipes").delete().neq("id", "")
          toast.success("All recipes cleared")
          break
        case "clearAlerts":
          await supabase.from("alerts").delete().neq("id", "")
          toast.success("All alerts cleared")
          break
        case "clearLoginHistory":
          await supabase.from("login_history").delete().neq("id", "")
          toast.success("Login history cleared")
          break
        case "resetInventory": {
          const { data: allIngs } = await supabase.from("ingredients").select("id")
          if (allIngs?.length) {
            for (const ing of allIngs) {
              await supabase.from("ingredients").update({ current_stock: 0 }).eq("id", ing.id)
            }
          }
          toast.success(`Inventory reset — ${allIngs?.length || 0} ingredients set to 0`)
          break
        }
        case "reset":
          await Promise.all([
            supabase.from("recipe_ingredients").delete().neq("id", ""),
            supabase.from("recipes").delete().neq("id", ""),
            supabase.from("orders").delete().neq("id", ""),
            supabase.from("daily_revenue").delete().neq("id", ""),
            supabase.from("menu_items").delete().neq("id", ""),
            supabase.from("ingredients").delete().neq("id", ""),
            supabase.from("alert_rules").delete().neq("id", ""),
            supabase.from("alerts").delete().neq("id", ""),
            supabase.from("app_settings").delete().neq("id", ""),
            supabase.from("tasks").delete().neq("id", ""),
            supabase.from("login_history").delete().neq("id", ""),
            supabase.from("bowl_templates").delete().neq("id", ""),
            supabase.from("bowl_components").delete().neq("id", ""),
            supabase.from("expenses").delete().neq("id", ""),
          ])
          toast.success("Database reset complete")
          window.location.reload()
          break
      }
    } catch (err) {
      toast.error("Action failed: " + (err as Error).message)
    }
    setDangerAction(null)
    setDangerPassword("")
  }

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
            count={menuItems.length}
          >
            <MenuSettings items={menuItems} />
          </SettingsSection>
        </StaggerItem>

        <StaggerItem>
          <SettingsSection
            icon={Leaf}
            title="Ingredients"
            count={ingredients.length}
          >
            <IngredientsSettings ingredients={ingredients} />
          </SettingsSection>
        </StaggerItem>

        <StaggerItem>
          <SettingsSection
            icon={ClipboardList}
            title="Tasks"
            count={tasks.filter(t => t.status !== "completed").length}
          >
            <TasksSettings tasks={tasks} loading={tasksLoading} />
          </SettingsSection>
        </StaggerItem>

        <StaggerItem>
          <SettingsSection icon={History} title="Login History">
            <LoginHistorySettings />
          </SettingsSection>
        </StaggerItem>

        <StaggerItem>
          <SettingsSection
            icon={BellRing}
            title="Alert Rules"
            count={alertRules.length}
          >
            <AlertRulesSettings rules={alertRules} />
          </SettingsSection>
        </StaggerItem>
      </StaggerGroup>

      {/* Danger Zone */}
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-destructive uppercase tracking-wider">
          Danger Zone
        </h3>
        {dangerAction === null ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {DANGER_ACTIONS.map((action) => (
                <Button
                  key={action.key}
                  variant="outline"
                  size="sm"
                  className={`text-xs ${
                    action.color === "destructive"
                      ? "text-destructive border-destructive/50 bg-destructive/10 hover:bg-destructive/20"
                      : "text-destructive border-destructive/30"
                  }`}
                  onClick={() => {
                    if (action.key === "reset") {
                      if (!window.confirm("This will delete ALL data from every table. Are you absolutely sure?")) return
                    }
                    setDangerAction(action.key)
                    setDangerError("")
                    setDangerPassword("")
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              All actions require admin password confirmation. Use with caution.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-lg bg-destructive/10 p-2.5">
              <p className="text-xs font-medium text-destructive">
                {DANGER_ACTIONS.find(a => a.key === dangerAction)?.label}
              </p>
              <p className="text-[10px] text-destructive/70 mt-0.5">
                {DANGER_ACTIONS.find(a => a.key === dangerAction)?.description}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter admin password to confirm:
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="password"
                placeholder="Admin password"
                value={dangerPassword}
                onChange={(e) => {
                  setDangerPassword(e.target.value)
                  setDangerError("")
                }}
                className="h-8 text-xs max-w-xs"
                autoFocus
              />
              <Button
                variant="destructive"
                size="sm"
                className="text-xs h-8"
                onClick={executeDangerAction}
              >
                Confirm
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  setDangerAction(null)
                  setDangerPassword("")
                  setDangerError("")
                }}
              >
                Cancel
              </Button>
            </div>
            {dangerError && (
              <p className="text-xs text-destructive">{dangerError}</p>
            )}
          </div>
        )}
      </div>
    </AnimatedPage>
  )
}

// ============================================================
// LOGIN HISTORY SETTINGS
// ============================================================

function LoginHistorySettings() {
  const { history, loading } = useLoginHistory(20)

  function formatLoginDate(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        Loading login history...
      </p>
    )
  }

  if (history.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        No login history found
      </p>
    )
  }

  return (
    <div className="space-y-1 pt-2 max-h-[50vh] overflow-y-auto">
      {history.map((rec) => (
        <div
          key={rec.id}
          className="flex items-center justify-between rounded-lg border px-3 py-2"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium">{rec.userName}</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                {rec.role}
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {formatLoginDate(rec.loginAt)}
            </div>
          </div>
          <div className="shrink-0">
            {rec.logoutAt ? (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                {formatLoginDate(rec.logoutAt)}
              </Badge>
            ) : (
              <Badge className="text-[10px] h-5 px-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Active
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// BUSINESS SETTINGS
// ============================================================

function BusinessSettings() {
  const { settings, loading: settingsLoading, setSetting } = useSupaAppSettings()

  const getVal = (key: string) => {
    const s = settings.find((s) => s.key === key)
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
    if (settings.length > 0 && !loaded) {
      setBusinessName(getVal("businessName") || "Leafy Life")
      setMinGuarantee(String(getVal("minimumGuaranteeRent") || 18000))
      setRevenueShare(String(getVal("revenueSharePercent") || 20))
      setDeposit(String(getVal("securityDeposit") || 100000))
      setLoaded(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, loaded])

  async function handleSave() {
    const updates = [
      { key: "businessName", value: JSON.stringify(businessName) },
      { key: "minimumGuaranteeRent", value: JSON.stringify(Number(minGuarantee)) },
      { key: "revenueSharePercent", value: JSON.stringify(Number(revenueShare)) },
      { key: "securityDeposit", value: JSON.stringify(Number(deposit)) },
    ]
    for (const u of updates) {
      await setSetting(u.key, u.value)
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
  const { deleteMenuItem } = useSupaMenuItems()

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
                            await deleteMenuItem(String(item.id!))
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
  const { addMenuItem, updateMenuItem } = useSupaMenuItems()
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
    const data = {
      name: name.trim(),
      description: description.trim(),
      category,
      sizes,
      isActive,
      isCustomizable,
    }
    if (isNew) {
      await addMenuItem(data)
      toast.success("Item added")
    } else {
      await updateMenuItem(String(item!.id!), data)
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
  const { deleteIngredient } = useSupaIngredients()

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
                  await deleteIngredient(String(ing.id!))
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
  const { addIngredient, updateIngredient } = useSupaIngredients()
  const [name, setName] = useState(ingredient?.name ?? "")
  const [category, setCategory] = useState<IngredientCategory>(ingredient?.category ?? "Vegetables")
  const [unit, setUnit] = useState<IngredientUnit>(ingredient?.unit ?? "kg")
  const [stock, setStock] = useState(String(ingredient?.currentStock ?? 0))
  const [threshold, setThreshold] = useState(String(ingredient?.minimumThreshold ?? 1))
  const [cost, setCost] = useState(String(ingredient?.costPerUnit ?? 0))
  const [supplier, setSupplier] = useState(ingredient?.supplier ?? "")

  async function handleSave() {
    if (!name.trim()) return
    const data = {
      name: name.trim(),
      category,
      unit,
      currentStock: Number(stock),
      minimumThreshold: Number(threshold),
      costPerUnit: Number(cost),
      supplier: supplier.trim() || undefined,
    }
    if (isNew) {
      await addIngredient(data)
      toast.success("Added")
    } else {
      await updateIngredient(String(ingredient!.id!), data)
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
// TASKS SETTINGS
// ============================================================

function TasksSettings({ tasks, loading }: { tasks: Task[]; loading: boolean }) {
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active")

  const filtered = tasks.filter((t) => {
    if (filter === "active") return t.status !== "completed"
    if (filter === "completed") return t.status === "completed"
    return true
  })

  const priorityOrder: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
  const sorted = [...filtered].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as "active" | "completed" | "all")}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="h-3 w-3 mr-1" />
          Add Task
        </Button>
      </div>

      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
        {sorted.map((task) => (
          <TaskRow key={task.id} task={task} onEdit={() => setEditTask(task)} />
        ))}
        {loading && sorted.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Loading tasks...</p>
        )}
        {!loading && sorted.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">No tasks found</p>
        )}
      </div>

      {editTask && <TaskDialog task={editTask} onClose={() => setEditTask(null)} />}
      {addOpen && <TaskDialog task={null} onClose={() => setAddOpen(false)} />}
    </div>
  )
}

function TaskRow({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const { user } = useAuth()
  const isOverdue = !!task.dueDate && task.status !== "completed" &&
    task.dueDate < new Date().toISOString().split("T")[0]

  const priorityColors: Record<TaskPriority, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    urgent: "bg-destructive/10 text-destructive",
  }

  const statusIcons: Record<TaskStatus, React.ReactNode> = {
    pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
    in_progress: <Clock className="h-3.5 w-3.5 text-blue-500" />,
    completed: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  }

  async function cycleStatus() {
    const next: Record<TaskStatus, TaskStatus> = {
      pending: "in_progress",
      in_progress: "completed",
      completed: "pending",
    }
    const newStatus = next[task.status]
    await updateTaskStatus(task.id!, newStatus, newStatus === "completed" ? user?.name : undefined)
    toast.success(
      newStatus === "completed" ? "Task completed" :
      newStatus === "in_progress" ? "Task in progress" : "Task reopened"
    )
  }

  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
      isOverdue ? "border-destructive/30 bg-destructive/5" : ""
    }`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button onClick={cycleStatus} className="shrink-0">
          {statusIcons[task.status]}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium ${
            task.status === "completed" ? "line-through text-muted-foreground" : ""
          }`}>
            {task.title}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className={`text-[9px] h-4 px-1 ${priorityColors[task.priority]}`}>
              {task.priority}
            </Badge>
            <span>{task.assignedTo}</span>
            {task.createdBy && <span>by {task.createdBy}</span>}
            {task.dueDate && (
              <span className={isOverdue ? "text-destructive font-medium" : ""}>
                {isOverdue ? "Overdue" : `Due ${formatDateShort(task.dueDate)}`}
              </span>
            )}
            {task.status === "completed" && task.completedBy && (
              <span className="text-green-600">done by {task.completedBy}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost" size="sm"
          className="h-6 w-6 p-0 text-destructive"
          onClick={async () => {
            await deleteTaskService(task.id!)
            toast.success("Deleted")
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

function TaskDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const isNew = task === null
  const { user } = useAuth()
  const [title, setTitle] = useState(task?.title ?? "")
  const [description, setDescription] = useState(task?.description ?? "")
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "")
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium")
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "pending")
  const [assignedTo, setAssignedTo] = useState<TaskAssignee>(task?.assignedTo ?? "admin")

  async function handleSave() {
    if (!title.trim()) return
    const now = new Date().toISOString()
    try {
      if (isNew) {
        await addTask({
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate || undefined,
          priority,
          status,
          assignedTo,
          createdBy: user?.name ?? "Unknown",
          completedAt: status === "completed" ? now : undefined,
          completedBy: status === "completed" ? (user?.name ?? undefined) : undefined,
        })
        toast.success("Task added")
      } else {
        await updateTask(task!.id!, {
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate || undefined,
          priority,
          status,
          assignedTo,
          completedAt: status === "completed" ? now : undefined,
          completedBy: status === "completed" ? (user?.name ?? undefined) : undefined,
        })
        toast.success("Task updated")
      }
      onClose()
    } catch (err) {
      toast.error((err as Error).message || "Failed to save task")
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">{isNew ? "Add Task" : "Edit Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus className="h-9" placeholder="e.g., Clean kitchen, Call supplier..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description (optional)</Label>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-xs min-h-[50px] resize-none"
              value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Task details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Assign To</Label>
              <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v as TaskAssignee)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Due Date (optional)</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9" />
            </div>
            {!isNew && (
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-9 text-xs" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 h-9 text-xs" onClick={handleSave}>{isNew ? "Add Task" : "Save"}</Button>
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
  id?: number | string
  name: string
  type: string
  condition: string
  parameters: Record<string, number | string>
  isActive: boolean
}> }) {
  const [createOpen, setCreateOpen] = useState(false)
  const { updateAlertRule, deleteAlertRule } = useSupaAlertRules()

  async function toggleRule(id: string, isActive: boolean) {
    await updateAlertRule(id, { isActive: !isActive })
    toast.success(isActive ? "Disabled" : "Enabled")
  }

  async function deleteRule(id: string) {
    await deleteAlertRule(id)
    toast.success("Rule deleted")
  }

  async function updateParam(id: string, params: Record<string, number | string>, key: string, value: string) {
    const newParams = { ...params, [key]: Number(value) }
    await updateAlertRule(id, { parameters: newParams })
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Alert engine runs every 15 minutes.
        </p>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3 w-3 mr-1" />
          Add Rule
        </Button>
      </div>
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
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => toggleRule(String(rule.id!), rule.isActive)}
                >
                  {rule.isActive ? "Disable" : "Enable"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => deleteRule(String(rule.id!))}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
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
                        updateParam(String(rule.id!), rule.parameters, key, e.target.value)
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

      {createOpen && <AlertRuleDialog onClose={() => setCreateOpen(false)} />}
    </div>
  )
}

// ============================================================
// ALERT RULE DIALOG (Create new rule)
// ============================================================

const CONDITION_PARAMS: Record<AlertRuleCondition, Array<{ key: string; label: string; defaultVal: number }>> = {
  stock_below_threshold: [],
  monthly_rent_due: [
    { key: "dayOfMonth", label: "Day of Month", defaultVal: 1 },
    { key: "reminderDaysBefore", label: "Reminder Days Before", defaultVal: 3 },
  ],
  daily_revenue_below: [{ key: "amount", label: "Amount (₹)", defaultVal: 3000 }],
  daily_revenue_above: [{ key: "amount", label: "Amount (₹)", defaultVal: 15000 }],
  expense_exceeds_budget: [{ key: "monthlyBudget", label: "Monthly Budget (₹)", defaultVal: 50000 }],
  expiry_within_days: [{ key: "days", label: "Warning Days", defaultVal: 3 }],
  task_overdue: [],
}

const CONDITION_TO_TYPE: Record<AlertRuleCondition, string> = {
  stock_below_threshold: "LowStock",
  monthly_rent_due: "RentDue",
  daily_revenue_below: "RevenueThreshold",
  daily_revenue_above: "RevenueThreshold",
  expense_exceeds_budget: "HighExpense",
  expiry_within_days: "ExpiryWarning",
  task_overdue: "TaskDue",
}

const CONDITION_LABELS: Record<AlertRuleCondition, string> = {
  stock_below_threshold: "Stock Below Threshold",
  monthly_rent_due: "Monthly Rent Due",
  daily_revenue_below: "Daily Revenue Below",
  daily_revenue_above: "Daily Revenue Above",
  expense_exceeds_budget: "Expense Exceeds Budget",
  expiry_within_days: "Expiry Within Days",
  task_overdue: "Task Overdue",
}

function AlertRuleDialog({ onClose }: { onClose: () => void }) {
  const { addAlertRule } = useSupaAlertRules()
  const [name, setName] = useState("")
  const [condition, setCondition] = useState<AlertRuleCondition>("stock_below_threshold")
  const [isActive, setIsActive] = useState(true)
  const [params, setParams] = useState<Record<string, string>>({})

  useEffect(() => {
    const defaults: Record<string, string> = {}
    for (const p of CONDITION_PARAMS[condition]) {
      defaults[p.key] = String(p.defaultVal)
    }
    setParams(defaults)
  }, [condition])

  async function handleSave() {
    if (!name.trim()) return
    const numericParams: Record<string, number | string> = {}
    for (const [k, v] of Object.entries(params)) {
      numericParams[k] = Number(v)
    }
    await addAlertRule({
      name: name.trim(),
      type: CONDITION_TO_TYPE[condition] as any,
      condition,
      parameters: numericParams,
      isActive,
    })
    toast.success("Alert rule created")
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Create Alert Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-9"
              placeholder="e.g., Low Revenue Warning" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Condition Type</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as AlertRuleCondition)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALERT_RULE_CONDITIONS.map((c) => (
                  <SelectItem key={c} value={c}>{CONDITION_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {CONDITION_PARAMS[condition].length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Parameters</Label>
              {CONDITION_PARAMS[condition].map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-36 shrink-0">{p.label}</span>
                  <Input
                    type="number"
                    value={params[p.key] ?? ""}
                    onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: e.target.value }))}
                    className="h-8 text-xs flex-1"
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ruleActive" checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)} className="rounded border" />
            <Label htmlFor="ruleActive" className="text-xs">Start active</Label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-9 text-xs" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 h-9 text-xs" onClick={handleSave}>Create Rule</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
