import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/brands/[brandId]/actions/route'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'
import { validateCSRFToken } from '@/lib/security/csrf'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock Inngest client
vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: vi.fn(),
  },
}))

// Mock CSRF
vi.mock('@/lib/security/csrf', () => ({
  validateCSRFToken: vi.fn().mockResolvedValue(true),
  getCSRFHeaderName: vi.fn().mockReturnValue('x-csrf-token'),
}))

describe('POST /api/brands/[brandId]/actions', () => {
  // Use valid UUIDs that match the route's regex (position 14: 1-5, position 19: 8/9/a/b)
  const MOCK_BRAND_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'
  const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a0a'
  const MOCK_DOMAIN = 'example.com'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabaseMock: any
  let inngestSendMock: ReturnType<typeof vi.mocked<typeof inngest.send>>
  let validateCSRFTokenMock: ReturnType<typeof vi.mocked<typeof validateCSRFToken>>

  beforeEach(() => {
    vi.clearAllMocks()

    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } }),
      },
      from: vi.fn(() => supabaseMock),
      select: vi.fn(() => supabaseMock),
      eq: vi.fn(() => supabaseMock),
      single: vi.fn(),
      delete: vi.fn(() => supabaseMock),
    }
    vi.mocked(createClient).mockResolvedValue(supabaseMock)
    
    inngestSendMock = vi.mocked(inngest.send)
    validateCSRFTokenMock = vi.mocked(validateCSRFToken)

    // Reset CSRF mock to return true by default
    validateCSRFTokenMock.mockResolvedValue(true)

    // Default mocks for brand and memo existence
    supabaseMock.single.mockImplementation(() => {
      return Promise.resolve({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_USER_ID, domain: MOCK_DOMAIN }, error: null })
    })
  })

  const makeRequest = (action: string, brandId = MOCK_BRAND_ID, body: Record<string, unknown> = {}, headers: Record<string, string> = { 'x-csrf-token': 'valid-token' }) => {
    return new NextRequest(new URL(`http://localhost/api/brands/${brandId}/actions`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ action, ...body }),
    })
  }

  it('should return 401 if unauthenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })
    const request = makeRequest('extract_context')
    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 403 if CSRF token is invalid', async () => {
    validateCSRFTokenMock.mockResolvedValue(false)
    const request = makeRequest('extract_context', MOCK_BRAND_ID, {}, { 'x-csrf-token': 'invalid-token' })
    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Invalid CSRF token')
  })

  it('should return 400 for invalid brandId format', async () => {
    const request = makeRequest('extract_context', 'invalid-uuid')
    const response = await POST(request, { params: Promise.resolve({ brandId: 'invalid-uuid' }) })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid brandId format')
  })

  it('should return 404 if brand not found', async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: null, error: null }) // for brand check

    const request = makeRequest('extract_context')
    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Brand not found')
  })

  it('should return 400 for invalid action', async () => {
    const request = makeRequest('unknown_action')
    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Unknown action')
  })

  it('should trigger context/extract for "extract_context" action', async () => {
    const request = makeRequest('extract_context')
    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toBe('Context extraction started')
    expect(inngestSendMock).toHaveBeenCalledWith({
      name: 'context/extract',
      data: { brandId: MOCK_BRAND_ID, domain: MOCK_DOMAIN },
    })
  })

  it('should trigger memo/generate for "generate_memo" action', async () => {
    const request = makeRequest('generate_memo', MOCK_BRAND_ID, { memoType: 'comparison', queryId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b23' })
    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toBe('Memo generation started')
    expect(inngestSendMock).toHaveBeenCalledWith({
      name: 'memo/generate',
      data: { brandId: MOCK_BRAND_ID, queryId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b23', memoType: 'comparison' },
    })
  })

  it('should return 400 if memoType is missing for "generate_memo"', async () => {
    const request = makeRequest('generate_memo', MOCK_BRAND_ID, { queryId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b23' })
    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('memoType required')
  })

  it('should handle "regenerate_memo" action correctly', async () => {
    // Mock for existing memo fetch
    supabaseMock.single
      .mockResolvedValueOnce({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_USER_ID, domain: MOCK_DOMAIN }, error: null }) // for brand check
      .mockResolvedValueOnce({ data: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380c23', slug: 'test-memo', memo_type: 'comparison', source_query_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380d45' }, error: null }) // for memo fetch

    const request = makeRequest('regenerate_memo', MOCK_BRAND_ID, { memoId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380c23' })
    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toBe('Memo regeneration started. The page will update when complete.')
    expect(supabaseMock.delete).toHaveBeenCalledWith()
    expect(supabaseMock.eq).toHaveBeenCalledWith('id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380c23')
    expect(inngestSendMock).toHaveBeenCalledWith({
      name: 'memo/generate',
      data: { brandId: MOCK_BRAND_ID, queryId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380d45', memoType: 'comparison' },
    })
  })

  it('should return 500 with generic error on unexpected internal error', async () => {
    inngestSendMock.mockRejectedValueOnce(new Error('Inngest error'))
    const request = makeRequest('extract_context')
    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Action failed')
  })
})
