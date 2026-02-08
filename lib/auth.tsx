"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react"

// ============================================================
// TYPES
// ============================================================

export type UserRole = "admin" | "staff"

export interface AuthUser {
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
// CREDENTIALS (local-first app, stored in code)
// ============================================================

const CREDENTIALS: Array<{
  password: string
  role: UserRole
  name: string
}> = [
  { password: "lifeleafy@2026", role: "admin", name: "Admin" },
  { password: "0987", role: "staff", name: "Staff" },
]

// ============================================================
// CONTEXT
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "buble_leafy_auth"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as AuthUser
        if (parsed.role && parsed.name) {
          setUser(parsed)
        }
      }
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
    const authUser: AuthUser = { role: match.role, name: match.name }
    setUser(authUser)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser))
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
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
