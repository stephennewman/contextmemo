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
    // Create usage record on the subscription item
    await stripe.subscriptionItems.createUsageRecord(
      params.subscriptionItemId,
      {
        quantity: params.credits,
        timestamp: params.timestamp 
          ? Math.floor(params.timestamp.getTime() / 1000) 
          : 'now',
        action: 'increment',
      },
      {
        idempotencyKey: `usage-${params.subscriptionItemId}-${Date.now()}-${params.credits}`,
      }
    )

    console.log(`[Stripe] Reported ${params.credits} credits for subscription item ${params.subscriptionItemId}`)
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
    const usageSummary = await stripe.subscriptionItems.listUsageRecordSummaries(
      subscriptionItemId,
      { limit: 1 }
    )

    const summary = usageSummary.data[0]
    if (!summary) return null

    return {
      totalCredits: summary.total_usage,
      periodStart: new Date(summary.period.start * 1000),
      periodEnd: new Date(summary.period.end * 1000),
    }
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
