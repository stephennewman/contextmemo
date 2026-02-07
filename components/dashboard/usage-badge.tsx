'use client'

import { useEffect, useState } from 'react'
import { Wallet, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface BrandUsage {
  brandId: string
  brandName: string
  spent: number
  balance: number
  startingBalance: number
}

interface UsageData {
  totalSpent: number
  totalBalance: number
  byBrand: BrandUsage[]
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

  const totalBalance = usage?.totalBalance || 0
  const isLow = totalBalance < 10

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded hover:bg-slate-700 transition-colors"
          suppressHydrationWarning
        >
          <Wallet className={`h-4 w-4 ${isLow ? 'text-[#F59E0B]' : 'text-[#10B981]'}`} />
          <span className={`text-sm font-mono ${isLow ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
            {isLoading ? '...' : `$${totalBalance.toFixed(2)}`}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 border-2 border-[#0F172A] rounded-none p-0">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Balance</p>
          <p className={`text-2xl font-bold font-mono ${isLow ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
            ${totalBalance.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">
            ${usage?.totalSpent.toFixed(2) || '0.00'} spent total
          </p>
        </div>
        
        {usage?.byBrand && usage.byBrand.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              By Brand
            </p>
            <div className="space-y-3">
              {usage.byBrand.map((brand) => {
                const percentUsed = (brand.spent / brand.startingBalance) * 100
                const brandIsLow = brand.balance < 10
                
                return (
                  <div key={brand.brandId}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium truncate max-w-36">
                        {brand.brandName}
                      </span>
                      <span className={`text-sm font-mono ${brandIsLow ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
                        ${brand.balance.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${brandIsLow ? 'bg-[#F59E0B]' : 'bg-[#10B981]'}`}
                        style={{ width: `${Math.min(100, 100 - percentUsed)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ${brand.spent.toFixed(2)} of ${brand.startingBalance} spent
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
