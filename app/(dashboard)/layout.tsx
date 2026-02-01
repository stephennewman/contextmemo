import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Zap, LayoutDashboard, Settings, LogOut, Bell } from 'lucide-react'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get brands
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name, subdomain')
    .order('created_at', { ascending: false })

  // Get initials for avatar
  const initials = tenant?.name 
    ? tenant.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-white">
      {/* Bold Electric Header */}
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
                className="px-4 py-2 text-sm font-semibold tracking-wide bg-[#0EA5E9] text-white"
              >
                DASHBOARD
              </Link>
              {brands && brands.length > 0 && (
                <Link 
                  href={`/brands/${brands[0].id}`}
                  className="px-4 py-2 text-sm font-semibold tracking-wide text-slate-400 hover:text-white transition-colors"
                >
                  {brands[0].name.toUpperCase()}
                </Link>
              )}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-white transition-colors">
              <Bell className="h-5 w-5" strokeWidth={2.5} />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-9 h-9 flex items-center justify-center text-sm font-bold bg-[#0EA5E9] text-white">
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
                <DropdownMenuItem asChild className="rounded-none">
                  <Link href="/settings" className="font-medium">
                    <Settings className="mr-2 h-4 w-4" />
                    SETTINGS
                  </Link>
                </DropdownMenuItem>
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
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
