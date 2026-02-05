import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Margin multiplier: displayed cost = actual cost × multiplier
const MARGIN_MULTIPLIER = 5

/**
 * Get usage breakdown by brand for the current user
 * Shows cost per brand with margin applied
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  // Get tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, plan, stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
  }

  // Get all brands for this tenant
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name, created_at')
    .eq('tenant_id', tenant.id)
    .order('name')

  if (!brands || brands.length === 0) {
    return NextResponse.json({ 
      brands: [],
      totals: { actualCostCents: 0, displayCostCents: 0, totalCalls: 0 },
    })
  }

  const brandIds = brands.map(b => b.id)

  // Get all usage events for these brands in the period
  const { data: usageEvents } = await supabase
    .from('usage_events')
    .select('brand_id, event_type, total_cost_cents, created_at')
    .in('brand_id', brandIds)
    .gte('created_at', cutoffDate.toISOString())

  // Get lab runs for these brands
  const { data: labRuns } = await supabase
    .from('prompt_lab_runs')
    .select('brand_id, stats')
    .in('brand_id', brandIds)
    .gte('created_at', cutoffDate.toISOString())

  // Aggregate by brand
  const brandUsage: Record<string, {
    actualCostCents: number
    labCostCents: number
    callCount: number
    byEventType: Record<string, number>
  }> = {}

  // Initialize all brands
  for (const brand of brands) {
    brandUsage[brand.id] = {
      actualCostCents: 0,
      labCostCents: 0,
      callCount: 0,
      byEventType: {},
    }
  }

  // Aggregate usage events
  for (const event of usageEvents || []) {
    const usage = brandUsage[event.brand_id]
    if (usage) {
      usage.actualCostCents += event.total_cost_cents || 0
      usage.callCount++
      const eventType = event.event_type || 'unknown'
      usage.byEventType[eventType] = (usage.byEventType[eventType] || 0) + (event.total_cost_cents || 0)
    }
  }

  // Aggregate lab runs
  for (const run of labRuns || []) {
    const usage = brandUsage[run.brand_id]
    if (usage) {
      const stats = run.stats as { totalCostCents?: number } | null
      usage.labCostCents += stats?.totalCostCents || 0
    }
  }

  // Build response with margin applied
  let totalActualCents = 0
  let totalCalls = 0

  const brandBreakdown = brands.map(brand => {
    const usage = brandUsage[brand.id]
    const actualCostCents = usage.actualCostCents + usage.labCostCents
    const displayCostCents = actualCostCents * MARGIN_MULTIPLIER
    
    totalActualCents += actualCostCents
    totalCalls += usage.callCount

    return {
      brandId: brand.id,
      brandName: brand.name,
      createdAt: brand.created_at,
      
      // What we actually pay
      actualCostCents,
      actualCostDollars: (actualCostCents / 100).toFixed(2),
      
      // What the user would pay (with margin)
      displayCostCents,
      displayCostDollars: (displayCostCents / 100).toFixed(2),
      
      // Breakdown
      usageEventsCents: usage.actualCostCents,
      labRunsCents: usage.labCostCents,
      callCount: usage.callCount,
      
      // By event type (top 3)
      topEventTypes: Object.entries(usage.byEventType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type, cents]) => ({ type, cents, dollars: (cents / 100).toFixed(2) })),
    }
  }).sort((a, b) => b.actualCostCents - a.actualCostCents)

  return NextResponse.json({
    period: {
      days,
      since: cutoffDate.toISOString(),
    },
    
    totals: {
      actualCostCents: totalActualCents,
      actualCostDollars: (totalActualCents / 100).toFixed(2),
      displayCostCents: totalActualCents * MARGIN_MULTIPLIER,
      displayCostDollars: ((totalActualCents * MARGIN_MULTIPLIER) / 100).toFixed(2),
      totalCalls,
      marginMultiplier: MARGIN_MULTIPLIER,
    },
    
    brands: brandBreakdown,
    
    // For billing: suggest what to charge per brand
    billingRecommendation: brandBreakdown.map(b => ({
      brandId: b.brandId,
      brandName: b.brandName,
      suggestedChargeDollars: b.displayCostDollars,
      minimumCharge: Math.max(5, Math.ceil(parseFloat(b.displayCostDollars))), // $5 minimum
    })),
  })
}
