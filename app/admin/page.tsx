import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { SortableBrandsTable, type BrandRow } from '@/components/admin/sortable-brands-table'

async function getCount(
  serviceClient: ReturnType<typeof createServiceRoleClient>,
  table: string,
  filter?: { column: string; operator: 'gte' | 'eq'; value: string }
): Promise<number> {
  try {
    let query = serviceClient.from(table).select('*', { count: 'exact', head: true })
    if (filter) {
      query = query.filter(filter.column, filter.operator, filter.value)
    }
    const { count } = await query
    return count || 0
  } catch (err) {
    console.error(`[admin] Failed to get count for ${table}:`, err)
    return 0
  }
}

async function getOpenRouterBalance(): Promise<{
  balance: number
  usage: number
  limit: number | null
} | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const totalCredits = data.data?.total_credits ?? 0
    const totalUsage = data.data?.total_usage ?? 0
    return {
      balance: totalCredits - totalUsage,
      usage: totalUsage,
      limit: totalCredits > 0 ? totalCredits : null,
    }
  } catch (err) {
    console.error('[admin] Failed to fetch OpenRouter balance:', err)
    return null
  }
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
  if (adminEmails.length > 0 && (!user.email || !adminEmails.includes(user.email.toLowerCase()))) {
    redirect('/dashboard')
  }

  const serviceClient = createServiceRoleClient()

  const last24h = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString()
  const last7d = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    tenantCount,
    brandCount,
    scanCount24h,
    alertCount24h,
    trafficCount24h,
    openRouterBalance,
    allBrandsResult,
    usageEventsResult,
    perfResult,
    crawlResult,
    recentScansResult,
  ] = await Promise.all([
    getCount(serviceClient, 'tenants'),
    getCount(serviceClient, 'brands'),
    getCount(serviceClient, 'scan_results', { column: 'scanned_at', operator: 'gte', value: last24h }),
    getCount(serviceClient, 'alerts', { column: 'created_at', operator: 'gte', value: last24h }),
    getCount(serviceClient, 'ai_traffic', { column: 'timestamp', operator: 'gte', value: last24h }),
    getOpenRouterBalance(),
    serviceClient.from('brands').select('id, name, domain, subdomain, tenant_id, created_at').order('created_at', { ascending: false }),
    serviceClient.rpc('get_admin_brand_spend'),
    serviceClient.rpc('get_admin_brand_performance'),
    serviceClient.rpc('get_admin_brand_crawl_stats'),
    serviceClient.from('scan_results').select('brand_id, scanned_at').gte('scanned_at', last24h),
  ])

  const allBrands = allBrandsResult.data || []
  const spendData = (usageEventsResult.data || []) as Array<{ brand_id: string; all_time_spend: number; spend_7d: number; last_active: string | null }>
  const perfData = (perfResult.data || []) as Array<{ brand_id: string; prompts: number; cited_prompts: number; total_scans: number; mention_rate: number; citation_rate: number; competitors: number; published_memos: number; total_memos: number; last_scanned: string | null }>
  const crawlData = (crawlResult.data || []) as Array<{ brand_subdomain: string; total_crawls: number; ai_crawls: number; search_crawls: number; ai_training_crawls: number; ai_search_crawls: number; ai_user_crawls: number; unique_bots: number; last_crawl: string | null }>
  const recentScans = recentScansResult.data || []

  // Build lookups from RPC results
  const spendMap = new Map(spendData.map(s => [s.brand_id, s]))
  const perfMap = new Map(perfData.map(p => [p.brand_id, p]))
  const crawlMap = new Map(crawlData.map(c => [c.brand_subdomain, c]))

  // Aggregate per-brand stats
  const brandStats = allBrands.map(brand => {
    const spend = spendMap.get(brand.id)
    const perf = perfMap.get(brand.id)
    const crawl = crawlMap.get(brand.subdomain || '')
    const scans24h = recentScans.filter(s => s.brand_id === brand.id).length

    return {
      ...brand,
      spendAllTime: Number(spend?.all_time_spend) || 0,
      spend7d: Number(spend?.spend_7d) || 0,
      scans24h,
      prompts: Number(perf?.prompts) || 0,
      citedPrompts: Number(perf?.cited_prompts) || 0,
      totalScans: Number(perf?.total_scans) || 0,
      mentionRate: Number(perf?.mention_rate) || 0,
      citationRate: Number(perf?.citation_rate) || 0,
      competitors: Number(perf?.competitors) || 0,
      publishedMemos: Number(perf?.published_memos) || 0,
      totalMemos: Number(perf?.total_memos) || 0,
      lastScanned: perf?.last_scanned || null,
      lastActivity: spend?.last_active || null,
      aiCrawls: Number(crawl?.ai_crawls) || 0,
      searchCrawls: Number(crawl?.search_crawls) || 0,
      totalCrawls: Number(crawl?.total_crawls) || 0,
      lastCrawl: crawl?.last_crawl || null,
    }
  }).sort((a, b) => b.spendAllTime - a.spendAllTime)

  // Totals
  const totalSpendAllTime = spendData.reduce((sum, s) => sum + Number(s.all_time_spend), 0)
  const totalSpend7d = spendData.reduce((sum, s) => sum + Number(s.spend_7d), 0)

  // Get tenant names for brand ownership display
  const tenantIds = Array.from(new Set(allBrands.map(b => b.tenant_id)))
  const { data: tenants } = await serviceClient
    .from('tenants')
    .select('id, email')
    .in('id', tenantIds)
  const tenantMap = new Map((tenants || []).map(t => [t.id, t.email]))

  // Recent alerts
  const { data: recentAlerts } = await serviceClient
    .from('alerts')
    .select('id, brand_id, alert_type, title, message, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  // Map brand IDs to names for alerts display
  const brandNameMap = new Map(allBrands.map(b => [b.id, b.name]))

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0F172A]">
            <span className="text-lg font-bold text-white">SA</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Super Admin</h1>
            <p className="text-xs text-slate-500">Context Memo — system-wide visibility</p>
          </div>
        </div>
      </div>

      {/* OpenRouter Balance + Key Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* OpenRouter Balance — the big one */}
        <div className="col-span-1 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">OpenRouter Balance</div>
              {openRouterBalance ? (
                <>
                  <div className="mt-1 text-4xl font-bold text-emerald-800">
                    ${openRouterBalance.balance.toFixed(2)}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                    <span>Total used: <span className="font-medium text-slate-700">${openRouterBalance.usage.toFixed(2)}</span></span>
                    {openRouterBalance.limit !== null && (
                      <span>Limit: <span className="font-medium text-slate-700">${openRouterBalance.limit.toFixed(2)}</span></span>
                    )}
                  </div>
                  {/* Usage bar */}
                  {openRouterBalance.limit !== null && openRouterBalance.limit > 0 && (
                    <div className="mt-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (openRouterBalance.usage / openRouterBalance.limit) > 0.8
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (openRouterBalance.usage / openRouterBalance.limit) * 100)}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[10px] text-slate-400">
                        {((openRouterBalance.usage / openRouterBalance.limit) * 100).toFixed(1)}% of limit used
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-1 text-lg text-slate-400">Unable to fetch</div>
              )}
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>Tracked spend (all time)</div>
              <div className="mt-1 text-lg font-semibold text-slate-700">${totalSpendAllTime.toFixed(2)}</div>
              <div className="mt-2">Last 7 days</div>
              <div className="mt-1 text-base font-medium text-slate-600">${totalSpend7d.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Tenants</div>
          <div className="mt-2 text-2xl font-semibold text-[#0F172A]">{tenantCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Brands</div>
          <div className="mt-2 text-2xl font-semibold text-[#0F172A]">{brandCount}</div>
        </div>
      </div>

      {/* 24h Activity Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Scans (24h)</div>
          <div className="mt-2 text-2xl font-semibold text-[#0F172A]">{scanCount24h}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Alerts (24h)</div>
          <div className="mt-2 text-2xl font-semibold text-[#0F172A]">{alertCount24h}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">AI Traffic (24h)</div>
          <div className="mt-2 text-2xl font-semibold text-[#0F172A]">{trafficCount24h}</div>
        </div>
      </div>

      {/* All Brands Table (sortable) */}
      <SortableBrandsTable brands={brandStats.map(b => ({
        id: b.id,
        name: b.name,
        domain: b.domain,
        owner: tenantMap.get(b.tenant_id) || '—',
        spendAllTime: b.spendAllTime,
        spend7d: b.spend7d,
        scans24h: b.scans24h,
        prompts: b.prompts,
        citedPrompts: b.citedPrompts,
        totalScans: b.totalScans,
        mentionRate: b.mentionRate,
        citationRate: b.citationRate,
        publishedMemos: b.publishedMemos,
        totalMemos: b.totalMemos,
        aiCrawls: b.aiCrawls,
        searchCrawls: b.searchCrawls,
        totalCrawls: b.totalCrawls,
        lastCrawl: b.lastCrawl,
        lastScanned: b.lastScanned,
      }))} />

      {/* Recent Alerts */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#0F172A]">Recent Alerts</h2>
          <span className="text-xs text-slate-500">Last 10</span>
        </div>
        <div className="space-y-3">
          {(recentAlerts || []).length === 0 && (
            <div className="text-sm text-slate-500">No alerts available.</div>
          )}
          {(recentAlerts || []).map(alert => (
            <div key={alert.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[#0F172A]">{alert.title || alert.alert_type}</div>
                <div className="text-xs text-slate-500">{new Date(alert.created_at).toLocaleString()}</div>
              </div>
              {alert.message && (
                <div className="mt-1 text-sm text-slate-600">{alert.message}</div>
              )}
              <div className="mt-2 text-xs text-slate-400">
                Brand: {brandNameMap.get(alert.brand_id) || alert.brand_id}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
