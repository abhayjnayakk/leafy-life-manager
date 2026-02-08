"use client"

import { useState, type FormEvent } from "react"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Leaf } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function LoginPage() {
  const { login } = useAuth()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    setTimeout(() => {
      const result = login(password)
      if (!result.success) {
        setError(result.error ?? "Invalid credentials")
        setPassword("")
      }
      setLoading(false)
    }, 300)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(145deg, #f5f0e8 0%, #e8ede0 50%, #dde6d0 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-xs space-y-8"
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
            Leafy Life
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your password to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password or PIN"
              autoFocus
              autoComplete="current-password"
              required
              className="h-11 bg-card/80 backdrop-blur border-border/60 text-center text-base tracking-widest placeholder:tracking-normal placeholder:text-sm"
            />
          </div>

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
        </form>

        <p className="text-xs text-muted-foreground/60 text-center">
          Admin or Staff access only
        </p>
      </motion.div>
    </div>
  )
}
