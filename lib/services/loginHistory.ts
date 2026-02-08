import { supabase } from "@/lib/supabase/client"

export async function recordLogin(
  userId: string,
  userName: string,
  role: string
): Promise<string> {
  const { data, error } = await supabase
    .from("login_history")
    .insert({
      user_id: userId,
      user_name: userName,
      role,
    })
    .select("id")
    .single()

  if (error) {
    console.error("Failed to record login:", error.message)
    return ""
  }
  return data.id as string
}

export async function recordLogout(sessionId: string): Promise<void> {
  if (!sessionId) return
  const { error } = await supabase
    .from("login_history")
    .update({ logout_at: new Date().toISOString() })
    .eq("id", sessionId)

  if (error) console.error("Failed to record logout:", error.message)
}

export async function fetchLoginHistory(limit = 50) {
  const { data, error } = await supabase
    .from("login_history")
    .select("*")
    .order("login_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Failed to fetch login history:", error.message)
    return []
  }
  return data ?? []
}
