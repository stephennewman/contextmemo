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

  // Get per-brand costs from usage_events
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  let brandCosts: { brandId: string; brandName: string; costCents: number }[] = []
  
  if (tenant) {
    // Get usage by brand for this tenant
    const { data: usageByBrand } = await supabase
      .from('usage_events')
      .select('brand_id, total_cost_cents')
      .eq('tenant_id', tenant.id)
      .gte('created_at', startOfMonth.toISOString())

    // Group by brand
    const brandTotals = new Map<string, number>()
    for (const event of usageByBrand || []) {
      if (event.brand_id) {
        const current = brandTotals.get(event.brand_id) || 0
        brandTotals.set(event.brand_id, current + (event.total_cost_cents || 0))
      }
    }

    // Get brand names
    if (brandTotals.size > 0) {
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name')
        .in('id', Array.from(brandTotals.keys()))

      brandCosts = (brands || []).map(b => ({
        brandId: b.id,
        brandName: b.name,
        costCents: brandTotals.get(b.id) || 0,
      })).sort((a, b) => b.costCents - a.costCents)
    }
  }

  // Calculate total internal cost
  const totalInternalCostCents = brandCosts.reduce((sum, b) => sum + b.costCents, 0)

  // If we have OpenRouter data, use it for balance
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
      byBrand: brandCosts.map(b => ({
        brandId: b.brandId,
        brandName: b.brandName,
        costDollars: (b.costCents / 100).toFixed(2),
      })),
    })
  }

  // Fallback to internal tracking
  return NextResponse.json({
    source: 'internal',
    costDollars: (totalInternalCostCents / 100).toFixed(2),
    totalCredits: '100.00',
    totalUsage: (totalInternalCostCents / 100).toFixed(2),
    remaining: (100 - totalInternalCostCents / 100).toFixed(2),
    byBrand: brandCosts.map(b => ({
      brandId: b.brandId,
      brandName: b.brandName,
      costDollars: (b.costCents / 100).toFixed(2),
    })),
  })
}
