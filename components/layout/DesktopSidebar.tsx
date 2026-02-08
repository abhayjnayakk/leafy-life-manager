"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BookOpen,
  IndianRupee,
  Settings,
  LogOut,
  Leaf,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { motion } from "framer-motion"

const ADMIN_NAV = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ShoppingCart },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Recipes", href: "/recipes", icon: BookOpen },
  { label: "Finance", href: "/finance", icon: IndianRupee },
]

const STAFF_NAV = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ShoppingCart },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Recipes", href: "/recipes", icon: BookOpen },
]

export function DesktopSidebar() {
  const pathname = usePathname()
  const { user, isAdmin, logout } = useAuth()
  const navItems = isAdmin ? ADMIN_NAV : STAFF_NAV
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.aside
      className="hidden md:flex md:flex-col md:fixed md:inset-y-0 z-50 bg-sidebar overflow-hidden"
      initial={false}
      animate={{ width: expanded ? 200 : 56 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className="flex h-10 items-center gap-2 px-3.5 border-b border-sidebar-border shrink-0">
        <Leaf className="h-5 w-5 text-sidebar-primary shrink-0" />
        <motion.span
          className="text-sm font-bold text-sidebar-foreground whitespace-nowrap overflow-hidden"
          animate={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0 }}
          transition={{ duration: 0.15 }}
        >
          Leafy Life
        </motion.span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors whitespace-nowrap",
                isActive
                  ? "text-sidebar-primary-foreground font-medium"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-sidebar-primary"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className="h-4 w-4 shrink-0 relative z-10" />
              <motion.span
                className="relative z-10 overflow-hidden"
                animate={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0 }}
                transition={{ duration: 0.15 }}
              >
                {item.label}
              </motion.span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom area */}
      <div className="border-t border-sidebar-border px-2 py-2 space-y-1 shrink-0">
        {isAdmin && (
          <Link
            href="/settings"
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors whitespace-nowrap",
              pathname === "/settings"
                ? "text-sidebar-primary-foreground font-medium"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            {pathname === "/settings" && (
              <motion.div
                layoutId="sidebar-active-bottom"
                className="absolute inset-0 rounded-lg bg-sidebar-primary"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <Settings className="h-4 w-4 shrink-0 relative z-10" />
            <motion.span
              className="relative z-10 overflow-hidden"
              animate={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0 }}
              transition={{ duration: 0.15 }}
            >
              Settings
            </motion.span>
          </Link>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors w-full whitespace-nowrap"
          title="Sign out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <motion.span
            className="overflow-hidden"
            animate={{ opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0 }}
            transition={{ duration: 0.15 }}
          >
            Sign out
          </motion.span>
        </button>
      </div>
    </motion.aside>
  )
}
