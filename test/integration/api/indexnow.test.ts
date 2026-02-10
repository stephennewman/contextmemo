import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock IndexNow utilities
vi.mock('@/lib/utils/indexnow', () => ({
  submitUrlsToIndexNow: vi.fn(),
  buildMemoUrl: vi.fn((subdomain, slug) => `https://contextmemo.com/memo/${subdomain}/${slug}`),
}))

// Mock functions must be defined before the mock call
const mockGetUser = vi.fn()

// Mock service client before it's imported
vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => 
    Promise.resolve({
      auth: {
        getUser: () => mockGetUser(),
      },
    })
  ),
}))

// Import after mocks are set up
import { POST } from '@/app/api/indexnow/route'
import { submitUrlsToIndexNow } from '@/lib/utils/indexnow'

describe('POST /api/indexnow', () => {
  const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'
  const MOCK_BRAND_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03'

  const makeRequest = (body: Record<string, unknown> = {}) => {
    return new NextRequest(new URL('http://localhost/api/indexnow'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock for submitUrlsToIndexNow
    vi.mocked(submitUrlsToIndexNow).mockResolvedValue([
      { success: true, endpoint: 'https://api.indexnow.org/indexnow', status: 200 }
    ])
  })

  it('should return 400 for invalid brandId format', async () => {
    const request = makeRequest({ brandId: 'invalid-uuid' })
    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('brandId required')
  })

  it('should return 400 when brandId is missing', async () => {
    const request = makeRequest({})
    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('brandId required')
  })

  it('should return 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const request = makeRequest({ brandId: MOCK_BRAND_ID })
    const response = await POST(request)
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('should handle malformed JSON body', async () => {
    const request = new NextRequest(new URL('http://localhost/api/indexnow'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json{',
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('brandId required')
  })

  it('should return 500 on unexpected error', async () => {
    mockGetUser.mockRejectedValue(new Error('Unexpected error'))

    const request = makeRequest({ brandId: MOCK_BRAND_ID })
    const response = await POST(request)
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to submit to IndexNow')
  })
})
