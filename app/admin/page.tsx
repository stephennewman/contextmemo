import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

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
    recentScansResult,
    memoCountResult,
  ] = await Promise.all([
    getCount(serviceClient, 'tenants'),
    getCount(serviceClient, 'brands'),
    getCount(serviceClient, 'scan_results', { column: 'scanned_at', operator: 'gte', value: last24h }),
    getCount(serviceClient, 'alerts', { column: 'created_at', operator: 'gte', value: last24h }),
    getCount(serviceClient, 'ai_traffic', { column: 'timestamp', operator: 'gte', value: last24h }),
    getOpenRouterBalance(),
    serviceClient.from('brands').select('id, name, domain, subdomain, tenant_id, created_at').order('created_at', { ascending: false }),
    serviceClient.from('usage_events').select('brand_id, actual_cost_cents, created_at').gte('created_at', last7d),
    serviceClient.from('scan_results').select('brand_id, scanned_at').gte('scanned_at', last24h),
    serviceClient.from('memos').select('brand_id, status', { count: 'exact' }),
  ])

  const allBrands = allBrandsResult.data || []
  const usageEvents = usageEventsResult.data || []
  const recentScans = recentScansResult.data || []
  const allMemos = memoCountResult.data || []

  // Aggregate per-brand: 7d spend, 24h scans, total memos
  const brandStats = allBrands.map(brand => {
    const spend7d = usageEvents
      .filter(e => e.brand_id === brand.id)
      .reduce((sum, e) => sum + (Number(e.actual_cost_cents) || 0), 0) / 100
    const scans24h = recentScans.filter(s => s.brand_id === brand.id).length
    const memos = allMemos.filter((m: { brand_id: string; status: string }) => m.brand_id === brand.id)
    const publishedMemos = memos.filter((m: { status: string }) => m.status === 'published').length
    const totalMemos = memos.length

    return {
      ...brand,
      spend7d,
      scans24h,
      totalMemos,
      publishedMemos,
    }
  })

  // Total 7d spend across all brands (actual cost)
  const totalSpend7d = usageEvents.reduce((sum, e) => sum + (Number(e.actual_cost_cents) || 0), 0) / 100

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
              <div>7d platform spend</div>
              <div className="mt-1 text-lg font-semibold text-slate-700">${totalSpend7d.toFixed(2)}</div>
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

      {/* All Brands Table */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#0F172A]">All Brands</h2>
          <span className="text-xs text-slate-500">{allBrands.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-3 pr-4 font-medium">Brand</th>
                <th className="pb-3 pr-4 font-medium">Domain</th>
                <th className="pb-3 pr-4 font-medium">Owner</th>
                <th className="pb-3 pr-4 text-right font-medium">7d Spend</th>
                <th className="pb-3 pr-4 text-right font-medium">Scans (24h)</th>
                <th className="pb-3 pr-4 text-right font-medium">Memos</th>
                <th className="pb-3 text-right font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {brandStats.map(brand => (
                <tr key={brand.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-[#0F172A]">{brand.name}</div>
                    {brand.subdomain && (
                      <div className="text-[10px] text-slate-400">{brand.subdomain}.contextmemo.com</div>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{brand.domain || '—'}</td>
                  <td className="py-3 pr-4 text-xs text-slate-500">{tenantMap.get(brand.tenant_id) || '—'}</td>
                  <td className="py-3 pr-4 text-right font-mono text-xs">
                    {brand.spend7d > 0 ? (
                      <span className={brand.spend7d > 1 ? 'text-amber-600' : 'text-slate-600'}>
                        ${brand.spend7d.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-slate-300">$0.00</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-xs text-slate-600">
                    {brand.scans24h || <span className="text-slate-300">0</span>}
                  </td>
                  <td className="py-3 pr-4 text-right text-xs">
                    <span className="text-slate-600">{brand.publishedMemos}</span>
                    <span className="text-slate-300">/{brand.totalMemos}</span>
                  </td>
                  <td className="py-3 text-right text-xs text-slate-400">
                    {new Date(brand.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
              {brandStats.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-400">No brands yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
