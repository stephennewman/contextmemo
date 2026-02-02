import { createClient } from '@supabase/supabase-js'
import { 
  ActivityType, 
  ActivityCategory,
  ACTIVITY_TYPE_META 
} from '@/lib/supabase/types'

// Create a server-side Supabase client for Inngest functions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface LogActivityParams {
  brandId: string
  tenantId: string
  activityType: ActivityType
  title: string
  description?: string | null
  linkUrl?: string | null
  linkLabel?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Log an activity to the activity_log table.
 * 
 * Use this in Inngest functions to create rich activity feed entries.
 * The activity feed also aggregates from existing tables (alerts, memos, etc.),
 * so this is primarily for adding extra context or custom activities.
 * 
 * @example
 * await logActivity({
 *   brandId: brand.id,
 *   tenantId: brand.tenant_id,
 *   activityType: 'scan_completed',
 *   title: 'AI Scan Complete',
 *   description: '85% visibility across 9 models',
 *   linkUrl: `/brands/${brand.id}`,
 *   linkLabel: 'View Results',
 *   metadata: { visibility: 85, models: 9 }
 * })
 */
export async function logActivity({
  brandId,
  tenantId,
  activityType,
  title,
  description,
  linkUrl,
  linkLabel,
  metadata = {},
}: LogActivityParams): Promise<{ success: boolean; error?: string }> {
  try {
    const meta = ACTIVITY_TYPE_META[activityType]
    if (!meta) {
      console.warn(`Unknown activity type: ${activityType}`)
      return { success: false, error: 'Unknown activity type' }
    }

    const { error } = await supabase
      .from('activity_log')
      .insert({
        brand_id: brandId,
        tenant_id: tenantId,
        activity_type: activityType,
        category: meta.category,
        title,
        description: description || null,
        icon: meta.icon,
        link_url: linkUrl || null,
        link_label: linkLabel || null,
        metadata,
      })

    if (error) {
      // Table may not exist yet - this is OK, the feed will still work
      // via aggregation from other tables
      if (error.code === '42P01') {
        console.log('Activity log table not yet created, skipping...')
        return { success: true }
      }
      console.error('Failed to log activity:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Activity logging error:', err)
    return { success: false, error: 'Unexpected error' }
  }
}

/**
 * Batch log multiple activities at once.
 */
export async function logActivities(
  activities: LogActivityParams[]
): Promise<{ success: boolean; logged: number; errors: number }> {
  let logged = 0
  let errors = 0

  for (const activity of activities) {
    const result = await logActivity(activity)
    if (result.success) {
      logged++
    } else {
      errors++
    }
  }

  return { success: errors === 0, logged, errors }
}

// Pre-built activity loggers for common operations
export const ActivityLoggers = {
  async scanCompleted(
    brandId: string,
    tenantId: string,
    stats: { visibility: number; models: number; mentioned: number; total: number }
  ) {
    return logActivity({
      brandId,
      tenantId,
      activityType: 'scan_completed',
      title: 'AI Scan Complete',
      description: `${stats.visibility}% visibility across ${stats.models} models (${stats.mentioned}/${stats.total} mentions)`,
      linkUrl: `/brands/${brandId}`,
      linkLabel: 'View Results',
      metadata: stats,
    })
  },

  async memoGenerated(
    brandId: string,
    tenantId: string,
    memo: { id: string; title: string; memoType: string }
  ) {
    return logActivity({
      brandId,
      tenantId,
      activityType: 'memo_generated',
      title: 'Memo Generated',
      description: memo.title,
      linkUrl: `/brands/${brandId}/memos/${memo.id}`,
      linkLabel: 'View Memo',
      metadata: { memo_type: memo.memoType },
    })
  },

  async memoPublished(
    brandId: string,
    tenantId: string,
    memo: { id: string; title: string; slug: string; subdomain: string }
  ) {
    return logActivity({
      brandId,
      tenantId,
      activityType: 'memo_published',
      title: 'Memo Published',
      description: `"${memo.title}" is now live at ${memo.subdomain}.contextmemo.com/${memo.slug}`,
      linkUrl: `/brands/${brandId}/memos/${memo.id}`,
      linkLabel: 'View Memo',
      metadata: { slug: memo.slug },
    })
  },

  async competitorDiscovered(
    brandId: string,
    tenantId: string,
    competitor: { name: string; domain?: string; auto: boolean }
  ) {
    return logActivity({
      brandId,
      tenantId,
      activityType: 'competitor_discovered',
      title: competitor.auto ? 'Competitor Auto-Discovered' : 'Competitor Added',
      description: competitor.name,
      linkUrl: `/brands/${brandId}?tab=competitors`,
      linkLabel: 'View Competitors',
      metadata: { domain: competitor.domain, auto: competitor.auto },
    })
  },

  async queryGenerated(
    brandId: string,
    tenantId: string,
    count: number,
    sampleQuery?: string
  ) {
    return logActivity({
      brandId,
      tenantId,
      activityType: 'query_generated',
      title: `${count} Queries Generated`,
      description: sampleQuery ? `Including "${sampleQuery}"${count > 1 ? ` and ${count - 1} more` : ''}` : undefined,
      linkUrl: `/brands/${brandId}?tab=prompts`,
      linkLabel: 'View Prompts',
      metadata: { count, sample: sampleQuery },
    })
  },

  async contextExtracted(
    brandId: string,
    tenantId: string,
    domain: string
  ) {
    return logActivity({
      brandId,
      tenantId,
      activityType: 'context_extracted',
      title: 'Brand Context Extracted',
      description: `AI analyzed ${domain} and extracted brand information`,
      linkUrl: `/brands/${brandId}/settings`,
      linkLabel: 'View Context',
      metadata: { domain },
    })
  },

  async aiTrafficDetected(
    brandId: string,
    tenantId: string,
    source: string,
    pageUrl: string,
    memoId?: string
  ) {
    return logActivity({
      brandId,
      tenantId,
      activityType: 'ai_traffic_detected',
      title: `Visit from ${source.charAt(0).toUpperCase() + source.slice(1)}`,
      description: pageUrl,
      linkUrl: memoId ? `/brands/${brandId}/memos/${memoId}` : `/brands/${brandId}`,
      linkLabel: memoId ? 'View Memo' : 'View Brand',
      metadata: { source },
    })
  },
}
