'use client'

import { useEffect, useState, useCallback } from 'react'
import { Switch } from '@/components/ui/switch'
import { 
  Pause, Play, Search, Compass, Newspaper, FileText, 
  ShieldCheck, Brain, Sparkles, Loader2, DollarSign,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'

// ---- Types ----

interface BrandAutomation {
  brand: {
    id: string
    name: string
    domain: string
    is_paused: boolean
    last_scan_at: string | null
    visibility_score: number | null
  }
  settings: {
    auto_scan_enabled: boolean
    daily_scan_cap: number
    scan_schedule: string
    weekly_greenspace_enabled: boolean
    discovery_schedule: string
    competitor_content_enabled: boolean
    competitor_content_schedule: string
    auto_respond_content: boolean
    content_generation_schedule: string
    auto_verify_citations: boolean
    verification_retry_days: number
    auto_expand_network: boolean
    prompt_enrichment_enabled: boolean
    prompt_intelligence_enabled: boolean
    auto_memo_enabled: boolean
    daily_memo_cap: number
    scan_models: string[] | null
    monthly_credit_cap: number | null
    pause_at_cap: boolean
  } | null
  costs7d: {
    totalCents: number
    totalDollars: string
    byType: Record<string, number>
  }
}

// ---- Job definitions ----

interface JobDef {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  enabledField: string
  scheduleField?: string
  scheduleOptions?: { value: string; label: string }[]
  costWeight: 'high' | 'medium' | 'low'
}

// Available scan models
const AVAILABLE_MODELS = [
  { id: 'perplexity-sonar', label: 'Perplexity Sonar', cost: '$' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', cost: '$$' },
  { id: 'claude-3-5-haiku', label: 'Claude 3.5 Haiku', cost: '$$$' },
  { id: 'grok-4-fast', label: 'Grok 4 Fast', cost: '$$' },
]

const JOBS: JobDef[] = [
  {
    key: 'scan',
    label: 'Daily Scan',
    description: '4 AI models × your prompts',
    icon: <Search className="h-4 w-4" />,
    enabledField: 'auto_scan_enabled',
    scheduleField: 'scan_schedule',
    scheduleOptions: [
      { value: 'daily', label: 'Daily' },
      { value: 'every_other_day', label: 'Every other day' },
      { value: 'twice_weekly', label: '2x/week' },
      { value: 'weekly', label: 'Weekly' },
    ],
    costWeight: 'high',
  },
  {
    key: 'discovery',
    label: 'Discovery Scan',
    description: 'Finds new prompts & patterns',
    icon: <Compass className="h-4 w-4" />,
    enabledField: 'weekly_greenspace_enabled',
    scheduleField: 'discovery_schedule',
    scheduleOptions: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Biweekly' },
      { value: 'monthly', label: 'Monthly' },
    ],
    costWeight: 'medium',
  },
  {
    key: 'competitor_content',
    label: 'Competitor Intel',
    description: 'Scans competitor blogs/RSS',
    icon: <Newspaper className="h-4 w-4" />,
    enabledField: 'competitor_content_enabled',
    scheduleField: 'competitor_content_schedule',
    scheduleOptions: [
      { value: 'daily', label: 'Daily' },
      { value: 'every_other_day', label: 'Every other day' },
      { value: 'weekly', label: 'Weekly' },
    ],
    costWeight: 'medium',
  },
  {
    key: 'content_gen',
    label: 'Content Generation',
    description: 'Auto-generates response memos',
    icon: <FileText className="h-4 w-4" />,
    enabledField: 'auto_respond_content',
    scheduleField: 'content_generation_schedule',
    scheduleOptions: [
      { value: 'weekdays', label: 'Weekdays (9-5)' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'off', label: 'Off' },
    ],
    costWeight: 'high',
  },
  {
    key: 'citation_verify',
    label: 'Citation Verify',
    description: 'Checks if published content gets cited',
    icon: <ShieldCheck className="h-4 w-4" />,
    enabledField: 'auto_verify_citations',
    costWeight: 'low',
  },
  {
    key: 'prompt_enrich',
    label: 'Prompt Enrichment',
    description: 'Mines new prompts from scans',
    icon: <Sparkles className="h-4 w-4" />,
    enabledField: 'prompt_enrichment_enabled',
    costWeight: 'low',
  },
  {
    key: 'prompt_intel',
    label: 'Prompt Intelligence',
    description: 'Weekly trend analysis',
    icon: <Brain className="h-4 w-4" />,
    enabledField: 'prompt_intelligence_enabled',
    costWeight: 'low',
  },
]

// ---- Helpers ----

function costBadge(weight: 'high' | 'medium' | 'low') {
  const styles = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-green-100 text-green-700',
  }
  const labels = { high: '$$$', medium: '$$', low: '$' }
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${styles[weight]}`}>
      {labels[weight]}
    </span>
  )
}

// ---- Component ----

export function AutomationsGrid() {
  const [data, setData] = useState<BrandAutomation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null) // brandId being saved
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/brands/automations')
      if (res.ok) {
        const json = await res.json()
        setData(json.brands)
      }
    } catch (e) {
      console.error('Failed to fetch automations:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const updateSetting = async (brandId: string, field: string, value: unknown) => {
    setSaving(brandId)
    
    // Optimistic update
    setData(prev => prev.map(item => {
      if (item.brand.id !== brandId) return item
      if (field === 'is_paused') {
        return { ...item, brand: { ...item.brand, is_paused: value as boolean } }
      }
      if (!item.settings) return item
      return { ...item, settings: { ...item.settings, [field]: value } }
    }))

    try {
      const res = await fetch('/api/brands/automations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId, settings: { [field]: value } }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Setting updated')
    } catch {
      toast.error('Failed to save setting')
      fetchData() // Revert on error
    } finally {
      setSaving(null)
    }
  }

  const toggleExpand = (brandId: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(brandId)) next.delete(brandId)
      else next.add(brandId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        No brands found. Create a brand first.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-6 px-4 py-3 bg-slate-50 border border-slate-200 text-sm">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">7-day tracked spend:</span>
          <span className="font-bold font-mono">
            ${(data.reduce((sum, b) => sum + b.costs7d.totalCents, 0) / 100).toFixed(2)}
          </span>
        </div>
        <div className="text-muted-foreground">
          {data.length} brand{data.length !== 1 ? 's' : ''} &middot;{' '}
          {data.filter(b => !b.brand.is_paused).length} active
        </div>
      </div>

      {/* Brand cards */}
      {data.map(({ brand, settings, costs7d }) => {
        const isExpanded = expanded.has(brand.id)
        const isPaused = brand.is_paused
        const isSaving = saving === brand.id

        return (
          <div
            key={brand.id}
            className={`border ${isPaused ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'} transition-colors`}
          >
            {/* Brand header row */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => toggleExpand(brand.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className={`font-bold text-base ${isPaused ? 'text-muted-foreground' : ''}`}>
                      {brand.name}
                    </h3>
                    {isPaused && (
                      <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 font-medium">
                        PAUSED
                      </span>
                    )}
                    {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{brand.domain}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* 7-day cost */}
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">7d spend</p>
                  <p className="font-mono font-bold text-sm">${costs7d.totalDollars}</p>
                </div>

                {/* Quick toggles row */}
                <div className="flex items-center gap-3">
                  {JOBS.slice(0, 4).map(job => {
                    const enabled = settings ? (settings as Record<string, unknown>)[job.enabledField] as boolean : false
                    return (
                      <button
                        key={job.key}
                        onClick={() => settings && updateSetting(brand.id, job.enabledField, !enabled)}
                        className={`p-1.5 rounded transition-colors ${
                          isPaused ? 'text-slate-300 cursor-not-allowed' :
                          enabled ? 'text-[#0EA5E9] bg-sky-50' : 'text-slate-300 hover:text-slate-500'
                        }`}
                        title={`${job.label}: ${enabled ? 'ON' : 'OFF'}`}
                        disabled={isPaused}
                      >
                        {job.icon}
                      </button>
                    )
                  })}
                </div>

                {/* Master pause/play */}
                <button
                  onClick={() => updateSetting(brand.id, 'is_paused', !isPaused)}
                  className={`p-2 rounded transition-colors ${
                    isPaused 
                      ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                  title={isPaused ? 'Resume all automations' : 'Pause all automations'}
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Expanded settings */}
            {isExpanded && settings && (
              <div className={`border-t border-slate-200 px-5 py-5 ${isPaused ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {JOBS.map(job => {
                    const enabled = (settings as Record<string, unknown>)[job.enabledField] as boolean
                    const schedule = job.scheduleField 
                      ? (settings as Record<string, unknown>)[job.scheduleField] as string 
                      : null

                    return (
                      <div
                        key={job.key}
                        className={`border rounded-lg p-4 transition-colors ${
                          enabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={enabled ? 'text-[#0EA5E9]' : 'text-slate-400'}>
                              {job.icon}
                            </span>
                            <span className="font-semibold text-sm">{job.label}</span>
                          </div>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(val) => updateSetting(brand.id, job.enabledField, val)}
                          />
                        </div>
                        
                        <p className="text-xs text-muted-foreground mb-3">{job.description}</p>

                        <div className="flex items-center justify-between">
                          {job.scheduleField && job.scheduleOptions ? (
                            <select
                              value={schedule || job.scheduleOptions[0].value}
                              onChange={(e) => updateSetting(brand.id, job.scheduleField!, e.target.value)}
                              disabled={!enabled}
                              className="text-xs border border-slate-200 rounded px-2 py-1 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {job.scheduleOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {enabled ? 'Auto' : 'Disabled'}
                            </span>
                          )}
                          {costBadge(job.costWeight)}
                        </div>

                        {/* Cost for this type in last 7 days */}
                        {costs7d.byType[job.key] ? (
                          <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                            7d: ${(costs7d.byType[job.key] / 100).toFixed(2)}
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
                </div>

                {/* Scan Models */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    Scan Models
                    <span className="ml-2 font-normal normal-case">
                      {settings.scan_models 
                        ? `${settings.scan_models.length} of ${AVAILABLE_MODELS.length} active`
                        : `All ${AVAILABLE_MODELS.length} active (default)`
                      }
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_MODELS.map(model => {
                      // If scan_models is null, all are active (global default)
                      const activeModels = settings.scan_models || AVAILABLE_MODELS.map(m => m.id)
                      const isActive = activeModels.includes(model.id)
                      
                      return (
                        <button
                          key={model.id}
                          onClick={() => {
                            // Build new model list
                            const current = settings.scan_models || AVAILABLE_MODELS.map(m => m.id)
                            let next: string[]
                            if (isActive) {
                              // Don't allow disabling all models
                              if (current.length <= 1) {
                                toast.error('At least one model must be enabled')
                                return
                              }
                              next = current.filter(id => id !== model.id)
                            } else {
                              next = [...current, model.id]
                            }
                            // If all models are selected, set to null (use defaults)
                            const value = next.length === AVAILABLE_MODELS.length ? null : next
                            updateSetting(brand.id, 'scan_models', value)
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 border rounded text-xs font-medium transition-colors ${
                            isActive 
                              ? 'border-[#0EA5E9] bg-sky-50 text-[#0EA5E9]' 
                              : 'border-slate-200 bg-white text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#0EA5E9]' : 'bg-slate-300'}`} />
                          {model.label}
                          <span className={`text-[10px] ${isActive ? 'text-sky-400' : 'text-slate-300'}`}>
                            {model.cost}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Extra settings row */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <label className="text-muted-foreground">Scan cap:</label>
                    <select
                      value={settings.daily_scan_cap}
                      onChange={(e) => updateSetting(brand.id, 'daily_scan_cap', parseInt(e.target.value))}
                      className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                    >
                      <option value="25">25 queries</option>
                      <option value="50">50 queries</option>
                      <option value="100">100 queries</option>
                      <option value="200">200 queries</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-muted-foreground">Auto memo:</label>
                    <Switch
                      checked={settings.auto_memo_enabled}
                      onCheckedChange={(val) => updateSetting(brand.id, 'auto_memo_enabled', val)}
                    />
                  </div>
                  {settings.auto_memo_enabled && (
                    <div className="flex items-center gap-2">
                      <label className="text-muted-foreground">Memo cap/day:</label>
                      <select
                        value={settings.daily_memo_cap}
                        onChange={(e) => updateSetting(brand.id, 'daily_memo_cap', parseInt(e.target.value))}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="5">5</option>
                        <option value="10">10</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
