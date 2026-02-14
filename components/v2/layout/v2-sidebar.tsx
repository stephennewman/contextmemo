'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { 
  LayoutDashboard, 
  Search, 
  Network, 
  Swords, 
  CheckCircle, 
  Sparkles,
  Settings,
  Bell,
  HelpCircle,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandSwitcher } from './brand-switcher'
import { WORKFLOW_META, type FeedWorkflow } from '@/lib/feed/types'
import { createClient } from '@/lib/supabase/client'

interface Brand {
  id: string
  name: string
  subdomain: string
  custom_domain?: string | null
  domain_verified?: boolean | null
}

interface V2SidebarProps {
  brands: Brand[]
  unreadCounts?: Record<FeedWorkflow, number>
  signOut?: () => Promise<void>
}

const workflowIcons: Record<FeedWorkflow, React.ComponentType<{ className?: string }>> = {
  core_discovery: Search,
  network_expansion: Network,
  competitive_response: Swords,
  verification: CheckCircle,
  greenspace: Sparkles,
  system: Bell,
}

const workflowColors: Record<FeedWorkflow, string> = {
  core_discovery: 'text-blue-400',
  network_expansion: 'text-purple-400',
  competitive_response: 'text-orange-400',
  verification: 'text-green-400',
  greenspace: 'text-emerald-400',
  system: 'text-slate-400',
}

export function V2Sidebar({ 
  brands, 
  unreadCounts: initialUnreadCounts = {} as Record<FeedWorkflow, number>,
}: V2SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [unreadCounts, setUnreadCounts] = useState(initialUnreadCounts)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      setSigningOut(false)
    }
  }
  
  // Extract brand ID from URL path: /v2/brands/[brandId]
  const brandIdMatch = pathname.match(/\/v2\/brands\/([^\/]+)/)
  const currentBrandId = brandIdMatch ? brandIdMatch[1] : undefined
  
  // Fetch brand-specific counts when brand changes
  useEffect(() => {
    async function fetchCounts() {
      try {
        const params = new URLSearchParams()
        if (currentBrandId) params.set('brandId', currentBrandId)
        params.set('limit', '1') // We just need the counts
        
        const response = await fetch(`/api/v2/feed?${params}`)
        if (response.ok) {
          // Parse workflow counts from unread events
          const params2 = new URLSearchParams()
          if (currentBrandId) params2.set('brandId', currentBrandId)
          params2.set('unreadOnly', 'true')
          params2.set('limit', '500')
          
          const response2 = await fetch(`/api/v2/feed?${params2}`)
          if (response2.ok) {
            const data = await response2.json()
            const counts = (data.items || []).reduce((acc: Record<string, number>, event: { workflow: string }) => {
              acc[event.workflow] = (acc[event.workflow] || 0) + 1
              return acc
            }, {} as Record<FeedWorkflow, number>)
            setUnreadCounts(counts)
          }
        }
      } catch (err) {
        console.error('Failed to fetch unread counts:', err)
      }
    }
    
    fetchCounts()
  }, [currentBrandId])
  
  const basePath = currentBrandId ? `/v2/brands/${currentBrandId}` : '/v2'
  const currentWorkflow = searchParams.get('workflow')
  
  // Main navigation items
  const mainNavItems = [
    {
      label: currentBrandId ? 'Dashboard' : 'Brands',
      href: basePath,
      icon: LayoutDashboard,
      active: (pathname === basePath || pathname === `${basePath}/`) && !currentWorkflow,
    },
  ]

  // Workflow filter items (for feed filtering)
  const workflowNavItems = (['core_discovery', 'network_expansion', 'competitive_response', 'verification', 'greenspace'] as FeedWorkflow[]).map(workflow => ({
    label: WORKFLOW_META[workflow].shortName,
    href: `${basePath}?workflow=${workflow}`,
    icon: workflowIcons[workflow],
    color: workflowColors[workflow],
    unread: unreadCounts[workflow] || 0,
    active: currentWorkflow === workflow,
  }))

  return (
    <div className="w-64 bg-[#0F172A] h-screen flex flex-col border-r border-slate-800 shrink-0">
      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <Link href="/v2" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#0EA5E9] rounded flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <div>
            <span className="font-bold text-white tracking-tight">CONTEXT</span>
            <span className="font-bold text-[#0EA5E9] tracking-tight">MEMO</span>
          </div>
          <span className="ml-auto text-xs bg-[#0EA5E9]/20 text-[#0EA5E9] px-1.5 py-0.5 rounded font-medium">
            v2
          </span>
        </Link>
      </div>

      {/* Brand Switcher */}
      <div className="p-2 border-b border-slate-800">
        <BrandSwitcher brands={brands} currentBrandId={currentBrandId} />
      </div>

      {/* Navigation - scrollable with persistent scrollbar */}
      <nav className="flex-1 p-2 min-h-0 always-show-scrollbar-dark">
        {/* Main navigation */}
        <div className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  item.active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
              </Link>
            )
          })}
        </div>
        
        {/* Workflow filters section */}
        <div className="mt-6">
          <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Workflows
          </p>
          <div className="space-y-1">
            {workflowNavItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    item.active
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  )}
                >
                  <Icon className={cn('h-4 w-4', item.color)} />
                  <span className="flex-1">{item.label}</span>
                  {item.unread > 0 && (
                    <span className="min-w-[20px] h-5 rounded-full bg-[#0EA5E9] text-white text-xs font-bold flex items-center justify-center px-1.5">
                      {item.unread > 99 ? '99+' : item.unread}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
        
        {/* Divider */}
        <div className="my-4 border-t border-slate-800" />
        
        {/* Secondary nav */}
        <div className="space-y-1">
          {currentBrandId && (
            <Link
              href={`/brands/${currentBrandId}/settings`}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname.includes('/settings')
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          )}
          
          <a
            href="https://docs.contextmemo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Help</span>
          </a>
        </div>
      </nav>

      {/* Footer - sticky at bottom of viewport */}
      <div className="sticky bottom-0 p-2 border-t border-slate-800 bg-[#0F172A]">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </div>
  )
}
