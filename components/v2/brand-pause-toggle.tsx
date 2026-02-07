'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface BrandPauseToggleProps {
  brandId: string
  initialPaused: boolean
  lastScanAt?: string | null
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function BrandPauseToggle({ brandId, initialPaused, lastScanAt }: BrandPauseToggleProps) {
  const [isPaused, setIsPaused] = useState(initialPaused)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    try {
      const action = isPaused ? 'unpause' : 'pause'
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        setIsPaused(!isPaused)
      }
    } catch (error) {
      console.error('Failed to toggle pause:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {lastScanAt && (
        <span className="text-xs text-zinc-400">
          Last activity {timeAgo(lastScanAt)}
        </span>
      )}
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`px-3 py-1 text-xs font-bold tracking-wide transition-colors ${
          loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${
          isPaused
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
        }`}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
        ) : null}
        {isPaused ? 'INACTIVE' : 'ACTIVE'}
      </button>
    </div>
  )
}
