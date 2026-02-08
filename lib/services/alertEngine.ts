import { supabase } from "@/lib/supabase/client"
import type { Alert } from "@/lib/db/schema"
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, parseISO } from "date-fns"

export async function runAlertEngine(): Promise<number> {
  // Fetch active rules and existing alerts (including resolved ones from today)
  // This prevents re-creating alerts that were dismissed earlier today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const [{ data: rulesData }, { data: unresolvedData }, { data: todayResolvedData }] = await Promise.all([
    supabase.from("alert_rules").select("*").eq("is_active", true),
    supabase.from("alerts").select("type,title,related_entity_id").is("resolved_at", null),
    supabase.from("alerts").select("type,title,related_entity_id").gte("created_at", todayStart.toISOString()).not("resolved_at", "is", null),
  ])
  const existingData = [...(unresolvedData ?? []), ...(todayResolvedData ?? [])]

  const activeRules = rulesData ?? []
  if (activeRules.length === 0) return 0

  const existingAlerts = existingData
  const now = new Date().toISOString()

  // Collect all check promises — run ALL checks in parallel
  const checkPromises: Promise<Omit<Alert, "id">[]>[] = []

  for (const rule of activeRules) {
    const params = (rule.parameters ?? {}) as Record<string, number | string>
    switch (rule.condition) {
      case "stock_below_threshold":
        checkPromises.push(checkLowStock(now))
        break
      case "monthly_rent_due":
        checkPromises.push(Promise.resolve(checkRentDue(params, now)))
        break
      case "daily_revenue_below":
        checkPromises.push(checkLowRevenue(params, now))
        break
      case "daily_revenue_above":
        checkPromises.push(checkHighRevenue(params, now))
        break
      case "expense_exceeds_budget":
        checkPromises.push(checkExpenseBudget(params, now))
        break
      case "expiry_within_days":
        checkPromises.push(checkExpiringIngredients(params, now))
        break
      case "task_overdue":
        checkPromises.push(checkOverdueTasks(now))
        break
    }
  }

  const results = await Promise.all(checkPromises)
  const newAlerts = results.flat()

  // Deduplicate against existing unresolved alerts
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

async function checkLowStock(now: string): Promise<Omit<Alert, "id">[]> {
  // Only select the columns we need
  const { data } = await supabase
    .from("ingredients")
    .select("id,name,current_stock,minimum_threshold,unit")

  const alerts: Omit<Alert, "id">[] = []
  for (const ing of data ?? []) {
    const stock = Number(ing.current_stock)
    const threshold = Number(ing.minimum_threshold)
    if (stock <= threshold) {
      alerts.push({
        type: "LowStock",
        severity: stock === 0 ? "critical" : stock <= threshold * 0.5 ? "high" : "medium",
        title: `Low Stock: ${ing.name}`,
        description: `${ing.name} is at ${stock} ${ing.unit} (threshold: ${threshold} ${ing.unit})`,
        relatedEntityId: ing.id,
        relatedEntityType: "ingredient",
        isRead: false,
        createdAt: now,
      })
    }
  }
  return alerts
}

function checkRentDue(
  params: Record<string, number | string>,
  now: string
): Omit<Alert, "id">[] {
  const dayOfMonth = (params.dayOfMonth as number) || 1
  const reminderDays = (params.reminderDaysBefore as number) || 3
  const today = new Date()
  const currentDay = today.getDate()

  // Only alert BEFORE or ON the due date — stop alerting after it passes
  if (currentDay > dayOfMonth) return []

  const daysUntilDue = dayOfMonth - currentDay

  if (daysUntilDue <= reminderDays) {
    // Include month in title so dedup is scoped per-month (max 1 rent alert per month)
    const monthLabel = today.toLocaleString("en-IN", { month: "long", year: "numeric" })
    return [{
      type: "RentDue",
      severity: daysUntilDue === 0 ? "high" : "medium",
      title: `Rent Due — ${monthLabel}`,
      description: daysUntilDue === 0
        ? "Rent payment is due today!"
        : `Rent payment is due in ${daysUntilDue} day(s)`,
      isRead: false,
      createdAt: now,
    }]
  }
  return []
}

async function checkLowRevenue(
  params: Record<string, number | string>,
  now: string
): Promise<Omit<Alert, "id">[]> {
  const threshold = params.amount as number
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd")
  const { data } = await supabase
    .from("daily_revenue")
    .select("total_sales")
    .eq("date", yesterday)
    .single()

  if (data && Number(data.total_sales) < threshold) {
    const totalSales = Number(data.total_sales)
    return [{
      type: "RevenueThreshold",
      severity: totalSales < threshold * 0.5 ? "high" : "medium",
      title: `Low Revenue — ${yesterday}`,
      description: `Revenue was ₹${totalSales.toLocaleString("en-IN")} (below ₹${(threshold as number).toLocaleString("en-IN")})`,
      isRead: false,
      createdAt: now,
    }]
  }
  return []
}

async function checkHighRevenue(
  params: Record<string, number | string>,
  now: string
): Promise<Omit<Alert, "id">[]> {
  const threshold = params.amount as number
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd")
  const { data } = await supabase
    .from("daily_revenue")
    .select("total_sales")
    .eq("date", yesterday)
    .single()

  if (data && Number(data.total_sales) > threshold) {
    const totalSales = Number(data.total_sales)
    return [{
      type: "RevenueThreshold",
      severity: "low",
      title: `Great Revenue — ${yesterday}`,
      description: `Revenue was ₹${totalSales.toLocaleString("en-IN")} — above ₹${(threshold as number).toLocaleString("en-IN")} target`,
      isRead: false,
      createdAt: now,
    }]
  }
  return []
}

async function checkExpenseBudget(
  params: Record<string, number | string>,
  now: string
): Promise<Omit<Alert, "id">[]> {
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
  const alerts: Omit<Alert, "id">[] = []

  const monthLabel = today.toLocaleString("en-IN", { month: "long", year: "numeric" })
  if (totalExpenses > monthlyBudget) {
    alerts.push({
      type: "HighExpense",
      severity: totalExpenses > monthlyBudget * 1.2 ? "critical" : "high",
      title: `Budget Exceeded — ${monthLabel}`,
      description: `Expenses: ₹${totalExpenses.toLocaleString("en-IN")} (budget: ₹${monthlyBudget.toLocaleString("en-IN")})`,
      isRead: false,
      createdAt: now,
    })
  } else if (totalExpenses > monthlyBudget * 0.8) {
    alerts.push({
      type: "HighExpense",
      severity: "medium",
      title: `Nearing Budget — ${monthLabel}`,
      description: `Expenses: ₹${totalExpenses.toLocaleString("en-IN")} (${Math.round((totalExpenses / monthlyBudget) * 100)}% of budget)`,
      isRead: false,
      createdAt: now,
    })
  }
  return alerts
}

async function checkExpiringIngredients(
  params: Record<string, number | string>,
  now: string
): Promise<Omit<Alert, "id">[]> {
  const warningDays = (params.days as number) || 3
  const today = new Date()

  // Only fetch ingredients with expiry dates, only needed columns
  const { data } = await supabase
    .from("ingredients")
    .select("id,name,expiry_date")
    .not("expiry_date", "is", null)

  const alerts: Omit<Alert, "id">[] = []
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
  return alerts
}

async function checkOverdueTasks(now: string): Promise<Omit<Alert, "id">[]> {
  const today = new Date().toISOString().split("T")[0]

  // Server-side filter: only incomplete tasks with due dates
  const { data } = await supabase
    .from("tasks")
    .select("id,title,due_date,priority")
    .neq("status", "completed")
    .not("due_date", "is", null)

  const alerts: Omit<Alert, "id">[] = []
  for (const task of data ?? []) {
    if (!task.due_date) continue

    if (task.due_date < today) {
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24)
      )
      alerts.push({
        type: "TaskDue",
        severity:
          task.priority === "urgent" || daysOverdue > 3
            ? "critical"
            : task.priority === "high" || daysOverdue > 1
              ? "high"
              : "medium",
        title: `Overdue: ${task.title}`,
        description: `Task "${task.title}" was due ${daysOverdue} day(s) ago (${task.priority} priority)`,
        relatedEntityId: task.id,
        relatedEntityType: "task",
        isRead: false,
        createdAt: now,
      })
    } else if (task.due_date === today) {
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
  return alerts
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
