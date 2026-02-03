import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'

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

  // Get user's brands (direct ownership or via organization)
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name, subdomain, user_id, organization_id')
    .or(`user_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-white">
      <DashboardHeader
        user={{ id: user.id, email: user.email || '' }}
        tenant={tenant ? { name: tenant.name } : null}
        brands={brands || []}
        signOut={signOut}
      />
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
