'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pause, Play, Loader2 } from 'lucide-react'

interface BrandPauseToggleProps {
  brandId: string
  initialPaused: boolean
}

export function BrandPauseToggle({ brandId, initialPaused }: BrandPauseToggleProps) {
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

  if (isPaused) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={loading}
        className="border-amber-500 text-amber-600 hover:bg-amber-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Play className="h-4 w-4 mr-2" />
        )}
        Resume
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className="text-muted-foreground hover:text-amber-600 hover:border-amber-500"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Pause className="h-4 w-4 mr-2" />
      )}
      Pause
    </Button>
  )
}
