"use client"

import { useState, type FormEvent } from "react"
import { useAuth, USERS } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Leaf, Shield, UserCheck, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function UserSelectionPage() {
  const { selectUser, logout } = useAuth()
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const selectedUser = USERS.find((u) => u.userId === selectedUserId)

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedUserId) return
    setError("")
    setLoading(true)

    setTimeout(() => {
      const result = selectUser(selectedUserId, password)
      if (!result.success) {
        setError(result.error ?? "Invalid password")
        setPassword("")
      }
      setLoading(false)
    }, 300)
  }

  function handleBack() {
    setSelectedUserId(null)
    setPassword("")
    setError("")
  }

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

          <AnimatePresence mode="wait">
            {selectedUser ? (
              <motion.div
                key="password-header"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-1"
              >
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Hi, {selectedUser.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Enter your password
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="select-header"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-1"
              >
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Who are you?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Select your name to continue
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {selectedUser ? (
            /* Password Form */
            <motion.div
              key="password-form"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {/* Selected user badge */}
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    {selectedUser.role === "admin" ? (
                      <Shield className="h-4 w-4 text-primary" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="font-semibold text-foreground">
                    {selectedUser.name}
                  </span>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      selectedUser.role === "admin"
                        ? "bg-primary/10 text-primary"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {selectedUser.role}
                  </span>
                </div>

                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoFocus
                  autoComplete="current-password"
                  required
                  className="h-11 bg-card/80 backdrop-blur border-border/60 text-center text-base tracking-widest placeholder:tracking-normal placeholder:text-sm"
                />

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-sm text-destructive text-center"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold shadow-md shadow-primary/15"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </motion.div>

                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-1.5 w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Pick a different person
                </button>
              </form>
            </motion.div>
          ) : (
            /* User Grid */
            <motion.div
              key="user-grid"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
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
                      onClick={() => setSelectedUserId(u.userId)}
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

              <button
                onClick={logout}
                className="flex items-center justify-center gap-1.5 w-full text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Go back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
