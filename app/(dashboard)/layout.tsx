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

  // Get user's organization memberships
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)

  const orgIds = memberships?.map(m => m.organization_id) || []

  // Get user's brands (direct ownership or via organization)
  let brandsQuery = supabase
    .from('brands')
    .select('id, name, subdomain')
    .order('created_at', { ascending: false })

  if (orgIds.length > 0) {
    brandsQuery = brandsQuery.or(`user_id.eq.${user.id},organization_id.in.(${orgIds.join(',')})`)
  } else {
    brandsQuery = brandsQuery.eq('user_id', user.id)
  }

  const { data: brands } = await brandsQuery

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
