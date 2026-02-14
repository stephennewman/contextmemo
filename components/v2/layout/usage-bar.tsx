'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronDown, Zap, Settings, User, LogOut, CreditCard, HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UsageSummary } from '@/lib/feed/types'

interface UsageBarProps {
  usage: UsageSummary
  brandId?: string
  user?: {
    email: string
    name?: string
  }
  signOut?: () => Promise<void>
}

export function UsageBar({ usage, brandId, user }: UsageBarProps) {
  const percentUsed = usage.percent_used
  const isLow = percentUsed >= 80
  const isCritical = percentUsed >= 95
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      setSigningOut(false)
    }
  }, [])

  // Calculate days until reset
  const resetDate = new Date(usage.reset_date)
  const now = new Date()
  const daysUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  // Get user initials
  const userInitial = user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'

  return (
    <div className="h-12 bg-[#0F172A] border-b border-slate-800 px-4 flex items-center justify-between">
      {/* Left: Usage indicator */}
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:bg-slate-800 px-3 py-1.5 rounded transition-colors">
              {/* Progress bar */}
              <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    isCritical ? 'bg-red-500' : 
                    isLow ? 'bg-amber-500' : 
                    'bg-[#0EA5E9]'
                  }`}
                  style={{ width: `${Math.min(100, percentUsed)}%` }}
                />
              </div>
              
              {/* Credits text */}
              <span className={`text-sm font-mono ${
                isCritical ? 'text-red-400' :
                isLow ? 'text-amber-400' :
                'text-slate-300'
              }`}>
                {usage.credits_used}/{usage.credits_limit}
              </span>
              
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Credits Used</span>
                <span className="text-sm font-mono">
                  {usage.credits_used} / {usage.credits_limit}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full ${
                    isCritical ? 'bg-red-500' : 
                    isLow ? 'bg-amber-500' : 
                    'bg-[#0EA5E9]'
                  }`}
                  style={{ width: `${Math.min(100, percentUsed)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}
              </p>
            </div>
            
            <DropdownMenuSeparator />
            
            <div className="px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">BY WORKFLOW</p>
              <div className="space-y-1 text-sm">
                {Object.entries(usage.by_workflow).map(([workflow, credits]) => (
                  <div key={workflow} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">
                      {workflow.replace('_', ' ')}
                    </span>
                    <span className="font-mono">{credits}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem asChild>
              <Link href={brandId ? `/v2/brands/${brandId}/settings` : '/v2/settings'} className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Manage Usage
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Low credits warning */}
        {isLow && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
            isCritical ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            <Zap className="h-3 w-3" />
            {isCritical ? 'Almost out of credits' : 'Credits running low'}
          </div>
        )}
      </div>

      {/* Right: Quick actions + Profile */}
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-slate-400 hover:text-white hover:bg-slate-800"
          asChild
        >
          <Link href="/dashboard">
            Switch to Classic
          </Link>
        </Button>
        
        {isLow && (
          <Button 
            size="sm" 
            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            asChild
          >
            <Link href="/pricing">
              Upgrade
            </Link>
          </Button>
        )}
        
        {/* Profile dropdown */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-[#0EA5E9] flex items-center justify-center text-white font-medium text-sm hover:bg-[#0284C7] transition-colors ml-2">
                {userInitial}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user.name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem asChild>
                <Link href="/account" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Account Settings
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/billing" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="https://docs.contextmemo.com" target="_blank" className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Help & Docs
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onSelect={handleSignOut} disabled={signingOut}>
                <LogOut className="h-4 w-4" />
                {signingOut ? 'Signing out...' : 'Sign Out'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

// Default usage for when data isn't loaded yet
export const DEFAULT_USAGE: UsageSummary = {
  credits_used: 0,
  credits_limit: 100,
  credits_remaining: 100,
  percent_used: 0,
  reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  by_workflow: {
    core_discovery: 0,
    network_expansion: 0,
    competitive_response: 0,
    verification: 0,
    greenspace: 0,
    system: 0,
  },
  by_event_type: {},
}
