import Stripe from 'stripe'

// Server-side Stripe client (lazy initialization to avoid build-time errors)
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  }
  return _stripe
}

// For backward compatibility - use getStripe() in new code
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string, unknown>)[prop as string]
  }
})

// Pricing Plans
export const PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For small companies monitoring brand visibility',
    price: 79,
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: [
      '50 prompts tracked',
      '3 AI engines (GPT, Claude, Perplexity)',
      '5 memos per month',
      '1 brand',
      'CSV exports',
      'Email support',
    ],
    limits: {
      prompts: 50,
      models: 3, // GPT, Claude, Perplexity only
      memos_per_month: 5,
      brands: 1,
      seats: 1,
      scan_frequency_days: 7,
    },
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    description: 'For growing companies optimizing AI visibility',
    price: 199,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID,
    popular: true,
    features: [
      '150 prompts tracked',
      '7 AI engines + AI Overviews',
      'Unlimited memos',
      '3 brands',
      'Competitor intelligence',
      'AI traffic attribution',
      'CSV/JSON exports',
      'Priority email support',
    ],
    limits: {
      prompts: 150,
      models: 7, // All enabled models
      memos_per_month: -1, // Unlimited
      brands: 3,
      seats: 3,
      scan_frequency_days: 3,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large companies and agencies',
    price: null, // Custom pricing
    priceId: null,
    features: [
      'Unlimited prompts',
      'All AI engines',
      'Unlimited memos',
      'Unlimited brands',
      'API access',
      'SSO/SAML',
      'Dedicated support',
      'Custom integrations',
    ],
    limits: {
      prompts: -1,
      models: -1,
      memos_per_month: -1,
      brands: -1,
      seats: -1,
      scan_frequency_days: 1,
    },
  },
} as const

export type PlanId = keyof typeof PLANS
export type Plan = typeof PLANS[PlanId]

// Get plan by Stripe price ID
export function getPlanByPriceId(priceId: string): Plan | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.priceId === priceId) {
      return plan
    }
  }
  return null
}

// Check if a plan has a specific feature
export function planHasFeature(planId: PlanId, feature: string): boolean {
  const plan = PLANS[planId]
  return plan.features.some(f => f.toLowerCase().includes(feature.toLowerCase()))
}

// Check usage against plan limits
export interface UsageCheck {
  allowed: boolean
  current: number
  limit: number
  limitType: 'prompts' | 'memos_per_month' | 'brands' | 'models' | 'seats' | 'scan_frequency_days'
}

export function checkUsageLimit(
  planId: PlanId,
  limitType: keyof Plan['limits'],
  currentUsage: number
): UsageCheck {
  const plan = PLANS[planId]
  const limit = plan.limits[limitType]
  
  return {
    allowed: limit === -1 || currentUsage < limit,
    current: currentUsage,
    limit: limit === -1 ? Infinity : limit,
    limitType,
  }
}

export function getScanFrequencyDays(planId: PlanId): number {
  const plan = PLANS[planId]
  const days = plan.limits.scan_frequency_days
  if (typeof days !== 'number' || days <= 0) return 1
  return days
}
