import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface BudgetStatus {
  /** Whether the job is allowed to proceed */
  allowed: boolean
  /** Current month spend in cents */
  spentCents: number
  /** Monthly cap in cents (null = unlimited) */
  capCents: number | null
  /** Percentage of cap used (null if no cap) */
  percentUsed: number | null
  /** Reason if blocked */
  reason?: 'over_cap' | 'approaching_cap' | 'brand_paused'
}

/**
 * Check if a brand is within its monthly budget.
 * 
 * If the brand is over cap and pause_at_cap is true, auto-pauses the brand.
 * Returns whether the calling job should proceed.
 * 
 * Call this at the start of any cost-generating inngest function.
 */
export async function checkBrandBudget(brandId: string): Promise<BudgetStatus> {
  // Get brand pause state + settings in parallel
  const [brandResult, settingsResult, spendResult] = await Promise.all([
    supabase
      .from('brands')
      .select('is_paused, name, tenant_id')
      .eq('id', brandId)
      .single(),
    supabase
      .from('brand_settings')
      .select('monthly_credit_cap, alert_at_percent, pause_at_cap')
      .eq('brand_id', brandId)
      .single(),
    // Get current month spend from usage_events
    supabase
      .from('usage_events')
      .select('total_cost_cents')
      .eq('brand_id', brandId)
      .gte('created_at', getMonthStart()),
  ])

  // If brand is already paused, block
  if (brandResult.data?.is_paused) {
    return {
      allowed: false,
      spentCents: 0,
      capCents: null,
      percentUsed: null,
      reason: 'brand_paused',
    }
  }

  const spentCents = (spendResult.data || []).reduce(
    (sum, e) => sum + (Number(e.total_cost_cents) || 0),
    0
  )

  const settings = settingsResult.data
  const capCents = settings?.monthly_credit_cap 
    ? settings.monthly_credit_cap * 100 // stored as dollars, convert to cents
    : null

  // No cap set = unlimited
  if (!capCents) {
    return {
      allowed: true,
      spentCents,
      capCents: null,
      percentUsed: null,
    }
  }

  const percentUsed = Math.round((spentCents / capCents) * 100)

  // Over cap
  if (spentCents >= capCents) {
    const shouldPause = settings?.pause_at_cap !== false // default true

    if (shouldPause) {
      // Auto-pause the brand
      await supabase
        .from('brands')
        .update({ is_paused: true, updated_at: new Date().toISOString() })
        .eq('id', brandId)

      // Log an alert
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'budget_exceeded',
        title: 'Monthly Budget Exceeded — Brand Paused',
        message: `${brandResult.data?.name || 'Brand'} has spent $${(spentCents / 100).toFixed(2)} of its $${(capCents / 100).toFixed(2)} monthly cap. All automations have been paused.`,
        data: {
          spentCents,
          capCents,
          percentUsed,
          autoPaused: true,
          timestamp: new Date().toISOString(),
        },
      })

      console.log(`[BudgetGuard] Brand ${brandId} exceeded cap ($${(spentCents / 100).toFixed(2)} / $${(capCents / 100).toFixed(2)}). Auto-paused.`)
    }

    return {
      allowed: false,
      spentCents,
      capCents,
      percentUsed,
      reason: 'over_cap',
    }
  }

  // Approaching cap — alert but allow
  const alertPercent = settings?.alert_at_percent || 80
  if (percentUsed >= alertPercent) {
    // Check if we already alerted this month
    const { data: existingAlert } = await supabase
      .from('alerts')
      .select('id')
      .eq('brand_id', brandId)
      .eq('alert_type', 'budget_warning')
      .gte('created_at', getMonthStart())
      .limit(1)

    if (!existingAlert || existingAlert.length === 0) {
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'budget_warning',
        title: `Budget ${percentUsed}% Used`,
        message: `${brandResult.data?.name || 'Brand'} has spent $${(spentCents / 100).toFixed(2)} of its $${(capCents / 100).toFixed(2)} monthly cap (${percentUsed}%).`,
        data: {
          spentCents,
          capCents,
          percentUsed,
          timestamp: new Date().toISOString(),
        },
      })

      console.log(`[BudgetGuard] Brand ${brandId} at ${percentUsed}% of cap. Alert created.`)
    }
  }

  return {
    allowed: true,
    spentCents,
    capCents,
    percentUsed,
  }
}

/**
 * Quick check — returns false if brand should not run.
 * Use this for the simplest gate at the top of inngest functions.
 */
export async function canBrandSpend(brandId: string): Promise<boolean> {
  const status = await checkBrandBudget(brandId)
  return status.allowed
}

function getMonthStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}
