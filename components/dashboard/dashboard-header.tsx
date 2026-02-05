'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Zap, Settings, LogOut, User, Loader2 } from 'lucide-react'
import { UsageBadge } from './usage-badge'
import { ActivityIndicator } from './activity-indicator'
import { toast } from 'sonner'

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
  const pathname = usePathname()
  const router = useRouter()
  
  // Account dialog state
  const [accountOpen, setAccountOpen] = useState(false)
  const [displayName, setDisplayName] = useState(tenant?.name || '')
  const [saving, setSaving] = useState(false)

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

  // Save user profile
  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    
    setSaving(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName.trim() }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }
      
      toast.success('Profile updated! Your name will appear as the author on HubSpot posts.')
      setAccountOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

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
                className={`px-4 py-2 text-sm font-semibold tracking-wide ${!currentBrandId ? 'bg-[#0EA5E9] text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'} transition-colors`}
              >
                BRANDS
              </Link>
              {currentBrandId && (
                <Link 
                  href={`/brands/${currentBrandId}`}
                  className={`px-4 py-2 text-sm font-semibold tracking-wide bg-[#0EA5E9] text-white transition-colors`}
                >
                  DASHBOARD
                </Link>
              )}
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <ActivityIndicator />
            <UsageBadge />
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
                <DropdownMenuItem 
                  className="rounded-none cursor-pointer font-medium"
                  onClick={() => {
                    setDisplayName(tenant?.name || '')
                    setAccountOpen(true)
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  ACCOUNT
                </DropdownMenuItem>
                {(currentBrand || currentBrandId) && (
                  <DropdownMenuItem asChild className="rounded-none">
                    <Link href={`/brands/${currentBrand?.id || currentBrandId}/settings`} className="font-medium">
                      <Settings className="mr-2 h-4 w-4" />
                      BRAND SETTINGS
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
      
      {/* Account Settings Dialog */}
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
            <DialogDescription>
              Update your display name. This will be used as the author name when publishing to HubSpot.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled className="bg-muted" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input 
                id="name" 
                value={displayName} 
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name (e.g., Stephen Newman)"
              />
              <p className="text-xs text-muted-foreground">
                This name will appear as the author on HubSpot blog posts you publish.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
