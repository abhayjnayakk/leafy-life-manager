"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BookOpen,
  IndianRupee,
  Settings2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { motion } from "framer-motion"

const ADMIN_NAV = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ShoppingCart },
  { label: "Stock", href: "/inventory", icon: Package },
  { label: "Finance", href: "/finance", icon: IndianRupee },
  { label: "Settings", href: "/settings", icon: Settings2 },
]

const STAFF_NAV = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ShoppingCart },
  { label: "Stock", href: "/inventory", icon: Package },
  { label: "Recipes", href: "/recipes", icon: BookOpen },
]

export function MobileNav() {
  const pathname = usePathname()
  const { isAdmin } = useAuth()
  const navItems = isAdmin ? ADMIN_NAV : STAFF_NAV

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/90 backdrop-blur-lg supports-[backdrop-filter]:bg-card/70 md:hidden">
      <div className="flex h-[52px] items-center justify-around px-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px]"
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-pill"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                whileTap={{ scale: 0.85 }}
                className="relative z-10"
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-primary stroke-[2.5]" : "text-muted-foreground"
                  )}
                />
              </motion.div>
              <span
                className={cn(
                  "relative z-10 transition-colors",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
