'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Zap, LayoutDashboard, Settings, LogOut, Activity } from 'lucide-react'
import { ActivityFeed } from './activity-feed'

interface DashboardHeaderProps {
  user: {
    id: string
    email: string
  }
  tenant: {
    name: string | null
  } | null
  brands: {
    id: string
    name: string
    subdomain: string
  }[]
  signOut: () => Promise<void>
}

export function DashboardHeader({ user, tenant, brands, signOut }: DashboardHeaderProps) {
  const [activityOpen, setActivityOpen] = useState(false)
  const pathname = usePathname()

  // Extract current brandId from URL if on a brand page
  const brandIdMatch = pathname.match(/\/brands\/([^\/]+)/)
  const currentBrandId = brandIdMatch ? brandIdMatch[1] : null
  
  // Find current brand, or default to first brand
  const currentBrand = currentBrandId 
    ? brands.find(b => b.id === currentBrandId) 
    : brands[0]

  // Get initials for avatar
  const initials = tenant?.name 
    ? tenant.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || 'U'

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-10">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Zap className="h-7 w-7 text-[#0EA5E9]" />
              <span className="font-bold text-xl tracking-tight text-white">CONTEXT MEMO</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              <Link 
                href="/dashboard" 
                className={`px-4 py-2 text-sm font-semibold tracking-wide ${!currentBrandId ? 'bg-[#0EA5E9] text-white' : 'text-slate-400 hover:text-white'} transition-colors`}
              >
                DASHBOARD
              </Link>
              {(currentBrand || currentBrandId) && (
                <Link 
                  href={`/brands/${currentBrand?.id || currentBrandId}`}
                  className={`px-4 py-2 text-sm font-semibold tracking-wide ${currentBrandId ? 'bg-[#0EA5E9] text-white' : 'text-slate-400 hover:text-white'} transition-colors`}
                >
                  {currentBrand?.name?.toUpperCase() || 'BRAND'}
                </Link>
              )}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Activity Feed Button */}
            <button 
              onClick={() => setActivityOpen(true)}
              className="p-2 text-slate-400 hover:text-white transition-colors relative"
              title="Activity Feed"
            >
              <Activity className="h-5 w-5" strokeWidth={2.5} />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="w-9 h-9 flex items-center justify-center text-sm font-bold bg-[#0EA5E9] text-white cursor-pointer hover:bg-[#0EA5E9]/90 transition-colors"
                  suppressHydrationWarning
                >
                  {initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-2 border-[#0F172A] rounded-none">
                <div className="px-3 py-2 border-b-2 border-[#0F172A]">
                  <p className="text-sm font-bold">{tenant?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuItem asChild className="rounded-none">
                  <Link href="/dashboard" className="font-medium">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    DASHBOARD
                  </Link>
                </DropdownMenuItem>
                {(currentBrand || currentBrandId) && (
                  <DropdownMenuItem asChild className="rounded-none">
                    <Link href={`/brands/${currentBrand?.id || currentBrandId}/settings`} className="font-medium">
                      <Settings className="mr-2 h-4 w-4" />
                      SETTINGS
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-[#0F172A]" />
                <form action={signOut}>
                  <DropdownMenuItem asChild className="rounded-none">
                    <button type="submit" className="w-full cursor-pointer font-medium">
                      <LogOut className="mr-2 h-4 w-4" />
                      SIGN OUT
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Activity Feed Sidebar */}
      <ActivityFeed 
        isOpen={activityOpen} 
        onOpenChange={setActivityOpen}
        brands={brands.map(b => ({ id: b.id, name: b.name }))}
      />
    </>
  )
}
