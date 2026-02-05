import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/client'
import { createMeteredSubscription, getSubscriptionUsage, calculateCostFromCredits } from '@/lib/stripe/usage'

/**
 * GET - Get billing status and usage for a brand
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get brand with billing info
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, name, tenant_id, stripe_subscription_id, stripe_subscription_item_id, billing_enabled')
    .eq('id', brandId)
    .single()

  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // Get current period usage from our database
  const periodStart = new Date()
  periodStart.setDate(1) // First of current month
  periodStart.setHours(0, 0, 0, 0)

  const { data: usageEvents } = await supabase
    .from('usage_events')
    .select('total_cost_cents')
    .eq('brand_id', brandId)
    .gte('created_at', periodStart.toISOString())

  const actualCostCents = (usageEvents || []).reduce((sum, e) => sum + (e.total_cost_cents || 0), 0)
  const MARGIN_MULTIPLIER = 5
  const displayCostCents = actualCostCents * MARGIN_MULTIPLIER

  // Get Stripe usage if subscription exists
  let stripeUsage = null
  if (brand.stripe_subscription_item_id) {
    stripeUsage = await getSubscriptionUsage(brand.stripe_subscription_item_id)
  }

  return NextResponse.json({
    brand: {
      id: brand.id,
      name: brand.name,
    },
    billing: {
      enabled: brand.billing_enabled || false,
      subscriptionId: brand.stripe_subscription_id,
      subscriptionItemId: brand.stripe_subscription_item_id,
    },
    currentPeriod: {
      start: periodStart.toISOString(),
      actualCostCents,
      actualCostDollars: (actualCostCents / 100).toFixed(2),
      displayCostCents,
      displayCostDollars: (displayCostCents / 100).toFixed(2),
    },
    stripeUsage: stripeUsage ? {
      totalCredits: stripeUsage.totalCredits,
      periodStart: stripeUsage.periodStart.toISOString(),
      periodEnd: stripeUsage.periodEnd.toISOString(),
      ...calculateCostFromCredits(stripeUsage.totalCredits),
    } : null,
  })
}

/**
 * POST - Enable metered billing for a brand
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get brand and tenant
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, name, tenant_id')
    .eq('id', brandId)
    .single()

  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // Get tenant with Stripe info
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, email, stripe_customer_id')
    .eq('id', brand.tenant_id)
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const stripe = getStripe()

  // Create or get Stripe customer
  let customerId = tenant.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: tenant.email,
      metadata: {
        tenant_id: tenant.id,
      },
    })
    customerId = customer.id

    await supabase
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenant.id)
  }

  // Check if metered price ID is configured
  const meteredPriceId = process.env.STRIPE_METERED_PRICE_ID
  if (!meteredPriceId) {
    return NextResponse.json({ 
      error: 'Metered billing not configured. Set STRIPE_METERED_PRICE_ID in environment.',
      setup: {
        instructions: 'Create a metered price in Stripe Dashboard: Products > Add Product > Recurring > Usage-based',
        recommended: {
          name: 'AI Credits',
          unitAmount: 5, // $0.05 per credit
          currency: 'usd',
          recurring: { interval: 'month', usage_type: 'metered', aggregate_usage: 'sum' },
        },
      },
    }, { status: 500 })
  }

  // Create metered subscription
  const result = await createMeteredSubscription({
    customerId,
    meteredPriceId,
    brandId: brand.id,
    brandName: brand.name,
    basePriceId: process.env.STRIPE_BASE_PRICE_ID, // Optional base fee
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Save subscription info to brand
  await supabase
    .from('brands')
    .update({
      stripe_subscription_id: result.subscriptionId,
      stripe_subscription_item_id: result.subscriptionItemId,
      billing_enabled: true,
    })
    .eq('id', brandId)

  return NextResponse.json({
    success: true,
    subscription: {
      id: result.subscriptionId,
      itemId: result.subscriptionItemId,
    },
    message: 'Metered billing enabled for this brand. Usage will be charged at end of billing period.',
  })
}

/**
 * DELETE - Disable billing for a brand (cancel subscription)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get brand
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, stripe_subscription_id')
    .eq('id', brandId)
    .single()

  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  if (!brand.stripe_subscription_id) {
    return NextResponse.json({ error: 'No subscription to cancel' }, { status: 400 })
  }

  const stripe = getStripe()

  // Cancel subscription at period end (allow usage until then)
  await stripe.subscriptions.update(brand.stripe_subscription_id, {
    cancel_at_period_end: true,
  })

  // Update brand
  await supabase
    .from('brands')
    .update({ billing_enabled: false })
    .eq('id', brandId)

  return NextResponse.json({
    success: true,
    message: 'Subscription will be canceled at end of billing period.',
  })
}
