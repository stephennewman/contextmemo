import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { V2Sidebar } from '@/components/v2/layout/v2-sidebar'
import { UsageBar, DEFAULT_USAGE } from '@/components/v2/layout/usage-bar'
import type { UsageSummary, FeedWorkflow } from '@/lib/feed/types'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function V2Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get tenant info with plan limits
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, plan_limits')
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

  // Query brands the user has access to
  let brands: { id: string; name: string; subdomain: string; custom_domain?: string | null; domain_verified?: boolean | null }[] = []
  
  if (orgIds.length > 0) {
    const { data: orgBrands } = await serviceClient
      .from('brands')
      .select('id, name, subdomain, custom_domain, domain_verified')
      .in('organization_id', orgIds)
      .order('created_at', { ascending: false })
    brands = orgBrands || []
  }
  
  // Also get brands owned by user's tenant
  const { data: tenantBrands } = await serviceClient
    .from('brands')
    .select('id, name, subdomain, custom_domain, domain_verified')
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

  // Get usage for current month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  const { data: usageEvents } = await serviceClient
    .from('usage_events')
    .select('workflow, credits_used, event_type')
    .eq('tenant_id', user.id)
    .gte('created_at', startOfMonth.toISOString())

  // Calculate usage summary
  const creditsLimit = tenant?.plan_limits?.credits_per_month || 
    (tenant?.plan_limits?.memos_per_month || 30) * 10 // Default: memos * 10
  
  const creditsUsed = usageEvents?.reduce((sum, e) => sum + (e.credits_used || 1), 0) || 0
  
  const byWorkflow = (usageEvents || []).reduce((acc, e) => {
    const workflow = (e.workflow || 'core_discovery') as FeedWorkflow
    acc[workflow] = (acc[workflow] || 0) + (e.credits_used || 1)
    return acc
  }, {} as Record<FeedWorkflow, number>)

  const byEventType = (usageEvents || []).reduce((acc, e) => {
    const eventType = e.event_type || 'unknown'
    acc[eventType] = (acc[eventType] || 0) + (e.credits_used || 1)
    return acc
  }, {} as Record<string, number>)

  // Calculate reset date (first of next month)
  const resetDate = new Date()
  resetDate.setMonth(resetDate.getMonth() + 1)
  resetDate.setDate(1)
  resetDate.setHours(0, 0, 0, 0)

  const usage: UsageSummary = {
    credits_used: creditsUsed,
    credits_limit: creditsLimit,
    credits_remaining: Math.max(0, creditsLimit - creditsUsed),
    percent_used: Math.round((creditsUsed / creditsLimit) * 100),
    reset_date: resetDate.toISOString(),
    by_workflow: {
      core_discovery: byWorkflow.core_discovery || 0,
      network_expansion: byWorkflow.network_expansion || 0,
      competitive_response: byWorkflow.competitive_response || 0,
      verification: byWorkflow.verification || 0,
      greenspace: byWorkflow.greenspace || 0,
      system: byWorkflow.system || 0,
    },
    by_event_type: byEventType,
  }

  // Get unread counts per workflow (for sidebar badges)
  const { data: unreadEvents } = await serviceClient
    .from('feed_events')
    .select('workflow')
    .eq('tenant_id', user.id)
    .eq('read', false)
    .eq('dismissed', false)

  const unreadCounts = (unreadEvents || []).reduce((acc, e) => {
    const workflow = e.workflow as FeedWorkflow
    acc[workflow] = (acc[workflow] || 0) + 1
    return acc
  }, {} as Record<FeedWorkflow, number>)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Suspense fallback={<div className="w-64 bg-[#0F172A]" />}>
        <V2Sidebar 
          brands={brands} 
          unreadCounts={unreadCounts}
          signOut={signOut}
        />
      </Suspense>
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Usage bar */}
        <UsageBar 
          usage={usage} 
          user={{ 
            email: user.email || '', 
            name: tenant?.company_name || user.user_metadata?.full_name 
          }}
          signOut={signOut}
        />
        
        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
