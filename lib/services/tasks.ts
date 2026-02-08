import { supabase } from "@/lib/supabase/client"
import { db } from "@/lib/db/client"
import type { Task, TaskStatus, TaskAssignee } from "@/lib/db/schema"

// ============================================================
// Task → Supabase row mapping
// ============================================================

function taskToRow(data: Omit<Task, "id" | "createdAt" | "updatedAt">) {
  return {
    title: data.title,
    description: data.description ?? null,
    due_date: data.dueDate ?? null,
    priority: data.priority,
    status: data.status,
    assigned_to: data.assignedTo,
    completed_at: data.completedAt ?? null,
    created_by: data.createdBy,
  }
}

// ============================================================
// CRUD operations — Supabase as source of truth
// ============================================================

export async function addTask(
  data: Omit<Task, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const { data: inserted, error } = await supabase
    .from("tasks")
    .insert(taskToRow(data))
    .select("id")
    .single()

  if (error) throw new Error(`Failed to add task: ${error.message}`)
  return inserted.id as string
}

export async function updateTask(
  id: string,
  data: Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (data.title !== undefined) row.title = data.title
  if (data.description !== undefined) row.description = data.description ?? null
  if (data.dueDate !== undefined) row.due_date = data.dueDate ?? null
  if (data.priority !== undefined) row.priority = data.priority
  if (data.status !== undefined) row.status = data.status
  if (data.assignedTo !== undefined) row.assigned_to = data.assignedTo
  if (data.completedAt !== undefined) row.completed_at = data.completedAt ?? null

  const { error } = await supabase.from("tasks").update(row).eq("id", id)
  if (error) throw new Error(`Failed to update task: ${error.message}`)
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus
): Promise<void> {
  const now = new Date().toISOString()
  const row: Record<string, unknown> = {
    status,
    updated_at: now,
    completed_at: status === "completed" ? now : null,
  }

  const { error } = await supabase.from("tasks").update(row).eq("id", id)
  if (error) throw new Error(`Failed to update task status: ${error.message}`)

  // Auto-resolve related TaskDue alerts in local Dexie
  if (status === "completed") {
    const relatedAlerts = await db.alerts
      .filter(
        (a) =>
          a.type === "TaskDue" &&
          String(a.relatedEntityId) === String(id) &&
          !a.resolvedAt
      )
      .toArray()
    for (const alert of relatedAlerts) {
      await db.alerts.update(alert.id!, { resolvedAt: now })
    }
  }
}

export async function deleteTask(id: string): Promise<void> {
  // Resolve related local alerts first
  const now = new Date().toISOString()
  const relatedAlerts = await db.alerts
    .filter(
      (a) =>
        a.type === "TaskDue" &&
        String(a.relatedEntityId) === String(id) &&
        !a.resolvedAt
    )
    .toArray()
  for (const alert of relatedAlerts) {
    await db.alerts.update(alert.id!, { resolvedAt: now })
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id)
  if (error) throw new Error(`Failed to delete task: ${error.message}`)
}

// ============================================================
// Fetch tasks (for alert engine — non-reactive)
// ============================================================

export async function fetchAllTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to fetch tasks:", error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    dueDate: row.due_date ?? undefined,
    priority: row.priority as Task["priority"],
    status: row.status as TaskStatus,
    assignedTo: row.assigned_to as TaskAssignee,
    completedAt: row.completed_at ?? undefined,
    createdBy: row.created_by as TaskAssignee,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}
