"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("App error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md space-y-4 text-center">
        <h2 className="text-lg font-bold text-red-600">Something went wrong!</h2>
        <pre className="text-xs text-left bg-gray-100 p-3 rounded overflow-auto max-h-60">
          {error.message}
          {"\n\n"}
          {error.stack}
        </pre>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
