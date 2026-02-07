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
})
