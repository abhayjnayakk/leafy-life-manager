"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { useSupaMenuItems } from "@/lib/hooks/useSupaMenuItems"
import { useSupaOrders } from "@/lib/hooks/useSupaOrders"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase/client"
import {
  Minus, Plus, ShoppingCart, Trash2, X, Store, Truck, Clock, ChevronUp, Search, Package, CalendarClock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { formatINR } from "@/lib/format"
import { createOrder } from "@/lib/services/orders"
import type {
  MenuItem, OrderItem, OrderType, PaymentMethod, SizeOption,
} from "@/lib/db/schema"
import { toast } from "sonner"
import { AnimatedPage, StaggerGroup, StaggerItem, AnimatedCollapse } from "@/components/ui/animated"
import { motion, AnimatePresence } from "framer-motion"

interface CartItem extends OrderItem {
  _key: string
}

function getPrice(item: MenuItem, size: SizeOption, orderType: OrderType): number {
  const s = item.sizes.find((sz) => sz.size === size)
  if (!s) return 0
  if (orderType === "DineIn") return s.dineInPrice ?? s.price
  if (orderType === "Takeaway") return s.takeawayPrice ?? (s.dineInPrice ?? s.price) + 10
  return s.price
}

export default function OrdersPage() {
  const { user, isAdmin } = useAuth()
  const [orderType, setOrderType] = useState<OrderType>("DineIn")
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash")
  const [cartExpanded, setCartExpanded] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split("T")[0])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const [customizeItem, setCustomizeItem] = useState<CartItem | null>(null)
  const [search, setSearch] = useState("")

  // Backdate support (admin only)
  const [backdateMode, setBackdateMode] = useState(false)
  const [backdateDate, setBackdateDate] = useState("")

  // Customer info
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")

  // Supabase hooks
  const { menuItems: allMenuItems, loading: menuLoading } = useSupaMenuItems()
  const { orders: todayOrders } = useSupaOrders(historyDate)

  // Filter active menu items (include custom bowls - no isCustomizable filter)
  const menuItems = useMemo(() => allMenuItems.filter((m) => m.isActive), [allMenuItems])

  const categories = useMemo(() => [...new Set(menuItems.map((m) => m.category))], [menuItems])
  const filtered = useMemo(() => menuItems
    .filter((m) => {
      const matchesCategory = !activeCategory || m.category === activeCategory
      const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    }), [menuItems, activeCategory, search])

  const menuItemsRef = useRef(menuItems)
  useEffect(() => { menuItemsRef.current = menuItems }, [menuItems])

  const handleOrderTypeChange = useCallback((t: OrderType) => {
    setOrderType(t)
    setCart((prev) => prev.map((c) => {
      const item = (menuItemsRef.current ?? []).find((m) => m.id === c.menuItemId)
      if (!item) return c
      const p = getPrice(item, c.size, t)
      return { ...c, unitPrice: p, lineTotal: c.quantity * p }
    }))
  }, [])

  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => { clearTimeout(flashTimerRef.current) }, [])

  function addToCart(item: MenuItem, size: SizeOption) {
    const price = getPrice(item, size, orderType)
    const key = `${item.id}-${size}`
    setFlashKey(key)
    clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setFlashKey(null), 400)
    setCart((prev) => {
      const ex = prev.find((c) => c._key === key)
      if (ex) return prev.map((c) => c._key === key ? { ...c, quantity: c.quantity + 1, lineTotal: (c.quantity + 1) * c.unitPrice } : c)
      return [...prev, { _key: key, menuItemId: item.id!, menuItemName: item.name, size, quantity: 1, unitPrice: price, lineTotal: price }]
    })
  }

  function updateQty(key: string, d: number) {
    setCart((prev) => prev.map((c) => {
      if (c._key !== key) return c
      const q = c.quantity + d
      return q <= 0 ? null : { ...c, quantity: q, lineTotal: q * c.unitPrice }
    }).filter(Boolean) as CartItem[])
  }

  function updateCustomization(key: string, excluded: string[], instructions: string) {
    setCart((prev) => prev.map((c) => c._key !== key ? c : {
      ...c,
      excludedIngredients: excluded.length > 0 ? excluded : undefined,
      specialInstructions: instructions.trim() || undefined,
    }))
  }

  const subtotal = cart.reduce((s, c) => s + c.lineTotal, 0)
  const discountAmt = parseFloat(discount) || 0
  const total = Math.max(0, subtotal - discountAmt)
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0)

  async function handlePlaceOrder() {
    if (cart.length === 0) return
    const items: OrderItem[] = cart.map(({ _key, ...i }) => i)
    await createOrder(
      items,
      paymentMethod,
      orderType,
      discountAmt,
      undefined,
      backdateMode ? backdateDate : undefined,
      customerName.trim() || undefined,
      customerPhone.trim() || undefined,
      user?.userId
    )
    toast.success(`Order placed! ${formatINR(total)}`)
    setCart([])
    setDiscount("")
    setCartExpanded(false)
    setCustomerName("")
    setCustomerPhone("")
    setBackdateMode(false)
    setBackdateDate("")
  }

  const isLoading = menuLoading

  return (
    <AnimatedPage className="space-y-2.5 pb-36">
      {/* Header with Order Type toggle, Backdate, and History */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-muted p-1 gap-0.5">
            {(["DineIn", "Takeaway", "Delivery"] as OrderType[]).map((t) => (
              <button key={t} onClick={() => handleOrderTypeChange(t)}
                className="relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors">
                {orderType === t && (
                  <motion.div layoutId="order-type-pill" className="absolute inset-0 rounded-lg bg-card shadow-sm"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {t === "DineIn" ? <Store className="h-3.5 w-3.5" /> : t === "Takeaway" ? <Package className="h-3.5 w-3.5" /> : <Truck className="h-3.5 w-3.5" />}
                  {t === "DineIn" ? "Dine In" : t === "Takeaway" ? "Take Away" : "Delivery"}
                </span>
              </button>
            ))}
          </div>

          {/* Backdate button (admin only) */}
          {isAdmin && (
            <button
              onClick={() => { setBackdateMode(!backdateMode); if (backdateMode) setBackdateDate("") }}
              className={`rounded-lg p-2 transition-colors ${backdateMode ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "hover:bg-muted text-muted-foreground"}`}
              title="Past Order"
            >
              <CalendarClock className="h-4 w-4" />
            </button>
          )}
        </div>
        <button onClick={() => setHistoryOpen(true)} className="rounded-lg p-2 hover:bg-muted transition-colors">
          <Clock className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Backdate date picker */}
      <AnimatePresence>
        {backdateMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-2">
              <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Past Order Date:</span>
              <Input
                type="date"
                value={backdateDate}
                onChange={(e) => setBackdateDate(e.target.value)}
                max={new Date(Date.now() - 86400000).toISOString().split("T")[0]}
                className="h-7 w-40 text-xs"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        <button onClick={() => setActiveCategory(null)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${!activeCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          All
        </button>
        {categories.map((cat) => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search menu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-card pl-8 pr-8 py-1.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Menu Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-2.5 space-y-2 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-7 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm space-y-2">
          <ShoppingCart className="h-8 w-8 mx-auto opacity-40" />
          <p>{search ? "No items match your search" : "No products available"}</p>
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-primary hover:underline">
              Clear search
            </button>
          )}
        </div>
      ) : (
        <StaggerGroup className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map((item) => (
            <StaggerItem key={item.id}>
              <motion.div
                className="relative rounded-xl border bg-card p-2.5 space-y-1.5 cursor-pointer select-none"
                whileTap={{ scale: 0.97 }}
              >
                {flashKey?.startsWith(`${item.id}-`) && (
                  <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} transition={{ duration: 0.4 }}
                    className="absolute inset-0 rounded-xl bg-primary/15 pointer-events-none" />
                )}
                <div className="text-sm font-medium leading-tight">{item.name}</div>
                <div className="flex gap-1">
                  {item.sizes.map((s) => {
                    const price = getPrice(item, s.size, orderType)
                    return (
                      <button key={s.size} onClick={() => addToCart(item, s.size)}
                        className="flex-1 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary py-1.5 text-xs font-semibold transition-colors">
                        {s.size === "Single" ? "" : `${s.size[0]} `}{formatINR(price)}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}

      {/* Bottom Cart Drawer */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-[52px] md:bottom-0 left-0 right-0 md:left-14 z-40 bg-card border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          >
            <button onClick={() => setCartExpanded(!cartExpanded)}
              className="w-full flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {cartCount}
                </div>
                <span className="text-sm font-medium">{formatINR(total)}</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.div animate={{ rotate: cartExpanded ? 180 : 0 }}>
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                </motion.div>
              </div>
            </button>

            <AnimatedCollapse open={cartExpanded}>
              <div className="px-4 pb-3 space-y-2.5 max-h-[50vh] overflow-y-auto">
                {cart.map((item) => (
                  <div key={item._key} className="flex items-center gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.menuItemName}</div>
                      <div className="text-xs text-muted-foreground">{item.size} · {formatINR(item.unitPrice)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item._key, -1)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQty(item._key, 1)} className="h-7 w-7 rounded-lg border flex items-center justify-center hover:bg-muted">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold w-16 text-right">{formatINR(item.lineTotal)}</span>
                    <button onClick={() => setCart((p) => p.filter((c) => c._key !== item._key))} className="p-1 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* Customer info fields */}
                <div className="flex gap-2 pt-2 border-t">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone number"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Label className="text-xs shrink-0">Discount ₹</Label>
                  <Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="h-8 w-24" />
                </div>

                <div className="flex gap-1.5">
                  {(["Cash", "UPI", "Card"] as PaymentMethod[]).map((pm) => (
                    <button key={pm} onClick={() => setPaymentMethod(pm)}
                      className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${paymentMethod === pm ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                      {pm}
                    </button>
                  ))}
                </div>

                <motion.button whileTap={{ scale: 0.98 }} onClick={handlePlaceOrder}
                  className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold text-sm shadow-md shadow-primary/15">
                  Place Order · {formatINR(total)}
                </motion.button>
              </div>
            </AnimatedCollapse>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History overlay */}
      {historyOpen && (
        <Dialog open onOpenChange={(o) => !o && setHistoryOpen(false)}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order History</DialogTitle>
            </DialogHeader>
            <Input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} className="w-48 mb-3" />
            {(todayOrders ?? []).length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No orders for this date</p>
            ) : (
              <div className="space-y-2">
                {(todayOrders ?? []).map((order) => (
                  <div key={order.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{order.orderNumber}</span>
                        {order.customerName && (
                          <span className="text-xs text-muted-foreground">- {order.customerName}</span>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          {order.orderType === "DineIn" ? "Dine In" : order.orderType === "Takeaway" ? "Take Away" : "Delivery"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">{order.paymentMethod}</Badge>
                      </div>
                    </div>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.menuItemName} ({item.size}) x{item.quantity}</span>
                        <span>{formatINR(item.lineTotal)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between mt-2 pt-2 border-t text-sm font-semibold">
                      <span>Total</span>
                      <span>{formatINR(order.totalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {customizeItem && (
        <ItemCustomizeDialog item={customizeItem} onClose={() => setCustomizeItem(null)}
          onSave={(ex, ins) => { updateCustomization(customizeItem._key, ex, ins); setCustomizeItem(null) }} />
      )}
    </AnimatedPage>
  )
}

function ItemCustomizeDialog({ item, onClose, onSave }: {
  item: CartItem; onClose: () => void; onSave: (ex: string[], ins: string) => void
}) {
  const [recipeIngredients, setRecipeIngredients] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecipeIngredients() {
      try {
        const { data: recipes } = await supabase
          .from("recipes")
          .select("*")
          .eq("menu_item_id", String(item.menuItemId))

        if (!recipes || recipes.length === 0) {
          setLoading(false)
          return
        }

        const recipe = recipes.find((r: any) => r.size_variant === item.size) || recipes[0]
        if (!recipe) {
          setLoading(false)
          return
        }

        const { data: ris } = await supabase
          .from("recipe_ingredients")
          .select("*")
          .eq("recipe_id", recipe.id)

        if (!ris || ris.length === 0) {
          setLoading(false)
          return
        }

        const ingredientIds = ris.map((ri: any) => ri.ingredient_id)
        const { data: ingredients } = await supabase
          .from("ingredients")
          .select("id, name")
          .in("id", ingredientIds)

        const ingMap = new Map((ingredients ?? []).map((ing: any) => [ing.id, ing.name]))

        setRecipeIngredients(
          ris.map((ri: any) => ({
            id: ri.id,
            name: (ingMap.get(ri.ingredient_id) as string) ?? "Unknown",
          }))
        )
      } catch (err) {
        console.error("Failed to fetch recipe ingredients:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchRecipeIngredients()
  }, [item.menuItemId, item.size])

  const [excluded, setExcluded] = useState<string[]>(item.excludedIngredients ?? [])
  const [instructions, setInstructions] = useState(item.specialInstructions ?? "")

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-base">Customize: {item.menuItemName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Exclude Ingredients</Label>
            {loading ? (
              <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-7 w-16 rounded-full bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {recipeIngredients.map((ing) => {
                  const ex = excluded.includes(ing.name)
                  return (
                    <button key={ing.id} onClick={() => setExcluded((p) => ex ? p.filter((n) => n !== ing.name) : [...p, ing.name])}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${ex ? "bg-destructive/10 text-destructive border-destructive/30 line-through" : "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80"}`}>
                      {ing.name}{ex && <X className="h-3 w-3 inline ml-1" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Special Instructions</Label>
            <textarea className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[60px] resize-none"
              value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. extra spicy, less salt..." />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={() => onSave(excluded, instructions)}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
