import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/brands/[brandId]/voice-insights/route'

// Mock the supabase server module
const mockGetUser = vi.fn()

// Interface for the thenable mock
interface ThenableMock {
  then: (resolve: (value: unknown) => void) => Promise<unknown>
  _resolvedValue: unknown
  _singleValue?: unknown
  _lastSelect?: unknown[]
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  gte: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  _resolveWith: (value: unknown) => ThenableMock
  _setSingleValue: (value: unknown) => ThenableMock
  insert?: ReturnType<typeof vi.fn>
}

// Create a thenable mock that can be both chained and awaited
const createThenableMock = (): ThenableMock => {
  const mock = {} as ThenableMock
  
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

describe('GET /api/brands/[brandId]/voice-insights', () => {
  const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'
  const MOCK_BRAND_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02'
  const INVALID_BRAND_ID = 'invalid-uuid'

  const makeRequest = (url: string) => {
    return new NextRequest(new URL(url))
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 for invalid brandId format', async () => {
    const request = makeRequest(`http://localhost/api/brands/${INVALID_BRAND_ID}/voice-insights`)
    const params = Promise.resolve({ brandId: INVALID_BRAND_ID })
    
    const response = await GET(request, { params })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid brandId format')
  })

  it('should return 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const request = makeRequest(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights`)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    const response = await GET(request, { params })
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 401 when auth error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Auth error' } })

    const request = makeRequest(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights`)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    const response = await GET(request, { params })
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('should return voice insights for authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const mockInsights = [
      { id: 'insight-1', title: 'Test Insight', topic: 'product', status: 'active' },
    ]
    
    const query = createThenableMock()
    query._resolveWith({ data: mockInsights, error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn(() => query),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights`)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    const response = await GET(request, { params })
    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.insights).toEqual(mockInsights)
  })

  it('should filter by topic when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const query = createThenableMock()
    query._resolveWith({ data: [], error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn(() => query),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights?topic=product`)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    await GET(request, { params })

    // Should have called eq for topic filter
    expect(query.eq).toHaveBeenCalledWith('topic', 'product')
  })

  it('should filter by status (default: active)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const query = createThenableMock()
    query._resolveWith({ data: [], error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn(() => query),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights`)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    await GET(request, { params })

    expect(query.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('should filter by custom status when provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const query = createThenableMock()
    query._resolveWith({ data: [], error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn(() => query),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights?status=archived`)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    await GET(request, { params })

    expect(query.eq).toHaveBeenCalledWith('status', 'archived')
  })

  it('should return 500 on database error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const query = createThenableMock()
    query._resolveWith({ data: null, error: { message: 'DB error' } })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn(() => query),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights`)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    const response = await GET(request, { params })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to fetch insights')
  })

  it('should order by recorded_at descending', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const query = createThenableMock()
    query._resolveWith({ data: [], error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn(() => query),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights`)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    await GET(request, { params })

    expect(query.order).toHaveBeenCalledWith('recorded_at', { ascending: false })
  })

  it('should return empty array when no insights found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const query = createThenableMock()
    query._resolveWith({ data: [], error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn(() => query),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights`)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    const response = await GET(request, { params })
    const body = await response.json()
    
    expect(body.insights).toEqual([])
  })
})

describe('POST /api/brands/[brandId]/voice-insights', () => {
  const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'
  const MOCK_BRAND_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02'
  const MOCK_TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03'

  const makeRequest = (brandId: string, body: Record<string, unknown>) => {
    return new NextRequest(new URL(`http://localhost/api/brands/${brandId}/voice-insights`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  const validBody = {
    title: 'Test Insight',
    transcript: 'This is a test transcript that is long enough.',
    topic: 'product',
    recorded_by_name: 'John Doe',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 for invalid brandId format', async () => {
    const request = makeRequest('invalid-uuid', validBody)
    const params = Promise.resolve({ brandId: 'invalid-uuid' })
    
    const response = await POST(request, { params })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid brandId format')
  })

  it('should return 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const request = makeRequest(MOCK_BRAND_ID, validBody)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    const response = await POST(request, { params })
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 404 when brand not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: null, error: { message: 'Not found' } })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(MOCK_BRAND_ID, validBody)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    const response = await POST(request, { params })
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Brand not found')
  })

  it('should return 400 for missing required fields', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_TENANT_ID }, error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(MOCK_BRAND_ID, { title: 'Test' }) // Missing transcript, topic, recorded_by_name
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    const response = await POST(request, { params })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Missing or invalid fields for voice insight')
  })

  it('should return 400 for title too short', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_TENANT_ID }, error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(MOCK_BRAND_ID, { ...validBody, title: 'A' })
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    const response = await POST(request, { params })
    expect(response.status).toBe(400)
  })

  it('should return 400 for transcript too short', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_TENANT_ID }, error: null })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(MOCK_BRAND_ID, { ...validBody, transcript: 'short' })
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    const response = await POST(request, { params })
    expect(response.status).toBe(400)
  })

  it('should create voice insight successfully', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID, email: 'test@example.com' } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_TENANT_ID }, error: null })
    
    const insertQuery = createThenableMock()
    const mockInsight = { id: 'insight-1', ...validBody }
    insertQuery.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: mockInsight, error: null }),
      })),
    }))
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        if (table === 'voice_insights') {
          return insertQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(MOCK_BRAND_ID, validBody)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    const response = await POST(request, { params })
    expect(response.status).toBe(200)
    const body = await response.json()
    
    expect(body.insight).toEqual(mockInsight)
    expect(body.message).toBe('Voice insight created successfully')
  })

  it('should extract IP address from x-forwarded-for header', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID, email: 'test@example.com' } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_TENANT_ID }, error: null })
    
    let capturedData: Record<string, unknown> | undefined
    const insertQuery = createThenableMock()
    insertQuery.insert = vi.fn((data: Record<string, unknown>) => {
      capturedData = data
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'insight-1' }, error: null }),
        })),
      }
    })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        if (table === 'voice_insights') {
          return insertQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = new NextRequest(
      new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights`),
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
        body: JSON.stringify(validBody),
      }
    )
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    await POST(request, { params })

    expect(capturedData!.ip_address).toBe('192.168.1.1')
  })

  it('should extract IP address from x-real-ip header', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID, email: 'test@example.com' } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_TENANT_ID }, error: null })
    
    let capturedData: Record<string, unknown> | undefined
    const insertQuery = createThenableMock()
    insertQuery.insert = vi.fn((data: Record<string, unknown>) => {
      capturedData = data
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'insight-1' }, error: null }),
        })),
      }
    })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        if (table === 'voice_insights') {
          return insertQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = new NextRequest(
      new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights`),
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-real-ip': '10.0.0.2',
        },
        body: JSON.stringify(validBody),
      }
    )
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    await POST(request, { params })

    expect(capturedData!.ip_address).toBe('10.0.0.2')
  })

  it('should extract geolocation from Vercel headers', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID, email: 'test@example.com' } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_TENANT_ID }, error: null })
    
    let capturedData: Record<string, unknown> | undefined
    const insertQuery = createThenableMock()
    insertQuery.insert = vi.fn((data: Record<string, unknown>) => {
      capturedData = data
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'insight-1' }, error: null }),
        })),
      }
    })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        if (table === 'voice_insights') {
          return insertQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = new NextRequest(
      new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights`),
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-vercel-ip-city': 'New York',
          'x-vercel-ip-country-region': 'NY',
          'x-vercel-ip-country': 'US',
          'x-vercel-ip-timezone': 'America/New_York',
          'x-vercel-ip-latitude': '40.7128',
          'x-vercel-ip-longitude': '-74.0060',
        },
        body: JSON.stringify(validBody),
      }
    )
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    await POST(request, { params })

    expect(capturedData!.geolocation).toEqual({
      city: 'New York',
      region: 'NY',
      country: 'US',
      timezone: 'America/New_York',
      lat: 40.7128,
      lng: -74.006,
    })
  })

  it('should set geolocation to null when no headers present', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID, email: 'test@example.com' } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_TENANT_ID }, error: null })
    
    let capturedData: Record<string, unknown> | undefined
    const insertQuery = createThenableMock()
    insertQuery.insert = vi.fn((data: Record<string, unknown>) => {
      capturedData = data
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'insight-1' }, error: null }),
        })),
      }
    })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        if (table === 'voice_insights') {
          return insertQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(MOCK_BRAND_ID, validBody)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    await POST(request, { params })

    expect(capturedData!.geolocation).toBeNull()
  })

  it('should use user email when recorded_by_email not provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID, email: 'user@example.com' } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_TENANT_ID }, error: null })
    
    let capturedData: Record<string, unknown> | undefined
    const insertQuery = createThenableMock()
    insertQuery.insert = vi.fn((data: Record<string, unknown>) => {
      capturedData = data
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'insight-1' }, error: null }),
        })),
      }
    })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        if (table === 'voice_insights') {
          return insertQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(MOCK_BRAND_ID, validBody) // No recorded_by_email
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    await POST(request, { params })

    expect(capturedData!.recorded_by_email).toBe('user@example.com')
  })

  it('should return 500 on database error during insert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_TENANT_ID }, error: null })
    
    const insertQuery = createThenableMock()
    insertQuery.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert error' } }),
      })),
    }))
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        if (table === 'voice_insights') {
          return insertQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(MOCK_BRAND_ID, validBody)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    const response = await POST(request, { params })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to create insight')
  })

  it('should handle malformed JSON body', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    const request = new NextRequest(
      new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights`),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      }
    )
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    const response = await POST(request, { params })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Missing or invalid fields for voice insight')
  })

  it('should initialize cited_in_memos as empty array', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID, email: 'test@example.com' } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_TENANT_ID }, error: null })
    
    let capturedData: Record<string, unknown> | undefined
    const insertQuery = createThenableMock()
    insertQuery.insert = vi.fn((data: Record<string, unknown>) => {
      capturedData = data
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'insight-1' }, error: null }),
        })),
      }
    })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        if (table === 'voice_insights') {
          return insertQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(MOCK_BRAND_ID, validBody)
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    await POST(request, { params })

    expect(capturedData!.cited_in_memos).toEqual([])
    expect(capturedData!.citation_count).toBe(0)
  })

  it('should set default status to active when not provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID, email: 'test@example.com' } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_TENANT_ID }, error: null })
    
    let capturedData: Record<string, unknown> | undefined
    const insertQuery = createThenableMock()
    insertQuery.insert = vi.fn((data: Record<string, unknown>) => {
      capturedData = data
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'insight-1' }, error: null }),
        })),
      }
    })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        if (table === 'voice_insights') {
          return insertQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(MOCK_BRAND_ID, validBody) // No status provided
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    await POST(request, { params })

    expect(capturedData!.status).toBe('active')
  })

  it('should set default tags to empty array when not provided', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID, email: 'test@example.com' } } })
    
    const brandQuery = createThenableMock()
    brandQuery._setSingleValue({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_TENANT_ID }, error: null })
    
    let capturedData: Record<string, unknown> | undefined
    const insertQuery = createThenableMock()
    insertQuery.insert = vi.fn((data: Record<string, unknown>) => {
      capturedData = data
      return {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'insight-1' }, error: null }),
        })),
      }
    })
    
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: () => mockGetUser() },
      from: vi.fn((table: string) => {
        if (table === 'brands') {
          return brandQuery.single()
        }
        if (table === 'voice_insights') {
          return insertQuery
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = makeRequest(MOCK_BRAND_ID, validBody) // No tags provided
    const params = Promise.resolve({ brandId: MOCK_BRAND_ID })
    
    await POST(request, { params })

    expect(capturedData!.tags).toEqual([])
  })
})
