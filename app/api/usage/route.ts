import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Margin multiplier: for every $1 shown to user, we pay $0.20 to OpenRouter
// So displayed cost = actual cost * 5
const MARGIN_MULTIPLIER = 5

// Default starting balance per brand (in dollars)
const DEFAULT_BRAND_BALANCE = 50

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get tenant (tenant.id IS the user.id)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
  }

  // Get brands for this tenant
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .eq('tenant_id', tenant.id)

  const brandIds = (brands || []).map(b => b.id)
  const brandMap = new Map((brands || []).map(b => [b.id, b.name]))

  // Get all-time usage from our database (for balance calculation)
  const { data: usageEvents } = await supabase
    .from('usage_events')
    .select('total_cost_cents, brand_id')
    .eq('tenant_id', tenant.id)

  // Calculate per-brand costs (actual cost from OpenRouter)
  const brandActualCosts = new Map<string, number>()

  for (const event of usageEvents || []) {
    const cost = event.total_cost_cents || 0
    if (event.brand_id) {
      brandActualCosts.set(event.brand_id, (brandActualCosts.get(event.brand_id) || 0) + cost)
    }
  }

  // Build per-brand breakdown with margin applied
  const byBrand = brandIds.map((brandId) => {
    const actualCostCents = brandActualCosts.get(brandId) || 0
    // Apply margin: displayed cost = actual cost * multiplier
    const displayedCostCents = actualCostCents * MARGIN_MULTIPLIER
    const displayedCostDollars = displayedCostCents / 100
    // Balance = starting balance - displayed spend
    const balance = DEFAULT_BRAND_BALANCE - displayedCostDollars

    return {
      brandId,
      brandName: brandMap.get(brandId) || 'Unknown',
      spent: displayedCostDollars,
      balance: Math.max(0, balance),
      startingBalance: DEFAULT_BRAND_BALANCE,
    }
  }).sort((a, b) => b.spent - a.spent)

  // Calculate totals
  const totalSpent = byBrand.reduce((sum, b) => sum + b.spent, 0)
  const totalBalance = byBrand.reduce((sum, b) => sum + b.balance, 0)

  return NextResponse.json({
    totalSpent,
    totalBalance,
    byBrand,
  })
}
