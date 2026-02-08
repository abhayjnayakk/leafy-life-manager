"use client"

import { useMemo, useState } from "react"
import { formatINR, formatPercent } from "@/lib/format"
import {
  useMonthlyRevenueShareStatus,
  useWeeklyRevenue,
  useTodayRevenue,
} from "@/lib/hooks/useFinance"
import { useSupaIngredients } from "@/lib/hooks/useSupaIngredients"
import { useSupaAlerts } from "@/lib/hooks/useSupaAlerts"
import { useSupaOrders } from "@/lib/hooks/useSupaOrders"
import { useAuth } from "@/lib/auth"
import {
  Check,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  ClipboardList,
  Plus,
  Square,
  CheckSquare,
} from "lucide-react"
import { resolveAlert } from "@/lib/services/alertEngine"
import type { Alert, TaskPriority, TaskAssignee } from "@/lib/db/schema"
import { formatDateShort } from "@/lib/format"
import { useTasks } from "@/lib/hooks/useTasks"
import { updateTaskStatus, addTask } from "@/lib/services/tasks"
import { toast } from "sonner"
import {
  AnimatedPage,
  AnimatedNumber,
  StaggerGroup,
  StaggerItem,
  CircularProgress,
  AnimatedPresence,
} from "@/components/ui/animated"
import { motion, AnimatePresence } from "framer-motion"
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

  const { ingredients } = useSupaIngredients()
  const lowStockCount = useMemo(
    () => ingredients.filter((i) => i.currentStock <= i.minimumThreshold).length,
    [ingredients]
  )

  const { alerts: allAlerts } = useSupaAlerts()
  const alerts = useMemo(
    () => allAlerts.filter((a) => !a.resolvedAt),
    [allAlerts]
  )

  const { orders } = useSupaOrders()
  const topItems = useMemo(() => {
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString().split("T")[0]
    const todayStr = today.toISOString().split("T")[0]
    const monthOrders = orders.filter((o) => o.date >= monthStart && o.date <= todayStr)
    const counts: Record<string, { name: string; count: number; revenue: number }> = {}
    for (const order of monthOrders) {
      for (const item of order.items) {
        const key = item.menuItemName
        if (!counts[key]) counts[key] = { name: key, count: 0, revenue: 0 }
        counts[key].count += item.quantity
        counts[key].revenue += item.lineTotal
      }
    }
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 3)
  }, [orders])

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

      <TasksWidget assignedTo={undefined} />

      <AnimatedPresence show={(alerts?.length ?? 0) > 0}>
        <AlertSection alerts={(alerts ?? []).slice(0, 4)} />
      </AnimatedPresence>
    </AnimatedPage>
  )
}

// ============================================================
// INTERACTIVE TASKS WIDGET (shared between admin & staff)
// ============================================================

function TasksWidget({ assignedTo }: { assignedTo?: string }) {
  const { user } = useAuth()
  const { tasks: allTasks } = useTasks()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [adding, setAdding] = useState(false)

  const activeTasks = allTasks.filter((t) => {
    if (t.status === "completed") return false
    if (assignedTo && t.assignedTo !== assignedTo) return false
    return true
  })

  const priorityDotColor: Record<TaskPriority, string> = {
    urgent: "bg-destructive",
    high: "bg-orange-500",
    medium: "bg-blue-500",
    low: "bg-muted-foreground/40",
  }

  const sorted = [...activeTasks].sort((a, b) => {
    const po: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
    return po[a.priority] - po[b.priority]
  })

  async function handleToggleComplete(taskId: string) {
    try {
      await updateTaskStatus(taskId, "completed", user?.name)
      toast.success("Task completed")
    } catch {
      toast.error("Failed to complete task")
    }
  }

  async function handleAddTask() {
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      await addTask({
        title: newTitle.trim(),
        priority: "medium",
        status: "pending",
        assignedTo: (user?.role as TaskAssignee) ?? "admin",
        createdBy: user?.name ?? "Unknown",
      })
      setNewTitle("")
      setShowAddForm(false)
      toast.success("Task added")
    } catch {
      toast.error("Failed to add task")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <ClipboardList className="h-3 w-3" />
          Tasks {activeTasks.length > 0 && `(${activeTasks.length})`}
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {/* Quick Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 pb-1">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                placeholder="New task..."
                autoFocus
                className="flex-1 rounded-md border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleAddTask}
                disabled={adding || !newTitle.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {adding ? "..." : "Add"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      <div className="space-y-1">
        {sorted.length === 0 && !showAddForm && (
          <p className="text-xs text-muted-foreground text-center py-3">No active tasks</p>
        )}
        {sorted.slice(0, 6).map((task) => {
          const isOverdue = !!task.dueDate && task.dueDate < new Date().toISOString().split("T")[0]
          return (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 rounded-lg py-1.5 group"
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggleComplete(task.id!)}
                className="shrink-0 mt-0.5 text-muted-foreground hover:text-primary transition-colors"
              >
                <Square className="h-3.5 w-3.5" />
              </button>

              {/* Priority dot */}
              <span className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${priorityDotColor[task.priority]}`} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium leading-tight ${isOverdue ? "text-destructive" : ""}`}>
                  {task.title}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                  {task.createdBy && (
                    <span>by {task.createdBy}</span>
                  )}
                  {task.dueDate && (
                    <>
                      <span>·</span>
                      <span className={isOverdue ? "text-destructive font-medium" : ""}>
                        {isOverdue ? "Overdue" : formatDateShort(task.dueDate)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
        {activeTasks.length > 6 && (
          <p className="text-[10px] text-muted-foreground">+{activeTasks.length - 6} more</p>
        )}
      </div>

      {/* Recently Completed (last 3) */}
      <RecentlyCompleted assignedTo={assignedTo} />
    </div>
  )
}

function RecentlyCompleted({ assignedTo }: { assignedTo?: string }) {
  const { tasks } = useTasks()
  const { user } = useAuth()

  const completed = tasks
    .filter((t) => {
      if (t.status !== "completed") return false
      if (assignedTo && t.assignedTo !== assignedTo) return false
      return true
    })
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .slice(0, 3)

  if (completed.length === 0) return null

  async function handleReopen(taskId: string) {
    try {
      await updateTaskStatus(taskId, "pending", undefined)
      toast.success("Task reopened")
    } catch {
      toast.error("Failed to reopen task")
    }
  }

  return (
    <div className="pt-2 border-t space-y-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recently Done</p>
      {completed.map((task) => (
        <div key={task.id} className="flex items-center gap-2 py-0.5 group">
          <button
            onClick={() => handleReopen(task.id!)}
            className="shrink-0 text-green-500 hover:text-muted-foreground transition-colors"
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </button>
          <span className="flex-1 text-xs text-muted-foreground line-through truncate">
            {task.title}
          </span>
          {task.completedBy && (
            <span className="text-[10px] text-muted-foreground/60 shrink-0">
              by {task.completedBy}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================================
// STAFF DASHBOARD - minimal, no financial details
// ============================================================

function StaffDashboard() {
  const todayRevenue = useTodayRevenue()

  const { ingredients } = useSupaIngredients()
  const lowStockItems = useMemo(
    () => ingredients.filter((i) => i.currentStock <= i.minimumThreshold),
    [ingredients]
  )

  const { alerts: allAlerts } = useSupaAlerts()
  const alerts = useMemo(
    () => allAlerts.filter((a) => !a.resolvedAt && (a.type === "LowStock" || a.type === "ExpiryWarning" || a.type === "TaskDue")),
    [allAlerts]
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

      <TasksWidget assignedTo="staff" />

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
      <button onClick={() => resolveAlert(String(alert.id!))}
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
