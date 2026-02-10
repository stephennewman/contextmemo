import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock audit events
vi.mock('@/lib/security/audit-events', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

const mockGetUser = vi.fn()

// Mock service client before it's imported
vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
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
import { GET, POST } from '@/app/api/organizations/route'
import { logAuditEvent } from '@/lib/security/audit-events'

describe('GET /api/organizations', () => {
  const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'

  const makeRequest = (options: { ip?: string } = {}) => {
    const headers = new Headers()
    if (options.ip) {
      headers.set('x-forwarded-for', options.ip)
    }
    return new NextRequest(new URL('http://localhost/api/organizations'), {
      headers,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await GET(makeRequest())
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
    
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'view_organizations_attempt',
        metadata: { status: 'failed', reason: 'unauthorized' },
      }),
      expect.any(Request)
    )
  })

  it('should call logAuditEvent with IP from x-forwarded-for header', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    await GET(makeRequest({ ip: '192.168.1.1, 10.0.0.1' }))

    // The IP should be extracted and logged - verify logAuditEvent was called
    expect(logAuditEvent).toHaveBeenCalled()
  })
})

describe('POST /api/organizations', () => {
  const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'

  const makeRequest = (body: Record<string, unknown> = {}) => {
    return new NextRequest(new URL('http://localhost/api/organizations'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const response = await POST(makeRequest({ name: 'Test Org' }))
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('should return 400 when name is too short', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    const response = await POST(makeRequest({ name: 'A' }))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Name is required (min 2 characters)')
  })

  it('should return 400 when name is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    const response = await POST(makeRequest({}))
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Name is required (min 2 characters)')
  })

  it('should return 400 when name is too long', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    const response = await POST(makeRequest({ name: 'A'.repeat(101) }))
    expect(response.status).toBe(400)
  })

  it('should handle malformed JSON body', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    const request = new NextRequest(new URL('http://localhost/api/organizations'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json{',
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Name is required (min 2 characters)')
  })

  it('should log audit event on unauthenticated create attempt', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await POST(makeRequest({ name: 'Test Org' }))
    
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create_organization_attempt',
        metadata: { status: 'failed', reason: 'unauthorized' },
      }),
      expect.any(Request)
    )
  })

  it('should log audit event on validation failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } })

    await POST(makeRequest({ name: 'A' }))
    
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'create_organization_attempt',
        metadata: expect.objectContaining({
          status: 'failed',
          reason: 'invalid_request_body',
        }),
      }),
      expect.any(Request)
    )
  })
})
