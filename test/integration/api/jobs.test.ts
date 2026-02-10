import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/jobs/route'

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

describe('GET /api/jobs', () => {
  const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'
  const MOCK_TENANT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02'
  const MOCK_BRAND_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return empty jobs array when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await GET()
    const body = await response.json()
    
    expect(body.jobs).toEqual([])
    // hasActive is not included in this response
    expect(body.hasActive).toBeUndefined()
  })

  it('should return empty jobs array when tenant not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    // Create a custom mock for this test
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
    const body = await response.json()
    
    expect(body.jobs).toEqual([])
    // hasActive is not included in this response
    expect(body.hasActive).toBeUndefined()
  })

  it('should return empty jobs array when no brands found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: [], error: null })
    
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
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    const body = await response.json()
    
    expect(body.jobs).toEqual([])
    // hasActive is not included in this response
    expect(body.hasActive).toBeUndefined()
  })

  it('should return active jobs for authenticated user with brands', async () => {
    const mockJobs = [
      { id: 'job-1', brand_id: MOCK_BRAND_ID, job_type: 'scan', job_name: 'Test Job', started_at: new Date().toISOString(), metadata: {} },
    ]

    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: [{ id: MOCK_BRAND_ID }], error: null })
    
    const jobsMock = createThenableMock()
    jobsMock._resolveWith({ data: mockJobs, error: null })
    
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
        if (table === 'active_jobs') {
          return jobsMock
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    const body = await response.json()
    
    expect(body.jobs).toEqual(mockJobs)
    expect(body.hasActive).toBe(true)
  })

  it('should return hasActive false when no active jobs', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: [{ id: MOCK_BRAND_ID }], error: null })
    
    const jobsMock = createThenableMock()
    jobsMock._resolveWith({ data: [], error: null })
    
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
        if (table === 'active_jobs') {
          return jobsMock
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    const body = await response.json()
    
    expect(body.jobs).toEqual([])
    expect(body.hasActive).toBe(false)
  })

  it('should return hasActive false when active jobs is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: [{ id: MOCK_BRAND_ID }], error: null })
    
    const jobsMock = createThenableMock()
    jobsMock._resolveWith({ data: null, error: null })
    
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
        if (table === 'active_jobs') {
          return jobsMock
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    const body = await response.json()
    
    expect(body.jobs).toEqual([])
    expect(body.hasActive).toBe(false)
  })

  it('should query with correct date filter (10 minutes ago)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: [{ id: MOCK_BRAND_ID }], error: null })
    
    const jobsMock = createThenableMock()
    jobsMock._resolveWith({ data: [], error: null })
    
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
        if (table === 'active_jobs') {
          return jobsMock
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    await GET()

    // Verify gte was called with a date around 10 minutes ago
    expect(jobsMock.gte).toHaveBeenCalledWith('started_at', expect.any(String))
    const calledDate = new Date((jobsMock.gte as ReturnType<typeof vi.fn>).mock.calls[0][1])
    const expectedDate = new Date(Date.now() - 10 * 60 * 1000)
    // Allow 5 second tolerance
    expect(Math.abs(calledDate.getTime() - expectedDate.getTime())).toBeLessThan(5000)
  })

  it('should order jobs by started_at descending', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: [{ id: MOCK_BRAND_ID }], error: null })
    
    const jobsMock = createThenableMock()
    jobsMock._resolveWith({ data: [], error: null })
    
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
        if (table === 'active_jobs') {
          return jobsMock
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    await GET()

    expect(jobsMock.order).toHaveBeenCalledWith('started_at', { ascending: false })
  })

  it('should filter jobs by brand IDs', async () => {
    const brandIds = [MOCK_BRAND_ID, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04']
    
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: brandIds.map(id => ({ id })), error: null })
    
    const jobsMock = createThenableMock()
    jobsMock._resolveWith({ data: [], error: null })
    
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
        if (table === 'active_jobs') {
          return jobsMock
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    await GET()

    expect(jobsMock.in).toHaveBeenCalledWith('brand_id', brandIds)
  })

  it('should select correct fields from active_jobs', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    const tenantMock = createThenableMock()
    tenantMock._setSingleValue({ data: { id: MOCK_TENANT_ID }, error: null })
    
    const brandsMock = createThenableMock()
    brandsMock._resolveWith({ data: [{ id: MOCK_BRAND_ID }], error: null })
    
    const jobsMock = createThenableMock()
    jobsMock._resolveWith({ data: [], error: null })
    
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
        if (table === 'active_jobs') {
          return jobsMock
        }
        return createThenableMock()
      }),
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    await GET()

    expect(jobsMock.select).toHaveBeenCalledWith('id, brand_id, job_type, job_name, started_at, metadata')
  })
})
