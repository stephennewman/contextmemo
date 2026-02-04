import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Try to get real costs from OpenRouter
  let openRouterCredits = null
  try {
    const openRouterKey = process.env.OPENROUTER_API_KEY
    if (openRouterKey) {
      const res = await fetch('https://openrouter.ai/api/v1/credits', {
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        openRouterCredits = data.data
      }
    }
  } catch (error) {
    console.error('Failed to fetch OpenRouter credits:', error)
  }

  // If we have OpenRouter data, use it
  if (openRouterCredits) {
    const totalCredits = openRouterCredits.total_credits || 0
    const totalUsage = openRouterCredits.total_usage || 0
    const remaining = totalCredits - totalUsage

    return NextResponse.json({
      source: 'openrouter',
      totalCredits: totalCredits.toFixed(2),
      totalUsage: totalUsage.toFixed(2),
      remaining: remaining.toFixed(2),
      costDollars: totalUsage.toFixed(2),
    })
  }

  // Fallback to internal tracking
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plan_limits')
    .eq('user_id', user.id)
    .single()

  if (!tenant) {
    return NextResponse.json({ 
      source: 'internal',
      costDollars: '0.00',
      totalCredits: '0.00',
      totalUsage: '0.00',
      remaining: '0.00',
    })
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

  const costCents = usageData?.reduce((sum, e) => sum + (e.total_cost_cents || 0), 0) || 0

  return NextResponse.json({
    source: 'internal',
    costDollars: (costCents / 100).toFixed(2),
    totalCredits: '100.00', // Default
    totalUsage: (costCents / 100).toFixed(2),
    remaining: (100 - costCents / 100).toFixed(2),
  })
}
