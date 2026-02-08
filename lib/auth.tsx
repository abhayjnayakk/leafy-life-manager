"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import { recordLogin, recordLogout } from "@/lib/services/loginHistory"

// ============================================================
// TYPES
// ============================================================

export type UserRole = "admin" | "staff"

export interface AuthUser {
  userId: string
  role: UserRole
  name: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isAdmin: boolean
  isStaff: boolean
  login: (password: string) => { success: boolean; error?: string }
  logout: () => void
}

// ============================================================
// CREDENTIALS
// ============================================================

const CREDENTIALS: Array<{
  password: string
  role: UserRole
  name: string
  userId: string
}> = [
  // Admins
  { password: "abhay@2026", role: "admin", name: "Abhay", userId: "abhay" },
  { password: "bharat@2026", role: "admin", name: "Bharat", userId: "bharat" },
  { password: "gautami@2026", role: "admin", name: "Gautami", userId: "gautami" },
  // Staff
  { password: "vereesh@2026", role: "staff", name: "Vereesh", userId: "vereesh" },
  // Admin-as-Staff (for testing)
  { password: "0987", role: "staff", name: "Admin Test", userId: "admin_staff" },
]

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "buble_leafy_auth"
const SESSION_KEY = "buble_leafy_session"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const sessionRef = useRef<string>("")

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser
        if (parsed.role && parsed.name && parsed.userId) {
          setUser(parsed)
        }
      }
      const sess = localStorage.getItem(SESSION_KEY)
      if (sess) sessionRef.current = sess
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  const login = useCallback((password: string) => {
    const trimmed = password.trim()
    const match = CREDENTIALS.find((c) => c.password === trimmed)
    if (!match) {
      return { success: false, error: "Invalid password" }
    }
    const authUser: AuthUser = {
      userId: match.userId,
      role: match.role,
      name: match.name,
    }
    setUser(authUser)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser))

    // Record login in Supabase (fire-and-forget)
    recordLogin(match.userId, match.name, match.role)
      .then((sessionId) => {
        sessionRef.current = sessionId
        localStorage.setItem(SESSION_KEY, sessionId)
      })
      .catch(console.error)

    return { success: true }
  }, [])

  const logout = useCallback(() => {
    // Record logout
    if (sessionRef.current) {
      recordLogout(sessionRef.current).catch(console.error)
    }
    setUser(null)
    sessionRef.current = ""
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: user !== null,
    isAdmin: user?.role === "admin",
    isStaff: user?.role === "staff",
    login,
    logout,
  }), [user, login, logout])

  // Don't render until hydrated to avoid flash
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="text-lg font-semibold tracking-tight">Leafy Life</div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
