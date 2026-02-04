'use client'

import { useEffect, useState } from 'react'
import { Wallet, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface BrandUsage {
  brandId: string
  brandName: string
  costDollars: string
}

interface UsageData {
  totalCredits: string
  totalUsage: string
  remaining: string
  costDollars: string
  source: string
  byBrand?: BrandUsage[]
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded hover:bg-slate-700 transition-colors"
        >
          <Wallet className={`h-4 w-4 ${isLow ? 'text-[#F59E0B]' : 'text-[#10B981]'}`} />
          <span className={`text-sm font-mono ${isLow ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
            {isLoading ? '...' : `$${usage?.remaining || '0.00'}`}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-2 border-[#0F172A] rounded-none">
        <div className="px-3 py-2 border-b border-slate-200">
          <p className="text-xs text-muted-foreground">OpenRouter Balance</p>
          <p className="text-lg font-bold font-mono text-[#10B981]">${usage?.remaining || '0.00'}</p>
          <p className="text-xs text-muted-foreground">
            Used: ${usage?.totalUsage || '0.00'} this month
          </p>
        </div>
        
        {usage?.byBrand && usage.byBrand.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">BY BRAND</p>
              {usage.byBrand.map((brand) => (
                <div key={brand.brandId} className="flex justify-between items-center py-1">
                  <span className="text-sm truncate max-w-32">{brand.brandName}</span>
                  <span className="text-sm font-mono">${brand.costDollars}</span>
                </div>
              ))}
            </div>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-none">
          <a 
            href="https://openrouter.ai/credits" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground"
          >
            Add credits on OpenRouter →
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
