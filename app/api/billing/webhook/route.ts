import { NextRequest, NextResponse } from 'next/server'
import { stripe, getPlanByPriceId } from '@/lib/stripe/client'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCanceled(subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  // Get tenant by customer ID
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!tenant) {
    console.error('Tenant not found for customer:', customerId)
    return
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id
  const plan = getPlanByPriceId(priceId)

  // Update tenant plan
  await supabase
    .from('tenants')
    .update({
      plan: plan?.id || 'starter',
      // Store subscription metadata for reference
    })
    .eq('id', tenant.id)

  console.log(`Checkout completed for tenant ${tenant.id}, plan: ${plan?.id}`)
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id
  const plan = getPlanByPriceId(priceId)
  const status = subscription.status

  // Get tenant by customer ID
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!tenant) {
    console.error('Tenant not found for customer:', customerId)
    return
  }

  // Only update plan if subscription is active
  if (status === 'active' || status === 'trialing') {
    await supabase
      .from('tenants')
      .update({ plan: plan?.id || 'free' })
      .eq('id', tenant.id)

    console.log(`Subscription updated for tenant ${tenant.id}, plan: ${plan?.id}, status: ${status}`)
  }
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Get tenant by customer ID
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!tenant) {
    console.error('Tenant not found for customer:', customerId)
    return
  }

  // Downgrade to free plan
  await supabase
    .from('tenants')
    .update({ plan: 'free' })
    .eq('id', tenant.id)

  console.log(`Subscription canceled for tenant ${tenant.id}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Get tenant by customer ID
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, email')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!tenant) {
    console.error('Tenant not found for customer:', customerId)
    return
  }

  // Create alert for the user
  const { data: brands } = await supabase
    .from('brands')
    .select('id')
    .eq('tenant_id', tenant.id)
    .limit(1)

  if (brands && brands[0]) {
    await supabase.from('alerts').insert({
      brand_id: brands[0].id,
      alert_type: 'payment_failed',
      title: 'Payment Failed',
      message: 'Your payment failed. Please update your payment method to continue using ContextMemo.',
    })
  }

  console.log(`Payment failed for tenant ${tenant.id}`)
}
