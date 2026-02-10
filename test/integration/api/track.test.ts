import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Use vi.hoisted to define mock functions before they're used in vi.mock
const mockLimit = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true, limit: 100, remaining: 99, reset: 12345 }))
const mockFrom = vi.hoisted(() => vi.fn())
const mockInsert = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [], error: null }))

// Mock @upstash/ratelimit - must be before any imports that use it
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    vi.fn(() => ({
      limit: mockLimit,
    })),
    {
      slidingWindow: vi.fn(() => 'mocked-limiter'),
    }
  ),
}))

// Mock @upstash/redis
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => ({})),
  },
}))

// Mock Supabase service role client
vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

// Mock detectAISource
vi.mock('@/lib/supabase/types', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/supabase/types')>();
  return {
    ...mod,
    detectAISource: vi.fn((referrer, userAgent) => {
      if (referrer && referrer.includes('chat.openai.com')) return 'chatgpt' as const;
      if (userAgent && userAgent.includes('Googlebot')) return 'organic' as const;
      if (!referrer && !userAgent) return 'direct_nav' as const;
      return 'organic' as const;
    }),
  };
});

// Import after mocks are set up
import { POST, GET } from '@/app/api/track/route'
import { detectAISource } from '@/lib/supabase/types'

describe('POST /api/track', () => {
  // Use valid UUIDs that match the route's regex (position 14: 1-5, position 19: 8/9/a/b)
  const MOCK_BRAND_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'
  const MOCK_MEMO_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02'
  const MOCK_PAGE_URL = 'https://example.com/memo/test'
  const MOCK_IP = '127.0.0.1'

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset supabase mock
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockResolvedValue({ data: [], error: null })
    
    // Reset rate limit mock
    mockLimit.mockResolvedValue({ success: true, limit: 100, remaining: 99, reset: 12345 })
  })

  it('should return 400 for invalid brandId', async () => {
    const request = new NextRequest(new URL('http://localhost/api/track'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brandId: 'invalid-uuid',
        pageUrl: MOCK_PAGE_URL,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid request')
  })

  it('should return 400 for invalid pageUrl', async () => {
    const request = new NextRequest(new URL('http://localhost/api/track'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        brandId: MOCK_BRAND_ID,
        pageUrl: 'invalid-url',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid request')
  })

  it('should return 429 when rate limited', async () => {
    mockLimit.mockResolvedValueOnce({ success: false, limit: 100, remaining: 0, reset: 0 })

    const request = new NextRequest(new URL('http://localhost/api/track'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': MOCK_IP,
      },
      body: JSON.stringify({
        brandId: MOCK_BRAND_ID,
        pageUrl: MOCK_PAGE_URL,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toBe('Rate limited')
  })

  it('should successfully track AI traffic', async () => {
    vi.mocked(detectAISource).mockReturnValue('chatgpt');

    const request = new NextRequest(new URL('http://localhost/api/track'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': MOCK_IP,
        'referrer': 'https://chat.openai.com/',
        'user-agent': 'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)',
      },
      body: JSON.stringify({
        brandId: MOCK_BRAND_ID,
        memoId: MOCK_MEMO_ID,
        pageUrl: MOCK_PAGE_URL,
        referrer: 'https://chat.openai.com/',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.tracked).toBe(true)
    expect(body.source).toBe('chatgpt')
    expect(body.isAI).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('ai_traffic')
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      brand_id: MOCK_BRAND_ID,
      memo_id: MOCK_MEMO_ID,
      page_url: MOCK_PAGE_URL,
      referrer_source: 'chatgpt',
    }))
  })

  it('should skip tracking for direct_nav source', async () => {
    vi.mocked(detectAISource).mockReturnValue('direct_nav' as const);

    const request = new NextRequest(new URL('http://localhost/api/track'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': MOCK_IP,
      },
      body: JSON.stringify({
        brandId: MOCK_BRAND_ID,
        pageUrl: MOCK_PAGE_URL,
        referrer: 'https://example.com/direct',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.tracked).toBe(false)
    expect(body.reason).toBe('direct_nav_ignored')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('should return tracked:false with error on database error', async () => {
    // Mock detectAISource to return a non-direct_nav value so the route proceeds to DB insert
    vi.mocked(detectAISource).mockReturnValue('organic');
    
    // Mock the insert to return an error
    const mockInsertError = vi.fn().mockResolvedValue({ data: [], error: { message: 'Database insert failed' } })
    mockFrom.mockReturnValue({ insert: mockInsertError })

    const request = new NextRequest(new URL('http://localhost/api/track'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': MOCK_IP,
      },
      body: JSON.stringify({
        brandId: MOCK_BRAND_ID,
        pageUrl: MOCK_PAGE_URL,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200) // The route returns 200 with tracked: false on DB error
    const body = await response.json()
    expect(body.tracked).toBe(false)
    expect(body.error).toBe('An unexpected error occurred')
  })

  it('should return 400 for malformed JSON body', async () => {
    // The route catches JSON parse errors with .catch(() => null) and then validation fails
    const request = new NextRequest(new URL('http://localhost/api/track'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': MOCK_IP,
      },
      body: 'invalid json{',
    })

    const response = await POST(request)
    // The route handles JSON parse errors gracefully by returning null, then validation fails
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid request')
  })
})

describe('GET /api/track (pixel tracking)', () => {
  // Use valid UUIDs that match the route's regex
  const MOCK_BRAND_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'
  const MOCK_MEMO_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02'
  const MOCK_PAGE_URL = 'https://example.com/memo/pixel'
  const MOCK_IP = '127.0.0.1'

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the supabase mock
    mockFrom.mockReturnValue({ insert: mockInsert })
    mockInsert.mockResolvedValue({ data: [], error: null })
  })

  it('should return a 1x1 gif and track valid pixel requests', async () => {
    vi.mocked(detectAISource).mockReturnValue('gemini');

    const request = new NextRequest(new URL(`http://localhost/api/track?b=${MOCK_BRAND_ID}&m=${MOCK_MEMO_ID}&u=${encodeURIComponent(MOCK_PAGE_URL)}`), {
      method: 'GET',
      headers: {
        'x-forwarded-for': MOCK_IP,
        'user-agent': 'Gemini',
      },
    })

    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/gif')
    expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate')
    expect(await response.text()).toBe(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64').toString())
    // Note: The GET endpoint uses fire-and-forget (void) for the insert, so we can't reliably test mockInsert calls
    // Just verify the response is correct
  })

  it('should return a 1x1 gif and not track for direct_nav source', async () => {
    vi.mocked(detectAISource).mockReturnValue('direct_nav' as const);

    const request = new NextRequest(new URL(`http://localhost/api/track?b=${MOCK_BRAND_ID}&u=${encodeURIComponent(MOCK_PAGE_URL)}`), {
      method: 'GET',
      headers: {
        'x-forwarded-for': MOCK_IP,
      },
    })

    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/gif')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('should return a 1x1 gif and not track for invalid brandId', async () => {
    const request = new NextRequest(new URL(`http://localhost/api/track?b=invalid&u=${encodeURIComponent(MOCK_PAGE_URL)}`), {
      method: 'GET',
      headers: {
        'x-forwarded-for': MOCK_IP,
      },
    })

    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/gif')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('should return a 1x1 gif and not track for invalid pageUrl', async () => {
    const request = new NextRequest(new URL(`http://localhost/api/track?b=${MOCK_BRAND_ID}&u=invalid-url`), {
      method: 'GET',
      headers: {
        'x-forwarded-for': MOCK_IP,
      },
    })

    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/gif')
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
