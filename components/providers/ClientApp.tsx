"use client"

import { Component, type ReactNode, type ErrorInfo } from "react"
import { Suspense } from "react"
import { AuthProvider, useAuth } from "@/lib/auth"
import { LoginPage } from "@/components/auth/LoginPage"
import { UserSelectionPage } from "@/components/auth/UserSelectionPage"
import { DexieProvider } from "./DexieProvider"
import { AppShell } from "@/components/layout/AppShell"

// Error boundary to surface client-side crashes
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Client error boundary caught:", error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "#f5f0e8",
          }}
        >
          <div style={{ maxWidth: "28rem", textAlign: "center" }}>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: "bold",
                color: "#c00",
                marginBottom: "1rem",
              }}
            >
              Something went wrong
            </h2>
            <pre
              style={{
                fontSize: "0.75rem",
                textAlign: "left",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                overflow: "auto",
                maxHeight: "15rem",
                background: "#fff",
                color: "#333",
                border: "1px solid #ddd",
                marginBottom: "1rem",
              }}
            >
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => {
                this.setState({ error: null })
                window.location.reload()
              }}
              style={{
                padding: "0.5rem 1.5rem",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                color: "#fff",
                background: "#5B8C5A",
                border: "none",
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, needsUserSelection } = useAuth()

  if (needsUserSelection) {
    return <UserSelectionPage />
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <>{children}</>
}

export default function ClientApp({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate>
          <DexieProvider>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
              }
            >
              <AppShell>{children}</AppShell>
            </Suspense>
          </DexieProvider>
        </AuthGate>
      </AuthProvider>
    </ErrorBoundary>
  )
}
