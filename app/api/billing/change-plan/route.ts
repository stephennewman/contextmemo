import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe, PLANS, PlanId } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { getClientIp } from '@/lib/security/ip'
import { rateLimit } from '@/lib/security/rate-limit'

const planIds = Object.keys(PLANS) as [PlanId, ...PlanId[]]
const changePlanSchema = z.object({
  planId: z.enum(planIds),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rate = await rateLimit({
      key: `billing:change-plan:ip:${ip}`,
      windowMs: 60_000,
      max: 10,
    })

    if (!rate.allowed) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parsed = changePlanSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { planId } = parsed.data
    const plan = PLANS[planId]

    if (!plan?.priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    if (!tenant.stripe_customer_id || !tenant.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)
    const currentItem = subscription.items.data[0]

    if (!currentItem) {
      return NextResponse.json({ error: 'Subscription has no items' }, { status: 400 })
    }

    if (currentItem.price.id === plan.priceId) {
      return NextResponse.json({ success: true, message: 'Plan already active' })
    }

    const updated = await stripe.subscriptions.update(tenant.stripe_subscription_id, {
      items: [{ id: currentItem.id, price: plan.priceId }],
      proration_behavior: 'create_prorations',
      cancel_at_period_end: false,
    })

    return NextResponse.json({
      success: true,
      subscriptionId: updated.id,
      status: updated.status,
    })
  } catch (error) {
    console.error('Change plan error:', error)
    return NextResponse.json({ error: 'Failed to change plan' }, { status: 500 })
  }
}
