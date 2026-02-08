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

  const brandMap = new Map((brands || []).map(b => [b.id, b.name]))

  // Aggregate costs server-side via DB function to avoid PostgREST 1000-row limit
  const { data: costSummary, error: costError } = await supabase
    .rpc('get_brand_cost_summary', { p_tenant_id: tenant.id })

  if (costError) {
    console.error('Failed to get cost summary:', costError)
  }

  // Build a map of brand_id -> actual cost cents from the DB aggregation
  const brandActualCosts = new Map<string, number>()
  for (const row of costSummary || []) {
    brandActualCosts.set(row.brand_id, Number(row.actual_cost_cents) || 0)
  }

  // Build per-brand breakdown with margin applied
  const brandIds = (brands || []).map(b => b.id)
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
