import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe, PLANS, PlanId } from '@/lib/stripe/client'
import { createClient } from '@/lib/supabase/server'
import { getClientIp } from '@/lib/security/ip'
import { rateLimit } from '@/lib/security/rate-limit'
import { validateCSRFToken } from '@/lib/security/csrf'
import { logAuditEvent } from '@/lib/security/audit-events'

const planIds = Object.keys(PLANS) as [PlanId, ...PlanId[]]
const changePlanSchema = z.object({
  planId: z.enum(planIds),
})

interface Tenant {
  id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: string | null
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  let userId = 'unknown'
  let tenant: Tenant | null = null
//let oldPlanId = 'unknown'

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      await logAuditEvent({
        action: 'change_plan_attempt',
        userId,
        tenantId: userId,
        resourceType: 'plan',
        resourceId: userId,
        metadata: { status: 'failed', reason: 'unauthorized' },
      }, request)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    userId = user.id

    const rate = await rateLimit({
      key: `billing:change-plan:ip:${ip}`,
      windowMs: 60_000,
      max: 10,
    })

    if (!rate.allowed) {
      await logAuditEvent({
        action: 'change_plan_attempt',
        userId,
        tenantId: userId,
        resourceType: 'plan',
        resourceId: userId,
        metadata: { status: 'failed', reason: 'rate_limited' },
      }, request)
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    if (!await validateCSRFToken(request)) {
      await logAuditEvent({
        action: 'change_plan_attempt',
        userId,
        tenantId: userId,
        resourceType: 'plan',
        resourceId: userId,
        metadata: { status: 'failed', reason: 'invalid_csrf' },
      }, request)
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
    }

    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id, stripe_customer_id, stripe_subscription_id, plan')
      .eq('id', userId)
      .single()

    if (!tenantData) {
      await logAuditEvent({
        action: 'change_plan_attempt',
        userId,
        tenantId: userId,
        resourceType: 'plan',
        resourceId: userId,
        metadata: { status: 'failed', reason: 'tenant_not_found' },
      }, request)
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    tenant = tenantData
    //oldPlanId = tenant.plan || 'unknown'

    const body = await request.json().catch(() => null)
    const parsed = changePlanSchema.safeParse(body)

    if (!parsed.success) {
      await logAuditEvent({
        action: 'change_plan_attempt',
        userId,
        tenantId: userId,
        resourceType: 'plan',
        resourceId: userId,
        metadata: { status: 'failed', reason: 'invalid_request_body', details: parsed.error.format() },
      }, request)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { planId } = parsed.data
    const plan = PLANS[planId]

    if (!plan?.priceId) {
      await logAuditEvent({
        action: 'change_plan_attempt',
        userId,
        tenantId: userId,
        resourceType: 'plan',
        resourceId: userId,
        metadata: { status: 'failed', reason: 'invalid_plan_id', requestedPlanId: planId },
      }, request)
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (!tenant.stripe_customer_id || !tenant.stripe_subscription_id) {
      await logAuditEvent({
        action: 'change_plan_attempt',
        userId,
        tenantId: tenant.id,
        resourceType: 'plan',
        resourceId: tenant.id,
        metadata: { status: 'failed', reason: 'no_active_subscription', currentPlan: tenant.plan },
      }, request)
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
    }

    const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id)
    const currentItem = subscription.items.data[0]

    if (!currentItem) {
      await logAuditEvent({
        action: 'change_plan_attempt',
        userId,
        tenantId: tenant.id,
        resourceType: 'plan',
        resourceId: tenant.id,
        metadata: { status: 'failed', reason: 'subscription_has_no_items' },
      }, request)
      return NextResponse.json({ error: 'Subscription has no items' }, { status: 400 })
    }

    if (currentItem.price.id === plan.priceId) {
      await logAuditEvent({
        action: 'change_plan',
        userId,
        tenantId: tenant.id,
        resourceType: 'plan',
        resourceId: tenant.id,
        metadata: { status: 'no_change', currentPlan: tenant.plan, requestedPlan: planId },
      }, request)
      return NextResponse.json({ success: true, message: 'Plan already active' })
    }

    const updated = await stripe.subscriptions.update(tenant.stripe_subscription_id, {
      items: [{ id: currentItem.id, price: plan.priceId }],
      proration_behavior: 'create_prorations',
      cancel_at_period_end: false,
    })

    await logAuditEvent({
      action: 'change_plan',
      userId,
      tenantId: tenant.id,
      resourceType: 'plan',
      resourceId: tenant.id,
      changes: {
        plan: { from: tenant.plan, to: planId },
      },
      metadata: { status: 'success', newSubscriptionStatus: updated.status },
    }, request)

    return NextResponse.json({
      success: true,
      subscriptionId: updated.id,
      status: updated.status,
    })
  } catch (error: unknown) {
    console.error('Change plan error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await logAuditEvent({
      action: 'change_plan_attempt',
      userId,
      tenantId: userId,
      resourceType: 'plan',
      resourceId: userId,
      metadata: { status: 'failed', reason: 'internal_error', errorMessage },
    }, request)
    return NextResponse.json({ error: 'An unexpected error occurred while changing plan' }, { status: 500 })
  }
}
