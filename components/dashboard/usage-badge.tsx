'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Zap } from 'lucide-react'

export function UsageBadge() {
  const [usage, setUsage] = useState<{
    creditsUsed: number
    creditsLimit: number
    costDollars: string
  } | null>(null)

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
      }
    }

    fetchUsage()
    // Refresh every 30 seconds
    const interval = setInterval(fetchUsage, 30000)
    return () => clearInterval(interval)
  }, [])

  if (!usage) return null

  const usagePercent = Math.min(100, (usage.creditsUsed / usage.creditsLimit) * 100)
  const isLow = usagePercent > 80

  return (
    <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded">
      <DollarSign className={`h-4 w-4 ${isLow ? 'text-[#F59E0B]' : 'text-[#10B981]'}`} />
      <span className={`text-sm font-mono ${isLow ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
        ${usage.costDollars}
      </span>
      <span className="text-slate-500 text-xs">this month</span>
    </div>
  )
}
