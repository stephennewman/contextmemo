'use client'

import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'

interface UsageData {
  totalCredits: string
  totalUsage: string
  remaining: string
  costDollars: string
  source: string
}

export function UsageBadge() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch('/api/usage')
        if (res.ok) {
          const data = await res.json()
          setUsage(data)
        }
      } catch (error) {
        console.error('Failed to fetch usage:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsage()
    // Refresh every 30 seconds
    const interval = setInterval(fetchUsage, 30000)
    return () => clearInterval(interval)
  }, [])

  const remaining = parseFloat(usage?.remaining || '0')
  const isLow = remaining < 5

  return (
    <div 
      className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded cursor-default"
      title={usage ? `Used: $${usage.totalUsage} / Credits: $${usage.totalCredits}` : 'Loading...'}
    >
      <Wallet className={`h-4 w-4 ${isLow ? 'text-[#F59E0B]' : 'text-[#10B981]'}`} />
      <span className={`text-sm font-mono ${isLow ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
        {isLoading ? '...' : `$${usage?.remaining || '0.00'}`}
      </span>
      <span className="text-slate-500 text-xs hidden sm:inline">balance</span>
    </div>
  )
}
