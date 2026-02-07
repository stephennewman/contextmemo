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
  } catch {
    return 0
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

  const [
    tenantCount,
    brandCount,
    scanCount24h,
    alertCount24h,
    trafficCount24h,
  ] = await Promise.all([
    getCount(serviceClient, 'tenants'),
    getCount(serviceClient, 'brands'),
    getCount(serviceClient, 'scan_results', { column: 'scanned_at', operator: 'gte', value: last24h }),
    getCount(serviceClient, 'alerts', { column: 'created_at', operator: 'gte', value: last24h }),
    getCount(serviceClient, 'ai_traffic', { column: 'timestamp', operator: 'gte', value: last24h }),
  ])

  const { data: recentAlerts } = await serviceClient
    .from('alerts')
    .select('id, brand_id, alert_type, title, message, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-[#0F172A]">Admin Dashboard</h1>
        <p className="text-sm text-slate-500">System-wide metrics, logs, and alerts (last 24 hours).</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Tenants</div>
          <div className="mt-2 text-2xl font-semibold text-[#0F172A]">{tenantCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500">Brands</div>
          <div className="mt-2 text-2xl font-semibold text-[#0F172A]">{brandCount}</div>
        </div>
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
              <div className="mt-2 text-xs text-slate-400">Brand: {alert.brand_id}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
