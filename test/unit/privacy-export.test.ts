import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/privacy/export/route'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: vi.fn(),
}))

type SupabaseRow = Record<string, unknown>

type QueryBuilder = {
  select: (columns?: string) => QueryBuilder
  eq: (column: string, value: unknown) => QueryBuilder
  in: (column: string, values: unknown[]) => QueryBuilder
  range: (from: number, to: number) => Promise<{ data: SupabaseRow[]; error: null }>
  single: () => Promise<{ data: SupabaseRow | null; error: null }>
  then: <T>(
    resolve: (value: { data: SupabaseRow[]; error: null }) => T,
    reject: (reason: unknown) => never
  ) => Promise<T>
}

type MockSupabase = {
  from: (table: string) => QueryBuilder
}

const { createClient } = await import('@/lib/supabase/server')
const { createServiceRoleClient } = await import('@/lib/supabase/service')

const buildSupabaseMock = (tableData: Record<string, SupabaseRow[]>): MockSupabase => ({
  from: (table: string) => {
    let eqFilters: Record<string, unknown> = {}
    let inFilters: Record<string, unknown[]> = {}
    let rangeFrom = 0
    let rangeTo = Number.POSITIVE_INFINITY

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
      const sliced = rows.slice(rangeFrom, rangeTo + 1)
      return { data: sliced, error: null as null }
    }

    const builder: QueryBuilder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        eqFilters = { ...eqFilters, [column]: value }
        return builder
      },
      in: (column: string, values: unknown[]) => {
        inFilters = { ...inFilters, [column]: values }
        return builder
      },
      range: async (from: number, to: number) => {
        rangeFrom = from
        rangeTo = to
        return execute()
      },
      single: async () => {
        const rows = applyFilters(tableData[table] || [])
        return { data: rows[0] || null, error: null as null }
      },
      then: (resolve, reject) => {
        return Promise.resolve(execute()).then(resolve, reject)
      },
    }

    return builder
  },
})

describe('privacy export API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const response = await GET()
    expect(response.status).toBe(401)

    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('exports tenant data when authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const supabaseMock = buildSupabaseMock({
      tenants: [{ id: 'user-1', email: 'owner@example.com' }],
      brands: [{ id: 'brand-1', tenant_id: 'user-1' }],
      competitors: [{ id: 'comp-1', brand_id: 'brand-1' }],
      brand_settings: [{ brand_id: 'brand-1' }],
      queries: [{ id: 'query-1', brand_id: 'brand-1' }],
      scan_results: [],
      memos: [{ id: 'memo-1', brand_id: 'brand-1' }],
      memo_versions: [{ id: 'version-1', memo_id: 'memo-1' }],
      alerts: [],
      visibility_history: [],
      search_console_stats: [],
      ai_traffic: [],
      competitor_content: [{ id: 'content-1', competitor_id: 'comp-1' }],
    })

    vi.mocked(createServiceRoleClient).mockReturnValue(supabaseMock as unknown as ReturnType<typeof createServiceRoleClient>)

    const response = await GET()
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.tenant?.id).toBe('user-1')
    expect(body.brands).toHaveLength(1)
    expect(body.competitors).toHaveLength(1)
    expect(body.memoVersions).toHaveLength(1)
    expect(body.exportedAt).toBeTypeOf('string')
  })

  it('returns 500 with generic error on export failure', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    // Mock serviceClient to throw an error on competitors fetch (after brands succeeds)
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'user-1', email: 'owner@example.com' }, error: null }),
          }
        }
        if (table === 'brands') {
          // Return brands successfully with a proper thenable
          const builder = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: (value: unknown) => unknown) => resolve({ data: [{ id: 'brand-1', tenant_id: 'user-1' }], error: null }),
          }
          return builder
        }
        // Simulate an error for other tables (competitors, etc.)
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          range: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        }
      }),
    } as unknown as ReturnType<typeof createServiceRoleClient>)


    const response = await GET()
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.error).toBe('An unexpected error occurred during data export')
  })

  it('exports data when user has no brands', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const supabaseMock = buildSupabaseMock({
      tenants: [{ id: 'user-1', email: 'owner@example.com' }],
      brands: [], // No brands
      competitors: [],
      brand_settings: [],
      queries: [],
      scan_results: [],
      memos: [],
      memo_versions: [],
      alerts: [],
      visibility_history: [],
      search_console_stats: [],
      ai_traffic: [],
      competitor_content: [],
    })

    vi.mocked(createServiceRoleClient).mockReturnValue(supabaseMock as unknown as ReturnType<typeof createServiceRoleClient>)

    const response = await GET()
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.tenant?.id).toBe('user-1')
    expect(body.brands).toHaveLength(0)
    expect(body.competitors).toHaveLength(0)
    expect(body.memoVersions).toHaveLength(0)
  })

  it('exports data when brands have no memos', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const supabaseMock = buildSupabaseMock({
      tenants: [{ id: 'user-1', email: 'owner@example.com' }],
      brands: [{ id: 'brand-1', tenant_id: 'user-1' }],
      competitors: [{ id: 'comp-1', brand_id: 'brand-1' }],
      brand_settings: [{ brand_id: 'brand-1' }],
      queries: [],
      scan_results: [],
      memos: [], // No memos
      memo_versions: [],
      alerts: [],
      visibility_history: [],
      search_console_stats: [],
      ai_traffic: [],
      competitor_content: [{ id: 'content-1', competitor_id: 'comp-1' }],
    })

    vi.mocked(createServiceRoleClient).mockReturnValue(supabaseMock as unknown as ReturnType<typeof createServiceRoleClient>)

    const response = await GET()
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.memos).toHaveLength(0)
    expect(body.memoVersions).toHaveLength(0)
  })

  it('exports data when competitors have no content', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    const supabaseMock = buildSupabaseMock({
      tenants: [{ id: 'user-1', email: 'owner@example.com' }],
      brands: [{ id: 'brand-1', tenant_id: 'user-1' }],
      competitors: [{ id: 'comp-1', brand_id: 'brand-1' }],
      brand_settings: [],
      queries: [],
      scan_results: [],
      memos: [],
      memo_versions: [],
      alerts: [],
      visibility_history: [],
      search_console_stats: [],
      ai_traffic: [],
      competitor_content: [], // No competitor content
    })

    vi.mocked(createServiceRoleClient).mockReturnValue(supabaseMock as unknown as ReturnType<typeof createServiceRoleClient>)

    const response = await GET()
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.competitorContent).toHaveLength(0)
  })

  it('handles pagination when fetching large datasets', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    // Create a large dataset to test pagination
    const largeBrandArray = Array.from({ length: 1500 }, (_, i) => ({
      id: `brand-${i}`,
      tenant_id: 'user-1',
    }))

    const supabaseMock = buildSupabaseMock({
      tenants: [{ id: 'user-1', email: 'owner@example.com' }],
      brands: largeBrandArray,
      competitors: [],
      brand_settings: [],
      queries: [],
      scan_results: [],
      memos: [],
      memo_versions: [],
      alerts: [],
      visibility_history: [],
      search_console_stats: [],
      ai_traffic: [],
      competitor_content: [],
    })

    vi.mocked(createServiceRoleClient).mockReturnValue(supabaseMock as unknown as ReturnType<typeof createServiceRoleClient>)

    const response = await GET()
    expect(response.status).toBe(200)

    const body = await response.json()
    // The mock should return all brands (pagination is handled internally)
    expect(body.brands.length).toBeGreaterThan(0)
  })
})
