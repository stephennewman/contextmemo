'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ProfileRefreshButtonProps {
  brandId: string
}

export function ProfileRefreshButton({ brandId }: ProfileRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract_context' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Context extraction failed')
      }

      toast.success('Analyzing website...', {
        description: 'Profile will update automatically when complete',
        duration: 5000,
      })
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        router.refresh()
      }, 3000)

      // Stop polling after 45 seconds
      setTimeout(() => {
        clearInterval(pollInterval)
        setIsRefreshing(false)
        router.refresh()
      }, 45000)

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Context extraction failed')
      setIsRefreshing(false)
    }
  }

  return (
    <Button 
      onClick={handleRefresh} 
      disabled={isRefreshing}
      variant="outline"
      size="sm"
    >
      {isRefreshing ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      {isRefreshing ? 'Refreshing...' : 'Refresh Profile'}
    </Button>
  )
}
