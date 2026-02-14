import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'

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

  // Use service role to bypass RLS for brand queries
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get user's organization memberships
  const { data: memberships } = await serviceClient
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)

  const orgIds = memberships?.map(m => m.organization_id).filter(Boolean) || []

  // Query brands the user has access to (via org OR tenant ownership)
  let brands: { id: string; name: string; subdomain: string }[] = []
  
  if (orgIds.length > 0) {
    // Get brands via organization membership
    const { data: orgBrands } = await serviceClient
      .from('brands')
      .select('id, name, subdomain')
      .in('organization_id', orgIds)
      .order('created_at', { ascending: false })
    brands = orgBrands || []
  }
  
  // Also get brands owned by user's tenant (tenant_id = user.id)
  const { data: tenantBrands } = await serviceClient
    .from('brands')
    .select('id, name, subdomain')
    .eq('tenant_id', user.id)
    .order('created_at', { ascending: false })
  
  // Merge and dedupe
  if (tenantBrands) {
    const existingIds = new Set(brands.map(b => b.id))
    for (const brand of tenantBrands) {
      if (!existingIds.has(brand.id)) {
        brands.push(brand)
      }
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <DashboardHeader
        user={{ id: user.id, email: user.email || '' }}
        tenant={tenant ? { name: tenant.name } : null}
        brands={brands || []}
      />
      
      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
