import { supabase } from "@/lib/supabase/client"
import type { Alert } from "@/lib/db/schema"
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, parseISO } from "date-fns"
import { fetchAllTasks } from "@/lib/services/tasks"

export async function runAlertEngine(): Promise<number> {
  // Read alert rules from Supabase
  const { data: rulesData } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("is_active", true)

  const activeRules = rulesData ?? []
  const newAlerts: Omit<Alert, "id">[] = []
  const now = new Date().toISOString()

  for (const rule of activeRules) {
    const params = (rule.parameters ?? {}) as Record<string, number | string>
    switch (rule.condition) {
      case "stock_below_threshold":
        await checkLowStock(newAlerts, now)
        break
      case "monthly_rent_due":
        checkRentDue(params, newAlerts, now)
        break
      case "daily_revenue_below":
        await checkLowRevenue(params, newAlerts, now)
        break
      case "daily_revenue_above":
        await checkHighRevenue(params, newAlerts, now)
        break
      case "expense_exceeds_budget":
        await checkExpenseBudget(params, newAlerts, now)
        break
      case "expiry_within_days":
        await checkExpiringIngredients(params, newAlerts, now)
        break
      case "task_overdue":
        await checkOverdueTasks(newAlerts, now)
        break
    }
  }

  // Deduplicate against existing unresolved alerts in Supabase
  const { data: existingData } = await supabase
    .from("alerts")
    .select("*")
    .is("resolved_at", null)

  const existingAlerts = existingData ?? []

  const trulyNew = newAlerts.filter(
    (na) =>
      !existingAlerts.some(
        (ea: any) =>
          ea.type === na.type &&
          ea.related_entity_id === (na.relatedEntityId ? String(na.relatedEntityId) : null) &&
          ea.title === na.title
      )
  )

  if (trulyNew.length > 0) {
    const rows = trulyNew.map((a) => ({
      type: a.type,
      severity: a.severity,
      title: a.title,
      description: a.description ?? null,
      related_entity_id: a.relatedEntityId ? String(a.relatedEntityId) : null,
      related_entity_type: a.relatedEntityType ?? null,
      is_read: false,
      created_at: now,
    }))
    await supabase.from("alerts").insert(rows)
  }

  return trulyNew.length
}

async function checkLowStock(
  alerts: Omit<Alert, "id">[],
  now: string
): Promise<void> {
  const { data } = await supabase.from("ingredients").select("*")
  const ingredients = data ?? []

  for (const ing of ingredients) {
    const stock = Number(ing.current_stock)
    const threshold = Number(ing.minimum_threshold)
    if (stock <= threshold) {
      const severity =
        stock === 0
          ? "critical"
          : stock <= threshold * 0.5
            ? "high"
            : "medium"
      alerts.push({
        type: "LowStock",
        severity,
        title: `Low Stock: ${ing.name}`,
        description: `${ing.name} is at ${stock} ${ing.unit} (threshold: ${threshold} ${ing.unit})`,
        relatedEntityId: ing.id,
        relatedEntityType: "ingredient",
        isRead: false,
        createdAt: now,
      })
    }
  }
}

function checkRentDue(
  params: Record<string, number | string>,
  alerts: Omit<Alert, "id">[],
  now: string
): void {
  const dayOfMonth = (params.dayOfMonth as number) || 1
  const reminderDays = (params.reminderDaysBefore as number) || 3
  const currentDay = new Date().getDate()
  const daysUntilDue =
    dayOfMonth >= currentDay ? dayOfMonth - currentDay : 0

  if (daysUntilDue <= reminderDays) {
    alerts.push({
      type: "RentDue",
      severity: daysUntilDue === 0 ? "high" : "medium",
      title: "Rent Payment Due",
      description:
        daysUntilDue === 0
          ? "Rent payment is due today!"
          : `Rent payment is due in ${daysUntilDue} day(s)`,
      isRead: false,
      createdAt: now,
    })
  }
}

async function checkLowRevenue(
  params: Record<string, number | string>,
  alerts: Omit<Alert, "id">[],
  now: string
): Promise<void> {
  const threshold = params.amount as number
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd")
  const { data } = await supabase
    .from("daily_revenue")
    .select("*")
    .eq("date", yesterday)
    .single()

  if (data && Number(data.total_sales) < threshold) {
    const totalSales = Number(data.total_sales)
    alerts.push({
      type: "RevenueThreshold",
      severity: totalSales < threshold * 0.5 ? "high" : "medium",
      title: "Low Revenue Alert",
      description: `Yesterday's revenue was Rs ${totalSales.toLocaleString("en-IN")} (below Rs ${(threshold as number).toLocaleString("en-IN")})`,
      isRead: false,
      createdAt: now,
    })
  }
}

async function checkHighRevenue(
  params: Record<string, number | string>,
  alerts: Omit<Alert, "id">[],
  now: string
): Promise<void> {
  const threshold = params.amount as number
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd")
  const { data } = await supabase
    .from("daily_revenue")
    .select("*")
    .eq("date", yesterday)
    .single()

  if (data && Number(data.total_sales) > threshold) {
    const totalSales = Number(data.total_sales)
    alerts.push({
      type: "RevenueThreshold",
      severity: "low",
      title: "Great Revenue Day!",
      description: `Yesterday's revenue was Rs ${totalSales.toLocaleString("en-IN")} - above Rs ${(threshold as number).toLocaleString("en-IN")} target`,
      isRead: false,
      createdAt: now,
    })
  }
}

async function checkExpenseBudget(
  params: Record<string, number | string>,
  alerts: Omit<Alert, "id">[],
  now: string
): Promise<void> {
  const monthlyBudget = params.monthlyBudget as number
  const today = new Date()
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd")
  const monthEnd = format(endOfMonth(today), "yyyy-MM-dd")

  const { data } = await supabase
    .from("expenses")
    .select("amount")
    .gte("date", monthStart)
    .lte("date", monthEnd)

  const totalExpenses = (data ?? []).reduce((s: number, e: any) => s + Number(e.amount), 0)

  if (totalExpenses > monthlyBudget) {
    alerts.push({
      type: "HighExpense",
      severity: totalExpenses > monthlyBudget * 1.2 ? "critical" : "high",
      title: "Monthly Expense Budget Exceeded",
      description: `Total expenses: Rs ${totalExpenses.toLocaleString("en-IN")} (budget: Rs ${monthlyBudget.toLocaleString("en-IN")})`,
      isRead: false,
      createdAt: now,
    })
  } else if (totalExpenses > monthlyBudget * 0.8) {
    alerts.push({
      type: "HighExpense",
      severity: "medium",
      title: "Approaching Expense Budget",
      description: `Total expenses: Rs ${totalExpenses.toLocaleString("en-IN")} (${Math.round((totalExpenses / monthlyBudget) * 100)}% of budget)`,
      isRead: false,
      createdAt: now,
    })
  }
}

async function checkExpiringIngredients(
  params: Record<string, number | string>,
  alerts: Omit<Alert, "id">[],
  now: string
): Promise<void> {
  const warningDays = (params.days as number) || 3
  const today = new Date()

  const { data } = await supabase
    .from("ingredients")
    .select("*")
    .not("expiry_date", "is", null)

  for (const ing of data ?? []) {
    if (!ing.expiry_date) continue
    const expiry = parseISO(ing.expiry_date)
    const daysLeft = differenceInDays(expiry, today)

    if (daysLeft < 0) {
      alerts.push({
        type: "ExpiryWarning",
        severity: "critical",
        title: `Expired: ${ing.name}`,
        description: `${ing.name} expired ${Math.abs(daysLeft)} day(s) ago`,
        relatedEntityId: ing.id,
        relatedEntityType: "ingredient",
        isRead: false,
        createdAt: now,
      })
    } else if (daysLeft <= warningDays) {
      alerts.push({
        type: "ExpiryWarning",
        severity: daysLeft <= 1 ? "high" : "medium",
        title: `Expiring Soon: ${ing.name}`,
        description: `${ing.name} expires in ${daysLeft} day(s)`,
        relatedEntityId: ing.id,
        relatedEntityType: "ingredient",
        isRead: false,
        createdAt: now,
      })
    }
  }
}

async function checkOverdueTasks(
  alerts: Omit<Alert, "id">[],
  now: string
): Promise<void> {
  const today = new Date().toISOString().split("T")[0]

  const allTasks = await fetchAllTasks()
  const tasks = allTasks.filter((t) => t.status !== "completed" && !!t.dueDate)

  for (const task of tasks) {
    if (!task.dueDate) continue

    if (task.dueDate < today) {
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      )
      const severity =
        task.priority === "urgent" || daysOverdue > 3
          ? "critical"
          : task.priority === "high" || daysOverdue > 1
            ? "high"
            : "medium"
      alerts.push({
        type: "TaskDue",
        severity,
        title: `Overdue: ${task.title}`,
        description: `Task "${task.title}" was due ${daysOverdue} day(s) ago (${task.priority} priority)`,
        relatedEntityId: task.id,
        relatedEntityType: "task",
        isRead: false,
        createdAt: now,
      })
    } else if (task.dueDate === today) {
      alerts.push({
        type: "TaskDue",
        severity: task.priority === "urgent" ? "high" : "low",
        title: `Due Today: ${task.title}`,
        description: `Task "${task.title}" is due today (${task.priority} priority)`,
        relatedEntityId: task.id,
        relatedEntityType: "task",
        isRead: false,
        createdAt: now,
      })
    }
  }
}

export async function resolveAlert(alertId: string): Promise<void> {
  await supabase
    .from("alerts")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", alertId)
}

export async function markAlertRead(alertId: string): Promise<void> {
  await supabase
    .from("alerts")
    .update({ is_read: true })
    .eq("id", alertId)
}

export async function dismissAllAlerts(): Promise<void> {
  const now = new Date().toISOString()
  await supabase
    .from("alerts")
    .update({ resolved_at: now, is_read: true })
    .is("resolved_at", null)
}
