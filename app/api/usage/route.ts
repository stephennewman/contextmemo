import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plan_limits')
    .eq('user_id', user.id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'No tenant' }, { status: 404 })
  }

  // Get credits used this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: usageData } = await supabase
    .from('usage_events')
    .select('credits_used, total_cost_cents')
    .eq('tenant_id', tenant.id)
    .gte('created_at', startOfMonth.toISOString())

  const creditsUsed = usageData?.reduce((sum, e) => sum + (e.credits_used || 0), 0) || 0
  const costCents = usageData?.reduce((sum, e) => sum + (e.total_cost_cents || 0), 0) || 0

  // Get limit from plan
  const planLimits = tenant.plan_limits as Record<string, number> | null
  const creditsLimit = planLimits?.credits_per_month || 
                       (planLimits?.memos_per_month || 30) * 10

  // Calculate cost from scan_results if usage_events doesn't have costs yet
  const { data: scanCosts } = await supabase
    .from('scan_results')
    .select('total_cost_cents')
    .eq('brand_id', (await supabase.from('brands').select('id').eq('tenant_id', tenant.id)).data?.[0]?.id || '')
    .gte('scanned_at', startOfMonth.toISOString())

  const scanCostCents = scanCosts?.reduce((sum, s) => sum + (s.total_cost_cents || 0), 0) || 0
  const totalCostCents = Math.max(costCents, scanCostCents)

  return NextResponse.json({
    creditsUsed,
    creditsLimit,
    creditsRemaining: Math.max(0, creditsLimit - creditsUsed),
    costCents: totalCostCents,
    costDollars: (totalCostCents / 100).toFixed(2),
  })
}
