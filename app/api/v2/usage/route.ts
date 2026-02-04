import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { UsageSummary, FeedWorkflow } from '@/lib/feed/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get tenant with plan limits
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('plan_limits')
    .eq('id', user.id)
    .single()

  // Get usage for current month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: usageEvents } = await serviceClient
    .from('usage_events')
    .select('workflow, credits_used, event_type, created_at')
    .eq('tenant_id', user.id)
    .gte('created_at', startOfMonth.toISOString())

  // Calculate limits
  const creditsLimit = tenant?.plan_limits?.credits_per_month || 
    (tenant?.plan_limits?.memos_per_month || 30) * 10

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

  // Calculate reset date
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

  return NextResponse.json(usage)
}
