import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/privacy/delete/route'
import { logAuditEvent } from '@/lib/security/audit-events'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock('@/lib/security/audit-events', () => ({
  logAuditEvent: vi.fn(),
}))

const { createClient } = await import('@/lib/supabase/server')
const { createServiceRoleClient } = await import('@/lib/supabase/service')

type SupabaseRow = Record<string, unknown>

type MockSupabaseBuilder = {
  select: () => MockSupabaseBuilder
  eq: (column: string, value: unknown) => MockSupabaseBuilder
  in: (column: string, values: unknown[]) => MockSupabaseBuilder
  delete: () => MockSupabaseBuilder
  then: (resolve: (value: { data: SupabaseRow[], error: null }) => void, reject: (reason: unknown) => void) => Promise<void>
}

type MockSupabase = {
  from: (table: string) => MockSupabaseBuilder
  auth: {
    admin: {
      deleteUser: (userId: string) => Promise<{ error: null } | { error: { message: string } }>
    }
  }
  getDeletes: () => Array<{ table: string; eqFilters: Record<string, unknown>; inFilters: Record<string, unknown[]> }>
}

const buildSupabaseMock = (tableData: Record<string, SupabaseRow[]>): MockSupabase => {
  const deletes: Array<{ table: string; eqFilters: Record<string, unknown>; inFilters: Record<string, unknown[]> }> = []

  return {
    auth: {
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
    from: (table: string) => {
      let eqFilters: Record<string, unknown> = {}
      let inFilters: Record<string, unknown[]> = {}
      let isDelete = false

      const applyFilters = (rows: SupabaseRow[]) => rows.filter(row => {
        for (const [key, value] of Object.entries(eqFilters)) {
          if (row[key] !== value) return false
        }
        for (const [key, values] of Object.entries(inFilters)) {
          if (!values.includes(row[key])) return false
        }
        return true
      })

      const execute = () => {
        const rows = applyFilters(tableData[table] || [])
        return { data: rows, error: null as null }
      }

      const builder: MockSupabaseBuilder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          eqFilters = { ...eqFilters, [column]: value }
          return builder
        },
        in: (column: string, values: unknown[]) => {
          inFilters = { ...inFilters, [column]: values }
          return builder
        },
        delete: () => {
          isDelete = true
          return builder
        },
        then: (resolve: (value: { data: SupabaseRow[], error: null }) => void, reject: (reason: unknown) => void) => {
          if (isDelete) {
            deletes.push({
              table,
              eqFilters: { ...eqFilters },
              inFilters: { ...inFilters },
            })
          }
          return Promise.resolve(execute()).then(resolve, reject)
        },
      }

      return builder
    },
    getDeletes: () => deletes,
  }
}

describe('privacy delete API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = new Request('http://localhost/api/privacy/delete', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    }) as NextRequest

    const response = await POST(request)
    expect(response.status).toBe(401)

    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('deletes tenant data when confirmed', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const supabaseMock = buildSupabaseMock({
      brands: [{ id: 'brand-1', tenant_id: 'user-1' }],
      competitors: [{ id: 'comp-1', brand_id: 'brand-1' }],
      memos: [{ id: 'memo-1', brand_id: 'brand-1' }],
    })

    vi.mocked(createServiceRoleClient).mockReturnValue(supabaseMock as unknown as ReturnType<typeof createServiceRoleClient>)

    const request = new Request('http://localhost/api/privacy/delete', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    }) as NextRequest

    const response = await POST(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)

    // Verify all expected tables are deleted from
    const deletes = supabaseMock.getDeletes()
    const deletedTables = deletes.map(d => d.table)
    
    // Debug: Log all deletes to understand what's happening
    console.log('Deletes captured:', deletes)
    
    expect(deletedTables).toEqual(
      expect.arrayContaining([
        'memo_versions',
        'competitor_content',
        'competitor_feeds',
        'ai_traffic',
        'search_console_stats',
        'visibility_history',
        'alerts',
        'scan_results',
        'queries',
        'memos',
        'brand_settings',
        'competitors',
        'brands',
        'tenants'
      ])
    )
    
    // Verify tenants table is deleted with correct user id
    expect(deletes.some(d => 
      d.table === 'tenants' && 
      Object.keys(d.eqFilters).length === 1 && 
      d.eqFilters.id === 'user-1'
    )).toBe(true)

    // Verify brands table is deleted with correct id
    expect(deletes.some(d => 
      d.table === 'brands' && 
      Object.keys(d.inFilters).length === 1 && 
      Array.isArray(d.inFilters.id) && 
      d.inFilters.id.includes('brand-1')
    )).toBe(true)

    expect(supabaseMock.auth.admin.deleteUser).toHaveBeenCalledWith('user-1')
  })

  it('returns 500 with generic error on auth user deletion failure and logs audit event', async () => {
    const userId = 'user-1'
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const supabaseMock = buildSupabaseMock({
      brands: [{ id: 'brand-1', tenant_id: userId }],
      competitors: [{ id: 'comp-1', brand_id: 'brand-1' }],
      memos: [{ id: 'memo-1', brand_id: 'brand-1' }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(supabaseMock as unknown as ReturnType<typeof createServiceRoleClient>)

    // Mock admin.deleteUser to throw an error
    vi.mocked(supabaseMock.auth.admin).deleteUser.mockResolvedValueOnce({ error: { message: 'Supabase auth delete error' } })

    const request = new Request('http://localhost/api/privacy/delete', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    }) as NextRequest

    const response = await POST(request)
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.error).toBe('An unexpected error occurred during account deletion')
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'delete_account_attempt',
        userId: userId,
        resourceType: 'user',
        resourceId: userId,
        metadata: { status: 'failed', reason: 'auth_delete_error', errorMessage: 'Supabase auth delete error' },
      }),
      expect.any(Request)
    )
  })

  it('returns 500 with generic error on general internal failure and logs audit event', async () => {
    const userId = 'user-1'
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    // Simulate an error during data fetching by throwing from the mock
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation(() => {
        throw new Error('Database connection error')
      }),
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    } as unknown as ReturnType<typeof createServiceRoleClient>)

    const request = new Request('http://localhost/api/privacy/delete', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    }) as NextRequest

    const response = await POST(request)
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.error).toBe('An unexpected error occurred during data deletion')
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'delete_account_attempt',
        userId: userId,
        metadata: { status: 'failed', reason: 'internal_server_error', errorMessage: 'Database connection error' },
      }),
      expect.any(Request)
    )
  })

  it('returns 400 when confirm is not true', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = new Request('http://localhost/api/privacy/delete', {
      method: 'POST',
      body: JSON.stringify({ confirm: false }),
    }) as NextRequest

    const response = await POST(request)
    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.error).toBe('Confirmation required')
  })

  it('returns 400 when confirm is missing', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const request = new Request('http://localhost/api/privacy/delete', {
      method: 'POST',
      body: JSON.stringify({}),
    }) as NextRequest

    const response = await POST(request)
    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.error).toBe('Confirmation required')
  })

  it('handles deletion when user has no brands', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const supabaseMock = buildSupabaseMock({
      brands: [], // No brands
      competitors: [],
      memos: [],
    })

    vi.mocked(createServiceRoleClient).mockReturnValue(supabaseMock as unknown as ReturnType<typeof createServiceRoleClient>)

    const request = new Request('http://localhost/api/privacy/delete', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    }) as NextRequest

    const response = await POST(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)

    // Verify tenant was still deleted
    const deletes = supabaseMock.getDeletes()
    expect(deletes.some(d => d.table === 'tenants')).toBe(true)
  })

  it('handles deletion when brands have no competitors', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const supabaseMock = buildSupabaseMock({
      brands: [{ id: 'brand-1', tenant_id: 'user-1' }],
      competitors: [], // No competitors
      memos: [{ id: 'memo-1', brand_id: 'brand-1' }],
    })

    vi.mocked(createServiceRoleClient).mockReturnValue(supabaseMock as unknown as ReturnType<typeof createServiceRoleClient>)

    const request = new Request('http://localhost/api/privacy/delete', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    }) as NextRequest

    const response = await POST(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it('handles deletion when brands have no memos', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const supabaseMock = buildSupabaseMock({
      brands: [{ id: 'brand-1', tenant_id: 'user-1' }],
      competitors: [{ id: 'comp-1', brand_id: 'brand-1' }],
      memos: [], // No memos
    })

    vi.mocked(createServiceRoleClient).mockReturnValue(supabaseMock as unknown as ReturnType<typeof createServiceRoleClient>)

    const request = new Request('http://localhost/api/privacy/delete', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    }) as NextRequest

    const response = await POST(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
  })
})
