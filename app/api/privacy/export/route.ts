import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

const PAGE_SIZE = 1000

async function fetchAllByBrandIds<T>(supabase: ReturnType<typeof createServiceRoleClient>, table: string, brandIds: string[]): Promise<T[]> {
  const results: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .in('brand_id', brandIds)
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    const rows = (data || []) as T[]
    results.push(...rows)

    if (rows.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return results
}

async function fetchAllByCompetitorIds<T>(supabase: ReturnType<typeof createServiceRoleClient>, table: string, competitorIds: string[]): Promise<T[]> {
  if (competitorIds.length === 0) return []
  const results: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .in('competitor_id', competitorIds)
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    const rows = (data || []) as T[]
    results.push(...rows)

    if (rows.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return results
}

async function fetchAllByMemoIds<T>(supabase: ReturnType<typeof createServiceRoleClient>, table: string, memoIds: string[]): Promise<T[]> {
  if (memoIds.length === 0) return []
  const results: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .in('memo_id', memoIds)
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw error
    }

    const rows = (data || []) as T[]
    results.push(...rows)

    if (rows.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return results
}

export async function GET() {
  let userId = 'unknown'
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    userId = user?.id || 'unknown'

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()


    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', user.id)
      .single()

    const { data: brands } = await supabase
      .from('brands')
      .select('*')
      .eq('tenant_id', user.id)

    const brandIds = (brands || []).map(brand => brand.id)

    const competitors = brandIds.length > 0
      ? await fetchAllByBrandIds<Record<string, unknown>>(supabase, 'competitors', brandIds)
      : []
    const competitorIds = competitors.map((competitor: Record<string, unknown>) => competitor.id as string).filter(Boolean)

    const [
      brandSettings,
      queries,
      scanResults,
      memos,
      alerts,
      visibilityHistory,
      searchConsoleStats,
      aiTraffic,
      competitorContent,
    ] = await Promise.all([
      brandIds.length > 0 ? fetchAllByBrandIds<Record<string, unknown>>(supabase, 'brand_settings', brandIds) : [],
      brandIds.length > 0 ? fetchAllByBrandIds<Record<string, unknown>>(supabase, 'queries', brandIds) : [],
      brandIds.length > 0 ? fetchAllByBrandIds<Record<string, unknown>>(supabase, 'scan_results', brandIds) : [],
      brandIds.length > 0 ? fetchAllByBrandIds<Record<string, unknown>>(supabase, 'memos', brandIds) : [],
      brandIds.length > 0 ? fetchAllByBrandIds<Record<string, unknown>>(supabase, 'alerts', brandIds) : [],
      brandIds.length > 0 ? fetchAllByBrandIds<Record<string, unknown>>(supabase, 'visibility_history', brandIds) : [],
      brandIds.length > 0 ? fetchAllByBrandIds<Record<string, unknown>>(supabase, 'search_console_stats', brandIds) : [],
      brandIds.length > 0 ? fetchAllByBrandIds<Record<string, unknown>>(supabase, 'ai_traffic', brandIds) : [],
      competitorIds.length > 0 ? fetchAllByCompetitorIds<Record<string, unknown>>(supabase, 'competitor_content', competitorIds) : [],
    ])

    const memoIds = memos.map((memo: Record<string, unknown>) => memo.id as string).filter(Boolean)
    const memoVersions = memoIds.length > 0
      ? await fetchAllByMemoIds<Record<string, unknown>>(supabase, 'memo_versions', memoIds)
      : []

    return NextResponse.json({
      tenant,
      brands: brands || [],
      brandSettings,
      competitors,
      competitorContent,
      queries,
      scanResults,
      memos,
      memoVersions,
      alerts,
      visibilityHistory,
      searchConsoleStats,
      aiTraffic,
      exportedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error('Privacy export error', { error: error instanceof Error ? error.message : String(error), userId })
    return NextResponse.json({ error: 'An unexpected error occurred during data export' }, { status: 500 })
  }
}
