import { getStripe } from './client'

// Margin multiplier for pricing
export const MARGIN_MULTIPLIER = 5

// Price per credit in cents (after margin)
// 1 credit = 1 API call = ~$0.01 actual cost → $0.05 display cost
export const CENTS_PER_CREDIT = 5

/**
 * Report usage to Stripe for metered billing
 * 
 * Usage is reported in "credits" where:
 * - 1 scan = 1 credit per model
 * - 1 memo generation = 5 credits
 * - 1 lab prompt = 1 credit per model
 * 
 * Credits are priced at $0.05 each (5x margin on ~$0.01 actual cost)
 */
export async function reportUsageToStripe(params: {
  stripeCustomerId: string
  subscriptionItemId: string
  credits: number
  brandId?: string
  description?: string
  timestamp?: Date
}): Promise<{ success: boolean; error?: string }> {
  const stripe = getStripe()
  
  try {
    // Note: Stripe SDK v20 removed the legacy subscription item usage records API.
    // This needs to be migrated to stripe.billing.meterEvents for usage-based billing.
    // For now, we log usage locally and skip the Stripe API call.
    // TODO: Migrate to stripe.billing.meterEvents API
    console.log(`[Stripe] Would report ${params.credits} credits for subscription item ${params.subscriptionItemId}`)
    console.log(`[Stripe] Note: Legacy usage records API not available in Stripe SDK v20. Migration needed.`)
    
    // Uncomment when migrated to billing.meterEvents:
    // await stripe.billing.meterEvents.create({
    //   event_name: 'credits_used',
    //   payload: {
    //     stripe_customer_id: params.stripeCustomerId,
    //     value: params.credits.toString(),
    //   },
    //   identifier: `usage-${params.subscriptionItemId}-${Date.now()}`,
    // })

    return { success: true }
  } catch (error) {
    console.error('[Stripe] Failed to report usage:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create a metered subscription for a brand
 * 
 * This creates a subscription with usage-based pricing where:
 * - No upfront cost (or optional base fee)
 * - Charged per credit used at end of billing period
 */
export async function createMeteredSubscription(params: {
  customerId: string
  meteredPriceId: string
  brandId: string
  brandName: string
  basePriceId?: string // Optional base subscription fee
}): Promise<{ 
  success: boolean
  subscriptionId?: string
  subscriptionItemId?: string
  error?: string 
}> {
  const stripe = getStripe()
  
  try {
    const lineItems: Array<{ price: string; quantity?: number }> = []
    
    // Add base fee if provided
    if (params.basePriceId) {
      lineItems.push({ price: params.basePriceId, quantity: 1 })
    }
    
    // Add metered usage price
    lineItems.push({ price: params.meteredPriceId })
    
    const subscription = await stripe.subscriptions.create({
      customer: params.customerId,
      items: lineItems,
      metadata: {
        brand_id: params.brandId,
        brand_name: params.brandName,
        billing_type: 'metered',
      },
      // Allow incomplete to not require payment method upfront
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    })

    // Find the metered subscription item
    const meteredItem = subscription.items.data.find(item => {
      const price = item.price
      return price.recurring?.usage_type === 'metered'
    })

    return {
      success: true,
      subscriptionId: subscription.id,
      subscriptionItemId: meteredItem?.id,
    }
  } catch (error) {
    console.error('[Stripe] Failed to create metered subscription:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get usage summary for a subscription
 */
export async function getSubscriptionUsage(subscriptionItemId: string): Promise<{
  totalCredits: number
  periodStart: Date
  periodEnd: Date
} | null> {
  const stripe = getStripe()
  
  try {
    // Note: Stripe SDK v20 removed the legacy usage record summaries API.
    // This needs to be migrated to stripe.billing.meters for usage queries.
    // TODO: Migrate to stripe.billing.meters API
    console.log(`[Stripe] Would get usage summary for subscription item ${subscriptionItemId}`)
    console.log(`[Stripe] Note: Legacy usage records API not available in Stripe SDK v20. Migration needed.`)
    
    // Return null for now - usage tracking will need to be handled differently
    return null
  } catch (error) {
    console.error('[Stripe] Failed to get usage summary:', error)
    return null
  }
}

/**
 * Calculate credits from cost
 * 
 * Converts actual cost to display credits
 */
export function calculateCredits(actualCostCents: number): number {
  // Apply margin and convert to credits
  const displayCostCents = actualCostCents * MARGIN_MULTIPLIER
  return Math.ceil(displayCostCents / CENTS_PER_CREDIT)
}

/**
 * Calculate cost from credits
 */
export function calculateCostFromCredits(credits: number): {
  displayCostCents: number
  displayCostDollars: string
} {
  const displayCostCents = credits * CENTS_PER_CREDIT
  return {
    displayCostCents,
    displayCostDollars: (displayCostCents / 100).toFixed(2),
  }
}
