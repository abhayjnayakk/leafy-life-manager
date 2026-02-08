import { db } from "@/lib/db/client"
import type { Task, TaskStatus } from "@/lib/db/schema"

export async function addTask(
  data: Omit<Task, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const now = new Date().toISOString()
  return db.tasks.add({
    ...data,
    createdAt: now,
    updatedAt: now,
  }) as Promise<number>
}

export async function updateTaskStatus(
  id: number,
  status: TaskStatus
): Promise<void> {
  const now = new Date().toISOString()
  const update: Partial<Task> = {
    status,
    updatedAt: now,
  }
  if (status === "completed") {
    update.completedAt = now
    // Auto-resolve any related TaskDue alerts
    const relatedAlerts = await db.alerts
      .filter((a) => a.type === "TaskDue" && a.relatedEntityId === id && !a.resolvedAt)
      .toArray()
    for (const alert of relatedAlerts) {
      await db.alerts.update(alert.id!, { resolvedAt: now })
    }
  } else {
    update.completedAt = undefined
  }
  await db.tasks.update(id, update)
}

export async function deleteTask(id: number): Promise<void> {
  // Also resolve any related alerts
  const now = new Date().toISOString()
  const relatedAlerts = await db.alerts
    .filter((a) => a.type === "TaskDue" && a.relatedEntityId === id && !a.resolvedAt)
    .toArray()
  for (const alert of relatedAlerts) {
    await db.alerts.update(alert.id!, { resolvedAt: now })
  }
  await db.tasks.delete(id)
}
