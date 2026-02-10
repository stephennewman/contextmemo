import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/usage/route'

// Mock the supabase server module
const mockGetUser = vi.fn()

// Create a thenable mock that can be both chained and awaited
const createThenableMock = () => {
  const mock: Record<string, unknown> = {}
  
  // Make it thenable (can be awaited)
  mock.then = (resolve: (value: unknown) => void) => {
    resolve(mock._resolvedValue)
    return Promise.resolve(mock._resolvedValue)
  }
  mock._resolvedValue = { data: null, error: null }
  
  // Chainable methods
  mock.select = vi.fn((...args: unknown[]) => {
    mock._lastSelect = args
    return mock
  })
  mock.eq = vi.fn(() => mock)
  mock.in = vi.fn(() => mock)
  mock.gte = vi.fn(() => mock)
  mock.order = vi.fn(() => mock)
  mock.single = vi.fn(() => {
    mock._resolvedValue = mock._singleValue || { data: null, error: null }
    return mock
  })
  mock.maybeSingle = vi.fn(() => {
    mock._resolvedValue = mock._singleValue || { data: null, error: null }
    return mock
  })
  
  // Methods to set resolved values
  mock._resolveWith = (value: unknown) => {
    mock._resolvedValue = value
    return mock
  }
  mock._setSingleValue = (value: unknown) => {
    mock._singleValue = value
    return mock
  }
  
  return mock
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => 
    Promise.resolve({
      auth: {
        getUser: () => mockGetUser(),
      },
      from: vi.fn(() => createThenableMock()),
    })
  ),
}))

describe('GET /api/usage', () => {
  const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'
  const MOCK_TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02'
  const MOCK_BRAND_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03'

  // Margin multiplier: displayed cost = actual cost * 5
  const MARGIN_MULTIPLIER = 5
  const DEFAULT_BRAND_BALANCE = 50

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await GET()
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Not authenticated')
  })

  it('should return 404 when tenant not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: null, error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return tenantMock.single()
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('No tenant found')
  })

  it('should return usage data for authenticated user with brands', async () => {
    const brands = [{ id: MOCK_BRAND_ID, name: 'Test Brand' }]
    const usageEvents = [
      { total_cost_cents: 100, brand_id: MOCK_BRAND_ID }, // $1.00 actual
    ]

    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: brands, error: null })
    
    const usageQuery = createThenableMock()
    usageQuery._resolveWith({ data: usageEvents, error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return tenantMock.single()
        }
        if (table === 'brands') {
          return brandsMock
        }
        if (table === 'usage_events') {
          return usageQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    
    // Actual cost: 100 cents = $1.00
    // Displayed cost: $1.00 * 5 = $5.00
    // Balance: $50 - $5 = $45
    expect(body.totalSpent).toBe(5) // $5.00 displayed
    expect(body.totalBalance).toBe(45) // $50 - $5 = $45
    expect(body.byBrand).toHaveLength(1)
    expect(body.byBrand[0].brandId).toBe(MOCK_BRAND_ID)
    expect(body.byBrand[0].brandName).toBe('Test Brand')
    expect(body.byBrand[0].spent).toBe(5)
    expect(body.byBrand[0].balance).toBe(45)
    expect(body.byBrand[0].startingBalance).toBe(DEFAULT_BRAND_BALANCE)
  })

  it('should handle user with no brands', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: [], error: null })
    
    const usageQuery = createThenableMock()
    usageQuery._resolveWith({ data: [], error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return tenantMock.single()
        }
        if (table === 'brands') {
          return brandsMock
        }
        if (table === 'usage_events') {
          return usageQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.totalSpent).toBe(0)
    expect(body.totalBalance).toBe(0)
    expect(body.byBrand).toEqual([])
  })

  it('should handle brands with no usage events', async () => {
    const brands = [{ id: MOCK_BRAND_ID, name: 'Test Brand' }]

    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: brands, error: null })
    
    const usageQuery = createThenableMock()
    usageQuery._resolveWith({ data: [], error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return tenantMock.single()
        }
        if (table === 'brands') {
          return brandsMock
        }
        if (table === 'usage_events') {
          return usageQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    const body = await response.json()
    
    expect(body.totalSpent).toBe(0)
    expect(body.totalBalance).toBe(DEFAULT_BRAND_BALANCE)
    expect(body.byBrand[0].spent).toBe(0)
    expect(body.byBrand[0].balance).toBe(DEFAULT_BRAND_BALANCE)
  })

  it('should handle usage events with null cost', async () => {
    const brands = [{ id: MOCK_BRAND_ID, name: 'Test Brand' }]
    const usageEvents = [
      { total_cost_cents: null, brand_id: MOCK_BRAND_ID },
    ]

    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: brands, error: null })
    
    const usageQuery = createThenableMock()
    usageQuery._resolveWith({ data: usageEvents, error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return tenantMock.single()
        }
        if (table === 'brands') {
          return brandsMock
        }
        if (table === 'usage_events') {
          return usageQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    const body = await response.json()
    
    expect(body.totalSpent).toBe(0)
    expect(body.byBrand[0].spent).toBe(0)
  })

  it('should handle usage events with null brand_id', async () => {
    const brands = [{ id: MOCK_BRAND_ID, name: 'Test Brand' }]
    const usageEvents = [
      { total_cost_cents: 100, brand_id: null }, // Should be ignored
    ]

    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: brands, error: null })
    
    const usageQuery = createThenableMock()
    usageQuery._resolveWith({ data: usageEvents, error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return tenantMock.single()
        }
        if (table === 'brands') {
          return brandsMock
        }
        if (table === 'usage_events') {
          return usageQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    const body = await response.json()
    
    // Event with null brand_id should be ignored
    expect(body.totalSpent).toBe(0)
    expect(body.byBrand[0].spent).toBe(0)
  })

  it('should not allow negative balance', async () => {
    const brands = [{ id: MOCK_BRAND_ID, name: 'Test Brand' }]
    // Cost that would result in negative balance
    // 1200 cents actual = $12.00 actual
    // Displayed: $12.00 * 5 = $60.00
    // Balance would be: $50 - $60 = -$10, but should be clamped to 0
    const usageEvents = [
      { total_cost_cents: 1200, brand_id: MOCK_BRAND_ID },
    ]

    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: brands, error: null })
    
    const usageQuery = createThenableMock()
    usageQuery._resolveWith({ data: usageEvents, error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return tenantMock.single()
        }
        if (table === 'brands') {
          return brandsMock
        }
        if (table === 'usage_events') {
          return usageQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    const body = await response.json()
    
    expect(body.byBrand[0].balance).toBe(0) // Clamped to 0
    expect(body.totalBalance).toBe(0)
  })

  it('should aggregate multiple usage events for same brand', async () => {
    const brands = [{ id: MOCK_BRAND_ID, name: 'Test Brand' }]
    // Two events: 100 + 200 = 300 cents actual = $3.00 actual
    // Displayed: $3.00 * 5 = $15.00
    // Balance: $50 - $15 = $35
    const usageEvents = [
      { total_cost_cents: 100, brand_id: MOCK_BRAND_ID },
      { total_cost_cents: 200, brand_id: MOCK_BRAND_ID },
    ]

    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: brands, error: null })
    
    const usageQuery = createThenableMock()
    usageQuery._resolveWith({ data: usageEvents, error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return tenantMock.single()
        }
        if (table === 'brands') {
          return brandsMock
        }
        if (table === 'usage_events') {
          return usageQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    const body = await response.json()
    
    expect(body.byBrand[0].spent).toBe(15) // ($1 + $2) * 5 = $15
    expect(body.byBrand[0].balance).toBe(35) // $50 - $15 = $35
  })

  it('should include startingBalance in response', async () => {
    const brands = [{ id: MOCK_BRAND_ID, name: 'Test Brand' }]

    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: brands, error: null })
    
    const usageQuery = createThenableMock()
    usageQuery._resolveWith({ data: [], error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return tenantMock.single()
        }
        if (table === 'brands') {
          return brandsMock
        }
        if (table === 'usage_events') {
          return usageQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    const body = await response.json()
    
    expect(body.byBrand[0].startingBalance).toBe(DEFAULT_BRAND_BALANCE)
  })

  it('should handle brand not in brandMap (unknown brand name)', async () => {
    // Brand ID in usage events but not in brands list
    const brands = [{ id: MOCK_BRAND_ID, name: 'Test Brand' }]
    const unknownBrandId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99'
    const usageEvents = [
      { total_cost_cents: 100, brand_id: unknownBrandId },
    ]

    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: brands, error: null })
    
    const usageQuery = createThenableMock()
    usageQuery._resolveWith({ data: usageEvents, error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return tenantMock.single()
        }
        if (table === 'brands') {
          return brandsMock
        }
        if (table === 'usage_events') {
          return usageQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    const body = await response.json()
    
    // The unknown brand ID won't be in byBrand since it's not in the brands list
    expect(body.byBrand).toHaveLength(1)
    expect(body.byBrand[0].brandId).toBe(MOCK_BRAND_ID)
    expect(body.byBrand[0].spent).toBe(0)
  })

  it('should query usage events with correct tenant filter', async () => {
    const brands = [{ id: MOCK_BRAND_ID, name: 'Test Brand' }]

    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: brands, error: null })
    
    const usageQuery = createThenableMock()
    usageQuery._resolveWith({ data: [], error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return tenantMock.single()
        }
        if (table === 'brands') {
          return brandsMock
        }
        if (table === 'usage_events') {
          return usageQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    await GET()

    expect(usageQuery.eq).toHaveBeenCalledWith('tenant_id', MOCK_TENANT_ID)
  })

  it('should sort brands by spent amount descending', async () => {
    const brand1 = { id: 'brand-1', name: 'Brand 1' }
    const brand2 = { id: 'brand-2', name: 'Brand 2' }
    const brands = [brand1, brand2]
    
    // Brand 1: 200 cents = $2 actual = $10 displayed
    // Brand 2: 400 cents = $4 actual = $20 displayed
    const usageEvents = [
      { total_cost_cents: 200, brand_id: brand1.id },
      { total_cost_cents: 400, brand_id: brand2.id },
    ]

    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: brands, error: null })
    
    const usageQuery = createThenableMock()
    usageQuery._resolveWith({ data: usageEvents, error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'tenants') {
          return tenantMock.single()
        }
        if (table === 'brands') {
          return brandsMock
        }
        if (table === 'usage_events') {
          return usageQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    const body = await response.json()
    
    // Brand 2 should come first (higher spend)
    expect(body.byBrand[0].brandId).toBe(brand2.id)
    expect(body.byBrand[0].spent).toBe(20)
    expect(body.byBrand[1].brandId).toBe(brand1.id)
    expect(body.byBrand[1].spent).toBe(10)
  })
})
