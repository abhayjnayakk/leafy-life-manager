import { db } from "@/lib/db/client"
import type { Alert } from "@/lib/db/schema"
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, parseISO } from "date-fns"

export async function runAlertEngine(): Promise<number> {
  const activeRules = await db.alertRules.filter((r) => r.isActive).toArray()
  const newAlerts: Omit<Alert, "id">[] = []
  const now = new Date().toISOString()

  for (const rule of activeRules) {
    switch (rule.condition) {
      case "stock_below_threshold":
        await checkLowStock(newAlerts, now)
        break
      case "monthly_rent_due":
        checkRentDue(rule.parameters, newAlerts, now)
        break
      case "daily_revenue_below":
        await checkLowRevenue(rule.parameters, newAlerts, now)
        break
      case "daily_revenue_above":
        await checkHighRevenue(rule.parameters, newAlerts, now)
        break
      case "expense_exceeds_budget":
        await checkExpenseBudget(rule.parameters, newAlerts, now)
        break
      case "expiry_within_days":
        await checkExpiringIngredients(rule.parameters, newAlerts, now)
        break
      case "task_overdue":
        await checkOverdueTasks(newAlerts, now)
        break
    }
  }

  // Deduplicate against existing unresolved alerts
  const existingAlerts = await db.alerts
    .filter((a) => !a.resolvedAt)
    .toArray()

  const trulyNew = newAlerts.filter(
    (na) =>
      !existingAlerts.some(
        (ea) =>
          ea.type === na.type &&
          ea.relatedEntityId === na.relatedEntityId &&
          ea.title === na.title
      )
  )

  if (trulyNew.length > 0) {
    await db.alerts.bulkAdd(trulyNew as Alert[])
  }

  return trulyNew.length
}

async function checkLowStock(
  alerts: Omit<Alert, "id">[],
  now: string
): Promise<void> {
  const ingredients = await db.ingredients.toArray()
  for (const ing of ingredients) {
    if (ing.currentStock <= ing.minimumThreshold) {
      const severity =
        ing.currentStock === 0
          ? "critical"
          : ing.currentStock <= ing.minimumThreshold * 0.5
            ? "high"
            : "medium"
      alerts.push({
        type: "LowStock",
        severity,
        title: `Low Stock: ${ing.name}`,
        description: `${ing.name} is at ${ing.currentStock} ${ing.unit} (threshold: ${ing.minimumThreshold} ${ing.unit})`,
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
  const record = await db.dailyRevenue.where("date").equals(yesterday).first()

  if (record && record.totalSales < threshold) {
    alerts.push({
      type: "RevenueThreshold",
      severity: record.totalSales < threshold * 0.5 ? "high" : "medium",
      title: "Low Revenue Alert",
      description: `Yesterday's revenue was Rs ${record.totalSales.toLocaleString("en-IN")} (below Rs ${(threshold as number).toLocaleString("en-IN")})`,
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
  const record = await db.dailyRevenue.where("date").equals(yesterday).first()

  if (record && record.totalSales > threshold) {
    alerts.push({
      type: "RevenueThreshold",
      severity: "low",
      title: "Great Revenue Day!",
      description: `Yesterday's revenue was Rs ${record.totalSales.toLocaleString("en-IN")} - above Rs ${(threshold as number).toLocaleString("en-IN")} target`,
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

  const monthExpenses = await db.expenses
    .where("date")
    .between(monthStart, monthEnd, true, true)
    .toArray()

  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0)

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
  const ingredients = await db.ingredients.toArray()

  for (const ing of ingredients) {
    if (!ing.expiryDate) continue
    const expiry = parseISO(ing.expiryDate)
    const daysLeft = differenceInDays(expiry, today)

    if (daysLeft < 0) {
      // Already expired
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
  const tasks = await db.tasks
    .filter((t) => t.status !== "completed" && !!t.dueDate)
    .toArray()

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

export async function resolveAlert(alertId: number): Promise<void> {
  await db.alerts.update(alertId, {
    resolvedAt: new Date().toISOString(),
  })
}

export async function markAlertRead(alertId: number): Promise<void> {
  await db.alerts.update(alertId, { isRead: true })
}

export async function dismissAllAlerts(): Promise<void> {
  const unresolved = await db.alerts.filter((a) => !a.resolvedAt).toArray()
  const now = new Date().toISOString()
  await Promise.all(
    unresolved.map((a) =>
      db.alerts.update(a.id!, { resolvedAt: now, isRead: true })
    )
  )
}
