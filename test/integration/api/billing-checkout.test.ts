import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/billing/checkout/route'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { rateLimit } from '@/lib/security/rate-limit'
import { validateCSRFToken } from '@/lib/security/csrf'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock Stripe
vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    customers: {
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
  PLANS: {
    starter: { id: 'starter', name: 'Starter', priceId: 'price_starter' },
    growth: { id: 'growth', name: 'Growth', priceId: 'price_growth' },
    enterprise: { id: 'enterprise', name: 'Enterprise', priceId: null },
  },
  PlanId: {}, // Mock PlanId enum if needed
}))

// Mock rate-limit
vi.mock('@/lib/security/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9, resetMs: 12345 }),
}))

// Mock CSRF
vi.mock('@/lib/security/csrf', () => ({
  validateCSRFToken: vi.fn().mockResolvedValue(true),
  getCSRFHeaderName: vi.fn().mockReturnValue('x-csrf-token'),
}))

describe('POST /api/billing/checkout', () => {
  const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001'
  const MOCK_IP = '127.0.0.1'
  const MOCK_TENANT_EMAIL = 'test@example.com'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabaseMock: any

  beforeEach(() => {
    vi.clearAllMocks()

    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: MOCK_USER_ID, email: MOCK_TENANT_EMAIL } } }),
      },
      from: vi.fn(() => supabaseMock),
      select: vi.fn(() => supabaseMock),
      eq: vi.fn(() => supabaseMock),
      single: vi.fn(),
      update: vi.fn(() => supabaseMock),
    }
    vi.mocked(createClient).mockResolvedValue(supabaseMock)

    vi.mocked(rateLimit).mockResolvedValue({ allowed: true, remaining: 9, resetMs: 12345 })
    vi.mocked(validateCSRFToken).mockResolvedValue(true)

    vi.mocked(stripe.customers.create).mockResolvedValue({ id: 'cus_123' } as never)
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({ url: 'http://stripe.checkout/session' } as never)
  })

  it('should return 401 if unauthenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })

    const request = new NextRequest(new URL('http://localhost/api/billing/checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'valid-csrf-token' },
      body: JSON.stringify({ planId: 'starter' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 403 if CSRF token is invalid', async () => {
    vi.mocked(validateCSRFToken).mockResolvedValue(false)

    const request = new NextRequest(new URL('http://localhost/api/billing/checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'invalid-csrf-token' },
      body: JSON.stringify({ planId: 'starter' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Invalid CSRF token')
  })

  it('should return 429 if rate limited', async () => {
    vi.mocked(rateLimit).mockResolvedValue({ allowed: false, remaining: 0, resetMs: 0 })

    const request = new NextRequest(new URL('http://localhost/api/billing/checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': MOCK_IP, 'x-csrf-token': 'valid-csrf-token' },
      body: JSON.stringify({ planId: 'starter' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toBe('Rate limited')
  })

  it('should return 400 for invalid planId in request body', async () => {
    const request = new NextRequest(new URL('http://localhost/api/billing/checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'valid-csrf-token' },
      body: JSON.stringify({ planId: 'invalid-plan' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid request')
  })

  it('should return 404 if tenant not found', async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: null, error: null }) // for tenant

    const request = new NextRequest(new URL('http://localhost/api/billing/checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'valid-csrf-token' },
      body: JSON.stringify({ planId: 'starter' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Tenant not found')
  })

  it('should create a Stripe customer if one does not exist and proceed to checkout', async () => {
    supabaseMock.single
      .mockResolvedValueOnce({ data: { id: MOCK_USER_ID, email: MOCK_TENANT_EMAIL, stripe_customer_id: null }, error: null }) // for tenant
      .mockResolvedValueOnce({ data: { /* no specific data for update */ }, error: null }) // for tenant update

    const request = new NextRequest(new URL('http://localhost/api/billing/checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'valid-csrf-token' },
      body: JSON.stringify({ planId: 'starter' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.url).toBe('http://stripe.checkout/session')
    expect(stripe.customers.create).toHaveBeenCalledWith(expect.objectContaining({
      email: MOCK_TENANT_EMAIL,
      metadata: { tenant_id: MOCK_USER_ID },
    }))
    expect(supabaseMock.update).toHaveBeenCalledWith({ stripe_customer_id: 'cus_123' })
    expect(stripe.checkout.sessions.create).toHaveBeenCalled()
  })

  it('should use existing Stripe customer and proceed to checkout', async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: { id: MOCK_USER_ID, email: MOCK_TENANT_EMAIL, stripe_customer_id: 'cus_abc' }, error: null }) // for tenant

    const request = new NextRequest(new URL('http://localhost/api/billing/checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'valid-csrf-token' },
      body: JSON.stringify({ planId: 'starter' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.url).toBe('http://stripe.checkout/session')
    expect(stripe.customers.create).not.toHaveBeenCalled()
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_abc',
      line_items: [{ price: 'price_starter', quantity: 1 }],
    }))
  })

  it('should return 400 for enterprise plan (no priceId) and suggest contact', async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: { id: MOCK_USER_ID, email: MOCK_TENANT_EMAIL, stripe_customer_id: 'cus_abc' }, error: null }) // for tenant

    const request = new NextRequest(new URL('http://localhost/api/billing/checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'valid-csrf-token' },
      body: JSON.stringify({ planId: 'enterprise' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Contact sales for enterprise pricing')
    expect(body.contactUrl).toBe('mailto:sales@contextmemo.com')
  })

  it('should return 500 with generic error on unexpected internal error', async () => {
    vi.mocked(stripe.checkout.sessions.create).mockImplementationOnce(() => {
      throw new Error('Stripe API error')
    })

    supabaseMock.single.mockResolvedValueOnce({ data: { id: MOCK_USER_ID, email: MOCK_TENANT_EMAIL, stripe_customer_id: 'cus_abc' }, error: null }) // for tenant

    const request = new NextRequest(new URL('http://localhost/api/billing/checkout'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': 'valid-csrf-token' },
      body: JSON.stringify({ planId: 'starter' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('An unexpected error occurred')
  })
})
