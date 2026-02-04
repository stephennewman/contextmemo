'use client'

import { useEffect, useState } from 'react'
import { DollarSign } from 'lucide-react'

export function UsageBadge() {
  const [costDollars, setCostDollars] = useState('0.00')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch('/api/usage')
        if (res.ok) {
          const data = await res.json()
          setCostDollars(data.costDollars || '0.00')
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

  return (
    <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded">
      <DollarSign className="h-4 w-4 text-[#10B981]" />
      <span className="text-sm font-mono text-[#10B981]">
        {isLoading ? '...' : `$${costDollars}`}
      </span>
      <span className="text-slate-500 text-xs hidden sm:inline">this month</span>
    </div>
  )
}
