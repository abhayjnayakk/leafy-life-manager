"use client"

import { Bell, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSupaAlerts } from "@/lib/hooks/useSupaAlerts"
import { useAuth } from "@/lib/auth"
import { motion, AnimatePresence } from "framer-motion"

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/orders": "Orders",
  "/inventory": "Inventory",
  "/recipes": "Recipes",
  "/finance": "Finance",
  "/settings": "Settings",
}

export function Header() {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? "Leafy Life"
  const { alerts } = useSupaAlerts()
  const { logout } = useAuth()

  const unreadCount = alerts.filter((a) => !a.isRead && !a.resolvedAt).length

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="flex h-10 items-center justify-between px-4 md:px-6">
        {/* Page title */}
        <AnimatePresence mode="wait">
          <motion.h1
            key={pathname}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="text-base font-semibold tracking-tight"
          >
            {title}
          </motion.h1>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Alert bell */}
          <Link
            href="/"
            className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-muted transition-colors"
          >
            <Bell className="h-[18px] w-[18px] text-muted-foreground" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground"
                >
                  {unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {/* Logout button */}
          <button
            onClick={logout}
            className="inline-flex items-center justify-center rounded-full p-2 hover:bg-destructive/10 transition-colors"
            title="Logout"
          >
            <LogOut className="h-[18px] w-[18px] text-muted-foreground" />
          </button>
        </div>
      </div>
    </header>
  )
}
