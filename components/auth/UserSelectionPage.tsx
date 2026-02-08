"use client"

import { useAuth, USERS } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Leaf, Shield, UserCheck, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"

export function UserSelectionPage() {
  const { selectUser, logout } = useAuth()

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(145deg, #f5f0e8 0%, #e8ede0 50%, #dde6d0 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Brand */}
        <div className="text-center space-y-3">
          <motion.div
            animate={{
              y: [0, -6, 0],
              rotate: [0, 3, -3, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-1 shadow-lg shadow-primary/20"
          >
            <Leaf className="h-8 w-8" />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Who are you?
          </h1>
          <p className="text-sm text-muted-foreground">
            Select your name to continue
          </p>
        </div>

        {/* User Grid */}
        <div className="grid grid-cols-2 gap-3">
          {USERS.map((u, i) => (
            <motion.div
              key={u.userId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
            >
              <Button
                variant="outline"
                onClick={() => selectUser(u.userId)}
                className="w-full h-auto flex flex-col items-center gap-2 py-5 px-3 bg-card/80 backdrop-blur border-border/60 hover:bg-primary/10 hover:border-primary/40 transition-all shadow-sm"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                  {u.role === "admin" ? (
                    <Shield className="h-5 w-5 text-primary" />
                  ) : (
                    <UserCheck className="h-5 w-5 text-primary" />
                  )}
                </div>
                <span className="font-semibold text-sm text-foreground">
                  {u.name}
                </span>
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    u.role === "admin"
                      ? "bg-primary/10 text-primary"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {u.role}
                </span>
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={logout}
            className="flex items-center justify-center gap-1.5 w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Go back
          </button>
        </motion.div>
      </motion.div>
    </div>
  )
}
