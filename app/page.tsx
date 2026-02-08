"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/client"
import { formatINR, formatPercent } from "@/lib/format"
import {
  useMonthlyRevenueShareStatus,
  useWeeklyRevenue,
  useTodayRevenue,
} from "@/lib/hooks/useFinance"
import { useAuth } from "@/lib/auth"
import { Check, AlertTriangle, AlertCircle, Info, TrendingUp, ClipboardList } from "lucide-react"
import { resolveAlert } from "@/lib/services/alertEngine"
import type { Alert, TaskPriority } from "@/lib/db/schema"
import { formatDateShort } from "@/lib/format"
import {
  AnimatedPage,
  AnimatedNumber,
  StaggerGroup,
  StaggerItem,
  CircularProgress,
  AnimatedPresence,
} from "@/components/ui/animated"
import { motion } from "framer-motion"
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts"

export default function DashboardPage() {
  const { isAdmin } = useAuth()
  return isAdmin ? <AdminDashboard /> : <StaffDashboard />
}

// ============================================================
// ADMIN DASHBOARD - full financial visibility
// ============================================================

function AdminDashboard() {
  const todayRevenue = useTodayRevenue()
  const revenueShare = useMonthlyRevenueShareStatus()
  const weeklyRevenue = useWeeklyRevenue()

  const lowStockCount = useLiveQuery(
    () => db.ingredients.filter((i) => i.currentStock <= i.minimumThreshold).count(),
    []
  )
  const alerts = useLiveQuery(
    () => db.alerts.filter((a) => !a.resolvedAt).reverse().toArray(),
    []
  )

  const todayStr = new Date().toISOString().split("T")[0]
  const topItems = useLiveQuery(async () => {
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString().split("T")[0]
    const orders = await db.orders
      .where("date").between(monthStart, todayStr, true, true).toArray()
    const counts: Record<string, { name: string; count: number; revenue: number }> = {}
    for (const order of orders) {
      for (const item of order.items) {
        const key = item.menuItemName
        if (!counts[key]) counts[key] = { name: key, count: 0, revenue: 0 }
        counts[key].count += item.quantity
        counts[key].revenue += item.lineTotal
      }
    }
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 3)
  }, [todayStr])

  return (
    <AnimatedPage className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{getGreeting()}</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Metrics Strip */}
      <StaggerGroup className="grid grid-cols-3 gap-2.5">
        <StaggerItem>
          <NumericMetric label="Revenue" value={todayRevenue?.totalSales ?? 0} prefix="₹" formatFn={(n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)} />
        </StaggerItem>
        <StaggerItem>
          <NumericMetric label="Orders" value={todayRevenue?.numberOfOrders ?? 0} />
        </StaggerItem>
        <StaggerItem>
          <NumericMetric label="Avg Value" value={todayRevenue?.averageOrderValue ?? 0} prefix="₹" />
        </StaggerItem>
      </StaggerGroup>

      {/* Smart Summary */}
      <StaggerGroup className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <StaggerItem className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue Share</h2>
            <CircularProgress value={revenueShare?.progressPercent ?? 0} size={40} strokeWidth={4} />
          </div>
          <div>
            <div className="text-lg font-bold">{formatINR(revenueShare?.currentRent ?? 18000)}</div>
            <div className="text-xs text-muted-foreground">
              {revenueShare?.rentType ?? "Min Guarantee"} · {formatPercent(revenueShare?.progressPercent ?? 0)} to breakeven
            </div>
          </div>
          {weeklyRevenue && weeklyRevenue.some((d) => d.revenue > 0) && (
            <div className="h-12 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyRevenue}>
                  <RechartsTooltip
                    formatter={(value: number) => [formatINR(value), ""]}
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "11px", padding: "4px 8px" }}
                  />
                  <Bar dataKey="revenue" fill="currentColor" className="fill-primary/70" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </StaggerItem>

        <StaggerItem className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top This Month</h2>
          </div>
          <div className="space-y-2.5">
            {(topItems ?? []).map((item, idx) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-primary/60 w-4">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.count} sold</div>
                </div>
                <span className="text-sm font-semibold">{formatINR(item.revenue)}</span>
              </div>
            ))}
            {(!topItems || topItems.length === 0) && (
              <p className="text-xs text-muted-foreground py-2">No orders yet</p>
            )}
          </div>
          {(lowStockCount ?? 0) > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs text-destructive font-medium">{lowStockCount} low stock</span>
            </div>
          )}
        </StaggerItem>
      </StaggerGroup>

      <ActiveTasksWidget assignedTo={undefined} />

      <AnimatedPresence show={(alerts?.length ?? 0) > 0}>
        <AlertSection alerts={(alerts ?? []).slice(0, 4)} />
      </AnimatedPresence>
    </AnimatedPage>
  )
}

// ============================================================
// ACTIVE TASKS WIDGET (shared between admin & staff dashboards)
// ============================================================

function ActiveTasksWidget({ assignedTo }: { assignedTo?: string }) {
  const activeTasks = useLiveQuery(
    () => db.tasks.filter((t) => {
      if (t.status === "completed") return false
      if (assignedTo && t.assignedTo !== assignedTo) return false
      return true
    }).toArray(),
    [assignedTo]
  )

  const priorityDotColor: Record<TaskPriority, string> = {
    urgent: "bg-destructive",
    high: "bg-orange-500",
    medium: "bg-blue-500",
    low: "bg-muted-foreground/40",
  }

  if (!activeTasks || activeTasks.length === 0) return null

  const sorted = [...activeTasks].sort((a, b) => {
    const po: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
    return po[a.priority] - po[b.priority]
  })

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <ClipboardList className="h-3 w-3" />
        Active Tasks ({activeTasks.length})
      </h2>
      <div className="space-y-1.5">
        {sorted.slice(0, 4).map((task) => {
          const isOverdue = !!task.dueDate && task.dueDate < new Date().toISOString().split("T")[0]
          return (
            <div key={task.id} className="flex items-center gap-2.5 rounded-lg py-1">
              <span className={`h-2 w-2 rounded-full shrink-0 ${priorityDotColor[task.priority]}`} />
              <span className={`flex-1 text-sm font-medium truncate ${isOverdue ? "text-destructive" : ""}`}>
                {task.title}
              </span>
              {task.dueDate && (
                <span className={`text-xs shrink-0 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {isOverdue ? "Overdue" : formatDateShort(task.dueDate)}
                </span>
              )}
            </div>
          )
        })}
        {activeTasks.length > 4 && (
          <p className="text-[10px] text-muted-foreground">+{activeTasks.length - 4} more</p>
        )}
      </div>
    </div>
  )
}

// ============================================================
// STAFF DASHBOARD - minimal, no financial details
// ============================================================

function StaffDashboard() {
  const todayRevenue = useTodayRevenue()
  const lowStockItems = useLiveQuery(() =>
    db.ingredients.filter((i) => i.currentStock <= i.minimumThreshold).toArray(),
    []
  )
  const alerts = useLiveQuery(() =>
    db.alerts.filter((a) => !a.resolvedAt && (a.type === "LowStock" || a.type === "ExpiryWarning" || a.type === "TaskDue"))
      .reverse().toArray(),
    []
  )

  return (
    <AnimatedPage className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{getGreeting()}</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      <StaggerGroup className="grid grid-cols-2 gap-2.5">
        <StaggerItem>
          <NumericMetric label="Orders Today" value={todayRevenue?.numberOfOrders ?? 0} />
        </StaggerItem>
        <StaggerItem>
          <NumericMetric label="Low Stock" value={lowStockItems?.length ?? 0} alert={(lowStockItems?.length ?? 0) > 0} />
        </StaggerItem>
      </StaggerGroup>

      <AnimatedPresence show={(lowStockItems?.length ?? 0) > 0}>
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Low Stock</h2>
          <div className="flex flex-wrap gap-1.5">
            {(lowStockItems ?? []).map((item) => (
              <motion.span key={item.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center gap-1.5 rounded-full bg-destructive/8 text-destructive px-2.5 py-1 text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                {item.name}
                <span className="text-destructive/60">{item.currentStock}{item.unit}</span>
              </motion.span>
            ))}
          </div>
        </div>
      </AnimatedPresence>

      <ActiveTasksWidget assignedTo="staff" />

      <AnimatedPresence show={(alerts?.length ?? 0) > 0}>
        <AlertSection alerts={(alerts ?? []).slice(0, 4)} />
      </AnimatedPresence>
    </AnimatedPage>
  )
}

// ============================================================
// SHARED COMPONENTS
// ============================================================

function NumericMetric({ label, value, prefix = "", alert = false, formatFn }: {
  label: string; value: number; prefix?: string; alert?: boolean; formatFn?: (n: number) => string
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <AnimatedNumber value={value} prefix={prefix} formatFn={formatFn}
        className={`text-2xl font-bold mt-1 block ${alert ? "text-destructive" : ""}`} />
    </div>
  )
}

function AlertSection({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alerts</h2>
      <div className="space-y-1.5">
        {alerts.map((a) => <AlertCard key={a.id} alert={a} />)}
      </div>
    </div>
  )
}

function AlertCard({ alert }: { alert: Alert }) {
  const icons: Record<string, React.ReactNode> = {
    critical: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
    high: <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />,
    medium: <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />,
    low: <Info className="h-3.5 w-3.5 text-muted-foreground" />,
  }
  return (
    <motion.div layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
      className="flex items-center gap-2.5 rounded-lg py-1.5 group">
      {icons[alert.severity]}
      <span className="flex-1 text-sm font-medium truncate">{alert.title}</span>
      <button onClick={() => resolveAlert(alert.id!)}
        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 hover:bg-muted">
        <Check className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </motion.div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}
