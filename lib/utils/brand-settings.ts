import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface BrandAutomationSettings {
  // Scans
  auto_scan_enabled: boolean
  daily_scan_cap: number
  scan_schedule: 'daily' | 'every_other_day' | 'twice_weekly' | 'weekly'
  // Discovery
  weekly_greenspace_enabled: boolean
  discovery_schedule: 'weekly' | 'biweekly' | 'monthly'
  // Competitor content
  competitor_content_enabled: boolean
  competitor_content_schedule: 'daily' | 'every_other_day' | 'weekly'
  // Content generation
  auto_respond_content: boolean
  content_generation_schedule: 'weekdays' | 'daily' | 'weekly' | 'off'
  // Verification
  auto_verify_citations: boolean
  verification_retry_days: number
  // Network
  auto_expand_network: boolean
  max_competitors_to_expand: number
  // Prompt workflows
  prompt_enrichment_enabled: boolean
  prompt_intelligence_enabled: boolean
  // Memos
  auto_memo_enabled: boolean
  daily_memo_cap: number
  memo_approval_required: boolean
  // Cost controls
  monthly_credit_cap: number | null
  pause_at_cap: boolean
}

// Default settings — used when no brand_settings row exists
// Optimized for "scan less, write more": Claude Haiku weekly + daily content generation
const DEFAULTS: BrandAutomationSettings = {
  auto_scan_enabled: true,
  daily_scan_cap: 100,
  scan_schedule: 'weekly',              // Weekly scanning is enough — citation landscapes change slowly
  weekly_greenspace_enabled: true,
  discovery_schedule: 'monthly',         // Monthly discovery — prompt landscape is stable
  competitor_content_enabled: true,
  competitor_content_schedule: 'weekly',  // Weekly competitor intel
  auto_respond_content: true,            // Auto-generate content for gaps
  content_generation_schedule: 'weekdays', // Daily content creation on weekdays
  auto_verify_citations: true,
  verification_retry_days: 3,
  auto_expand_network: false,
  max_competitors_to_expand: 3,
  prompt_enrichment_enabled: true,
  prompt_intelligence_enabled: true,
  auto_memo_enabled: true,               // Auto-generate memos from gaps
  daily_memo_cap: 3,                     // 3 memos/day per brand
  memo_approval_required: false,          // Auto-publish for faster indexing
  monthly_credit_cap: null,
  pause_at_cap: true,
}

/**
 * Get automation settings for a brand.
 * Returns defaults if no row exists.
 */
export async function getBrandSettings(brandId: string): Promise<BrandAutomationSettings> {
  const { data } = await supabase
    .from('brand_settings')
    .select('*')
    .eq('brand_id', brandId)
    .single()

  if (!data) return { ...DEFAULTS }

  return {
    auto_scan_enabled: data.auto_scan_enabled ?? DEFAULTS.auto_scan_enabled,
    daily_scan_cap: data.daily_scan_cap ?? DEFAULTS.daily_scan_cap,
    scan_schedule: data.scan_schedule ?? DEFAULTS.scan_schedule,
    weekly_greenspace_enabled: data.weekly_greenspace_enabled ?? DEFAULTS.weekly_greenspace_enabled,
    discovery_schedule: data.discovery_schedule ?? DEFAULTS.discovery_schedule,
    competitor_content_enabled: data.competitor_content_enabled ?? DEFAULTS.competitor_content_enabled,
    competitor_content_schedule: data.competitor_content_schedule ?? DEFAULTS.competitor_content_schedule,
    auto_respond_content: data.auto_respond_content ?? DEFAULTS.auto_respond_content,
    content_generation_schedule: data.content_generation_schedule ?? DEFAULTS.content_generation_schedule,
    auto_verify_citations: data.auto_verify_citations ?? DEFAULTS.auto_verify_citations,
    verification_retry_days: data.verification_retry_days ?? DEFAULTS.verification_retry_days,
    auto_expand_network: data.auto_expand_network ?? DEFAULTS.auto_expand_network,
    max_competitors_to_expand: data.max_competitors_to_expand ?? DEFAULTS.max_competitors_to_expand,
    prompt_enrichment_enabled: data.prompt_enrichment_enabled ?? DEFAULTS.prompt_enrichment_enabled,
    prompt_intelligence_enabled: data.prompt_intelligence_enabled ?? DEFAULTS.prompt_intelligence_enabled,
    auto_memo_enabled: data.auto_memo_enabled ?? DEFAULTS.auto_memo_enabled,
    daily_memo_cap: data.daily_memo_cap ?? DEFAULTS.daily_memo_cap,
    memo_approval_required: data.memo_approval_required ?? DEFAULTS.memo_approval_required,
    monthly_credit_cap: data.monthly_credit_cap ?? DEFAULTS.monthly_credit_cap,
    pause_at_cap: data.pause_at_cap ?? DEFAULTS.pause_at_cap,
  }
}

/**
 * Check if a scheduled job should run today based on schedule setting.
 * 
 * @param schedule - The schedule type
 * @param lastRunDate - When the job last ran (ISO string or null)
 */
export function shouldRunOnSchedule(
  schedule: string,
  lastRunDate: string | null
): boolean {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon...
  
  if (!lastRunDate) return true // Never run, should run now

  const lastRun = new Date(lastRunDate)
  const daysSinceLastRun = Math.floor(
    (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24)
  )

  switch (schedule) {
    case 'daily':
      return daysSinceLastRun >= 1
    case 'every_other_day':
      return daysSinceLastRun >= 2
    case 'twice_weekly':
      // Run on Monday (1) and Thursday (4)
      return (dayOfWeek === 1 || dayOfWeek === 4) && daysSinceLastRun >= 2
    case 'weekly':
      return daysSinceLastRun >= 7
    case 'biweekly':
      return daysSinceLastRun >= 14
    case 'monthly':
      return daysSinceLastRun >= 28
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5 && daysSinceLastRun >= 1
    case 'off':
      return false
    default:
      return daysSinceLastRun >= 1
  }
}

/**
 * Get settings for all brands at once (for daily-run.ts).
 */
export async function getAllBrandSettings(
  brandIds: string[]
): Promise<Map<string, BrandAutomationSettings>> {
  const { data } = await supabase
    .from('brand_settings')
    .select('*')
    .in('brand_id', brandIds)

  const map = new Map<string, BrandAutomationSettings>()
  const settingsMap = new Map((data || []).map(s => [s.brand_id, s]))

  for (const brandId of brandIds) {
    const s = settingsMap.get(brandId)
    if (!s) {
      map.set(brandId, { ...DEFAULTS })
    } else {
      map.set(brandId, {
        auto_scan_enabled: s.auto_scan_enabled ?? DEFAULTS.auto_scan_enabled,
        daily_scan_cap: s.daily_scan_cap ?? DEFAULTS.daily_scan_cap,
        scan_schedule: s.scan_schedule ?? DEFAULTS.scan_schedule,
        weekly_greenspace_enabled: s.weekly_greenspace_enabled ?? DEFAULTS.weekly_greenspace_enabled,
        discovery_schedule: s.discovery_schedule ?? DEFAULTS.discovery_schedule,
        competitor_content_enabled: s.competitor_content_enabled ?? DEFAULTS.competitor_content_enabled,
        competitor_content_schedule: s.competitor_content_schedule ?? DEFAULTS.competitor_content_schedule,
        auto_respond_content: s.auto_respond_content ?? DEFAULTS.auto_respond_content,
        content_generation_schedule: s.content_generation_schedule ?? DEFAULTS.content_generation_schedule,
        auto_verify_citations: s.auto_verify_citations ?? DEFAULTS.auto_verify_citations,
        verification_retry_days: s.verification_retry_days ?? DEFAULTS.verification_retry_days,
        auto_expand_network: s.auto_expand_network ?? DEFAULTS.auto_expand_network,
        max_competitors_to_expand: s.max_competitors_to_expand ?? DEFAULTS.max_competitors_to_expand,
        prompt_enrichment_enabled: s.prompt_enrichment_enabled ?? DEFAULTS.prompt_enrichment_enabled,
        prompt_intelligence_enabled: s.prompt_intelligence_enabled ?? DEFAULTS.prompt_intelligence_enabled,
        auto_memo_enabled: s.auto_memo_enabled ?? DEFAULTS.auto_memo_enabled,
        daily_memo_cap: s.daily_memo_cap ?? DEFAULTS.daily_memo_cap,
        memo_approval_required: s.memo_approval_required ?? DEFAULTS.memo_approval_required,
        monthly_credit_cap: s.monthly_credit_cap ?? DEFAULTS.monthly_credit_cap,
        pause_at_cap: s.pause_at_cap ?? DEFAULTS.pause_at_cap,
      })
    }
  }

  return map
}
