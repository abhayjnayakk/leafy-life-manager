"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Header } from "./Header"
import { MobileNav } from "./MobileNav"
import { DesktopSidebar } from "./DesktopSidebar"
import { useAuth } from "@/lib/auth"

// Routes that are admin-only
const ADMIN_ONLY_ROUTES = ["/finance", "/settings"]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isStaff } = useAuth()

  // Staff trying to access admin-only routes
  const isBlocked =
    isStaff && ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r))

  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <div className="md:pl-14">
        <Header />
        <main className="px-3 py-3 pb-16 md:px-6 md:py-4 md:pb-6 max-w-7xl mx-auto lg:px-8">
          {isBlocked ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="text-4xl">🔒</div>
              <h2 className="text-lg font-semibold">Access Restricted</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                This section is available to admins only. Contact your
                administrator for access.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
