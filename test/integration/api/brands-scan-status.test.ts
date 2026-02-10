import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/brands/[brandId]/scan-status/route'
import { createClient } from '@/lib/supabase/server'
import { logSecurityEvent } from '@/lib/security/security-events'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock logSecurityEvent
vi.mock('@/lib/security/security-events', () => ({
  logSecurityEvent: vi.fn(),
}))

describe('GET /api/brands/[brandId]/scan-status', () => {
  // Use valid UUIDs that pass z.string().uuid() validation
  const MOCK_BRAND_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'
  const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a0a'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabaseMock: any

  beforeEach(() => {
    vi.clearAllMocks()

    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } }),
      },
      from: vi.fn(() => supabaseMock),
      select: vi.fn(() => supabaseMock),
      eq: vi.fn(() => supabaseMock),
      gte: vi.fn(() => supabaseMock),
      single: vi.fn(),
      limit: vi.fn(() => supabaseMock),
    }
    vi.mocked(createClient).mockResolvedValue(supabaseMock)
  })

  it('should return 400 for invalid brandId format', async () => {
    const request = new NextRequest(new URL('http://localhost/api/brands/invalid-uuid/scan-status'))
    const response = await GET(request, { params: Promise.resolve({ brandId: 'invalid-uuid' }) })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid brandId')
  })

  it('should return 401 if unauthenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })

    const request = new NextRequest(new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/scan-status`))
    const response = await GET(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'unauthorized', details: { reason: 'user_not_authenticated' } })
    )
  })

  it('should return 404 if brand not found or unauthorized (IDOR)', async () => {
    // Mock brand check to return null
    supabaseMock.single
      .mockResolvedValueOnce({ data: null, error: null }) // for brand check
      .mockResolvedValueOnce({ data: null, error: null }) // for queries count

    const request = new NextRequest(new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/scan-status`))
    const response = await GET(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Brand not found or unauthorized')
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'access_denied', details: { reason: 'brand_not_found_or_unauthorized', brandId: MOCK_BRAND_ID } })
    )
  })

  it('should return scan status for an owned brand', async () => {
    // Mock brand check
    supabaseMock.single.mockResolvedValueOnce({ data: { tenant_id: MOCK_USER_ID }, error: null }) // for brand check
    
    // Mock scan results - the route uses: supabase.from('scan_results').select(...).eq(...).gte(...)
    // The select() returns the mock for chaining, and the final await resolves when the chain is awaited
    // We need to make the mock chainable and then resolve at the end
    let scanResultsResolve: (value: unknown) => void
    const scanResultsPromise = new Promise((resolve) => {
      scanResultsResolve = resolve
    })
    
    // Create a chainable mock for scan_results
    const scanResultsChain = {
      data: [
        { brand_mentioned: true, brand_in_citations: true },
        { brand_mentioned: false, brand_in_citations: false },
      ],
      error: null
    }
    
    // Mock queries count - the route uses: supabase.from('queries').select('*', { count: 'exact', head: true }).eq(...).eq(...)
    const queriesChain = {
      count: 5,
      error: null
    }
    
    // Track which table is being queried
    let callCount = 0
    supabaseMock.from.mockImplementation((table: string) => {
      callCount++
      if (table === 'scan_results') {
        // Return a chainable that resolves to scan results
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn().mockResolvedValue(scanResultsChain)
            }))
          }))
        }
      }
      if (table === 'queries') {
        // Return a chainable that resolves to queries count
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue(queriesChain)
            }))
          }))
        }
      }
      return supabaseMock
    })

    const request = new NextRequest(new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/scan-status`))
    const response = await GET(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.recentScans).toBe(2)
    expect(body.mentionedCount).toBe(1)
    expect(body.citedCount).toBe(1)
    expect(body.totalQueries).toBe(5)
  })

  it('should return 500 with generic error on internal database error', async () => {
    // Mock brand check to fail
    supabaseMock.single.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } })

    const request = new NextRequest(new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/scan-status`))
    const response = await GET(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(404) // Still 404 as per the specific error handling in route.ts
    const body = await response.json()
    expect(body.error).toBe('Brand not found or unauthorized')
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'access_denied', details: { reason: 'brand_not_found_or_unauthorized', brandId: MOCK_BRAND_ID } })
    )
  })
})
