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
  needsUserSelection: boolean
  login: (password: string) => { success: boolean; error?: string }
  selectUser: (userId: string, password: string) => { success: boolean; error?: string }
  logout: () => void
}

// ============================================================
// CREDENTIALS
// ============================================================

/** Single master password for all users */
const MASTER_PASSWORD = "lifeleafy@2026"

/** Shortcut PINs that bypass user selection */
const SHORTCUT_CREDENTIALS: Array<{
  password: string
  role: UserRole
  name: string
  userId: string
}> = [
  { password: "0987", role: "staff", name: "Admin Test", userId: "admin_staff" },
]

/** All selectable users shown on the "Who are you?" page */
export const USERS: Array<{
  userId: string
  name: string
  role: UserRole
  password: string
}> = [
  { userId: "abhay", name: "Abhay", role: "admin", password: "abhay@2026" },
  { userId: "bharat", name: "Bharat", role: "admin", password: "bharat@2026" },
  { userId: "gautami", name: "Gautami", role: "admin", password: "gautami@2026" },
  { userId: "vereesh", name: "Vereesh", role: "staff", password: "vereesh@2026" },
]

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "buble_leafy_auth"
const SESSION_KEY = "buble_leafy_session"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [masterAuthenticated, setMasterAuthenticated] = useState(false)
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
          setMasterAuthenticated(true) // already fully logged in
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

    // Check shortcut PINs first (bypass user selection)
    const shortcut = SHORTCUT_CREDENTIALS.find((c) => c.password === trimmed)
    if (shortcut) {
      const authUser: AuthUser = {
        userId: shortcut.userId,
        role: shortcut.role,
        name: shortcut.name,
      }
      setUser(authUser)
      setMasterAuthenticated(true)
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser))
      recordLogin(shortcut.userId, shortcut.name, shortcut.role)
        .then((sessionId) => {
          sessionRef.current = sessionId
          localStorage.setItem(SESSION_KEY, sessionId)
        })
        .catch(console.error)
      return { success: true }
    }

    // Check master password
    if (trimmed === MASTER_PASSWORD) {
      setMasterAuthenticated(true)
      return { success: true }
    }

    return { success: false, error: "Invalid password" }
  }, [])

  const selectUser = useCallback((userId: string, password: string) => {
    const match = USERS.find((u) => u.userId === userId)
    if (!match) return { success: false, error: "User not found" }

    if (password.trim() !== match.password) {
      return { success: false, error: "Wrong password" }
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
    setMasterAuthenticated(false)
    sessionRef.current = ""
    localStorage.removeItem(AUTH_STORAGE_KEY)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: user !== null,
    isAdmin: user?.role === "admin",
    isStaff: user?.role === "staff",
    needsUserSelection: masterAuthenticated && user === null,
    login,
    selectUser,
    logout,
  }), [user, masterAuthenticated, login, selectUser, logout])

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
