'use client'

import { useState } from 'react'

export type TenantRow = {
  tenantId: string
  email: string
  name: string | null
  plan: string
  createdAt: string
  lastSignIn: string | null
  lastActivity: string | null
  lastScan: string | null
  lastMemoCreated: string | null
  brandCount: number
  totalSpend: number
  spend7d: number
}

type SortKey = keyof TenantRow
type SortDir = 'asc' | 'desc'

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  if (diffMs < 0) return 'just now'
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function activityColor(dateStr: string | null): string {
  if (!dateStr) return 'text-slate-300'
  const diffHrs = (Date.now() - new Date(dateStr).getTime()) / 3600000
  if (diffHrs < 24) return 'text-emerald-600 font-medium'
  if (diffHrs < 72) return 'text-slate-600'
  if (diffHrs < 168) return 'text-slate-500'
  return 'text-amber-600' // inactive > 7 days
}

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right'; tooltip?: string }[] = [
  { key: 'name', label: 'Tenant', align: 'left' },
  { key: 'plan', label: 'Plan', align: 'left' },
  { key: 'brandCount', label: 'Brands', align: 'right' },
  { key: 'totalSpend', label: 'All-Time $', align: 'right', tooltip: 'Total AI API spend' },
  { key: 'spend7d', label: '7d $', align: 'right', tooltip: 'AI API spend in the last 7 days' },
  { key: 'lastSignIn', label: 'Last Login', align: 'right', tooltip: 'Last time user signed in via Supabase Auth' },
  { key: 'lastActivity', label: 'Last Activity', align: 'right', tooltip: 'Most recent action: login, scan, memo creation, or API usage' },
  { key: 'createdAt', label: 'Signed Up', align: 'right' },
]

export function SortableTenantsTable({ tenants }: { tenants: TenantRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('lastActivity')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' || key === 'email' || key === 'plan' ? 'asc' : 'desc')
    }
  }

  const sorted = [...tenants].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    const diff = (av as number) - (bv as number)
    return sortDir === 'asc' ? diff : -diff
  })

  const arrow = (key: SortKey) => {
    if (key !== sortKey) return ''
    return sortDir === 'desc' ? ' ▼' : ' ▲'
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0F172A]">Tenants</h2>
        <span className="text-xs text-slate-500">{tenants.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`cursor-pointer select-none pb-3 pr-4 font-medium hover:text-slate-800 ${col.align === 'right' ? 'text-right' : ''}`}
                  onClick={() => handleSort(col.key)}
                  title={col.tooltip}
                >
                  <span className={`inline-flex items-center gap-0.5 ${col.tooltip ? 'border-b border-dotted border-slate-300' : ''}`}>
                    {col.label}{arrow(col.key)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(tenant => (
              <tr key={tenant.tenantId} className="border-b border-slate-50 hover:bg-slate-50">
                {/* Tenant name + email */}
                <td className="py-3 pr-4">
                  <div className="font-medium text-[#0F172A]">{tenant.name || '—'}</div>
                  <div className="text-[10px] text-slate-400">{tenant.email}</div>
                </td>
                {/* Plan */}
                <td className="py-3 pr-4">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    tenant.plan === 'pro' ? 'bg-violet-100 text-violet-700'
                    : tenant.plan === 'growth' ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tenant.plan}
                  </span>
                </td>
                {/* Brands */}
                <td className="py-3 pr-4 text-right font-mono text-xs text-slate-600">
                  {tenant.brandCount > 0 ? tenant.brandCount : <span className="text-slate-300">0</span>}
                </td>
                {/* All-Time $ */}
                <td className="py-3 pr-4 text-right font-mono text-xs">
                  {tenant.totalSpend > 0 ? (
                    <span className={tenant.totalSpend > 10 ? 'font-semibold text-red-600' : tenant.totalSpend > 3 ? 'text-amber-600' : 'text-slate-600'}>
                      ${tenant.totalSpend.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-slate-300">$0.00</span>
                  )}
                </td>
                {/* 7d $ */}
                <td className="py-3 pr-4 text-right font-mono text-xs">
                  {tenant.spend7d > 0 ? (
                    <span className={tenant.spend7d > 5 ? 'text-amber-600' : 'text-slate-600'}>
                      ${tenant.spend7d.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                {/* Last Login */}
                <td className={`py-3 pr-4 text-right text-xs ${activityColor(tenant.lastSignIn)}`}
                    title={tenant.lastSignIn ? new Date(tenant.lastSignIn).toLocaleString() : undefined}
                >
                  {timeAgo(tenant.lastSignIn)}
                </td>
                {/* Last Activity */}
                <td className={`py-3 pr-4 text-right text-xs ${activityColor(tenant.lastActivity)}`}
                    title={tenant.lastActivity ? new Date(tenant.lastActivity).toLocaleString() : undefined}
                >
                  {timeAgo(tenant.lastActivity)}
                </td>
                {/* Signed Up */}
                <td className="py-3 text-right text-xs text-slate-400"
                    title={new Date(tenant.createdAt).toLocaleString()}
                >
                  {new Date(tenant.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-slate-400">No tenants yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
