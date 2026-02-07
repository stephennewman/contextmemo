/**
 * Feed Event Emitter
 * Helper functions for Inngest jobs to emit feed events
 */

import { createServiceRoleClient } from '@/lib/supabase/service'
import type { 
  FeedWorkflow, 
  FeedEventType, 
  FeedSeverity, 
  FeedAction,
  FeedEventData 
} from './types'

const supabase = createServiceRoleClient()

interface EmitFeedEventParams {
  tenant_id: string
  brand_id: string
  workflow: FeedWorkflow
  event_type: FeedEventType
  title: string
  description?: string
  severity?: FeedSeverity
  action_available?: FeedAction[]
  action_cost_credits?: number
  related_query_id?: string
  related_memo_id?: string
  related_competitor_id?: string
  related_scan_id?: string
  data?: FeedEventData
}

/**
 * Emit a feed event that will appear in the user's v2 feed
 */
export async function emitFeedEvent(params: EmitFeedEventParams): Promise<string | null> {
  const {
    tenant_id,
    brand_id,
    workflow,
    event_type,
    title,
    description,
    severity = 'info',
    action_available,
    action_cost_credits = 0,
    related_query_id,
    related_memo_id,
    related_competitor_id,
    related_scan_id,
    data = {},
  } = params

  const { data: event, error } = await supabase
    .from('feed_events')
    .insert({
      tenant_id,
      brand_id,
      workflow,
      event_type,
      title,
      description,
      severity,
      action_available,
      action_cost_credits,
      related_query_id,
      related_memo_id,
      related_competitor_id,
      related_scan_id,
      data,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to emit feed event:', error)
    return null
  }

  return event.id
}

/**
 * Emit a gap identified event (W1)
 */
export async function emitGapIdentified(params: {
  tenant_id: string
  brand_id: string
  query_id: string
  query_text: string
  visibility_rate: number
  winner_name?: string
  winner_domain?: string
  winner_citation_url?: string
  models_checked: string[]
}): Promise<string | null> {
  return emitFeedEvent({
    tenant_id: params.tenant_id,
    brand_id: params.brand_id,
    workflow: 'core_discovery',
    event_type: 'gap_identified',
    title: params.winner_name 
      ? `${params.winner_name} winning on "${params.query_text.slice(0, 50)}..."`
      : `Gap: "${params.query_text.slice(0, 60)}..."`,
    description: `${params.visibility_rate}% citation rate - content needed to compete`,
    severity: params.visibility_rate === 0 ? 'action_required' : 'warning',
    action_available: ['generate_memo', 'view_details', 'dismiss'],
    action_cost_credits: 3, // cost to generate memo
    related_query_id: params.query_id,
    data: {
      gap: {
        query_text: params.query_text,
        visibility_rate: params.visibility_rate,
        winner_name: params.winner_name,
        winner_domain: params.winner_domain,
        winner_citation_url: params.winner_citation_url,
        models_checked: params.models_checked,
      },
    },
  })
}

/**
 * Emit a citation verified event (W4)
 */
export async function emitCitationVerified(params: {
  tenant_id: string
  brand_id: string
  memo_id: string
  memo_title: string
  memo_slug: string
  time_to_citation_hours: number
  citing_models: string[]
  citation_rate: number
}): Promise<string | null> {
  return emitFeedEvent({
    tenant_id: params.tenant_id,
    brand_id: params.brand_id,
    workflow: 'verification',
    event_type: 'citation_verified',
    title: `"${params.memo_title}" now cited`,
    description: `Verified by ${params.citing_models.join(', ')} in ${params.time_to_citation_hours}h`,
    severity: 'success',
    action_available: ['view_memo'],
    action_cost_credits: 0,
    related_memo_id: params.memo_id,
    data: {
      verification: {
        memo_title: params.memo_title,
        memo_slug: params.memo_slug,
        time_to_citation_hours: params.time_to_citation_hours,
        citing_models: params.citing_models,
        citation_rate: params.citation_rate,
      },
    },
  })
}

/**
 * Emit a competitor published event (W3)
 */
export async function emitCompetitorPublished(params: {
  tenant_id: string
  brand_id: string
  competitor_id: string
  competitor_name: string
  article_title: string
  article_url: string
  relevance_score: number
  matched_prompts: string[]
}): Promise<string | null> {
  const severity: FeedSeverity = params.relevance_score > 0.7 
    ? 'action_required' 
    : params.relevance_score > 0.4 
      ? 'warning' 
      : 'info'

  return emitFeedEvent({
    tenant_id: params.tenant_id,
    brand_id: params.brand_id,
    workflow: 'competitive_response',
    event_type: 'competitor_published',
    title: `${params.competitor_name} published: "${params.article_title.slice(0, 50)}..."`,
    description: `Relevance: ${Math.round(params.relevance_score * 100)}% - matches ${params.matched_prompts.length} prompts`,
    severity,
    action_available: ['generate_memo', 'view_competitor', 'dismiss'],
    action_cost_credits: 3,
    related_competitor_id: params.competitor_id,
    data: {
      competitor_content: {
        competitor_name: params.competitor_name,
        article_title: params.article_title,
        article_url: params.article_url,
        relevance_score: params.relevance_score,
        matched_prompts: params.matched_prompts,
      },
    },
  })
}

/**
 * Emit a scan complete event (W1)
 */
export async function emitScanComplete(params: {
  tenant_id: string
  brand_id: string
  prompts_scanned: number
  citation_rate: number
  mention_rate: number
  gaps_found: number
  models_used: string[]
}): Promise<string | null> {
  const severity: FeedSeverity = params.gaps_found > 5 
    ? 'warning' 
    : params.citation_rate > 50 
      ? 'success' 
      : 'info'

  return emitFeedEvent({
    tenant_id: params.tenant_id,
    brand_id: params.brand_id,
    workflow: 'core_discovery',
    event_type: 'scan_complete',
    title: `Scan complete: ${params.citation_rate}% citation rate`,
    description: `${params.prompts_scanned} prompts scanned, ${params.gaps_found} gaps found`,
    severity,
    action_available: ['view_details'],
    action_cost_credits: 0,
    data: {
      scan: {
        prompts_scanned: params.prompts_scanned,
        citation_rate: params.citation_rate,
        mention_rate: params.mention_rate,
        gaps_found: params.gaps_found,
        models_used: params.models_used,
      },
    },
  })
}

/**
 * Emit a competitor discovered event (W2)
 */
export async function emitCompetitorDiscovered(params: {
  tenant_id: string
  brand_id: string
  competitor_id: string
  competitor_name: string
  competitor_domain: string
  source: 'scan' | 'network_expansion' | 'manual'
}): Promise<string | null> {
  return emitFeedEvent({
    tenant_id: params.tenant_id,
    brand_id: params.brand_id,
    workflow: 'network_expansion',
    event_type: 'competitor_discovered',
    title: `New competitor: ${params.competitor_name}`,
    description: `Discovered via ${params.source.replace('_', ' ')}`,
    severity: 'info',
    action_available: ['expand_network', 'view_competitor', 'dismiss'],
    action_cost_credits: 2,
    related_competitor_id: params.competitor_id,
    data: {
      network: {
        competitor_name: params.competitor_name,
        competitor_domain: params.competitor_domain,
        prompts_found: 0,
        new_competitors_found: 0,
      },
    },
  })
}

/**
 * Emit an opportunity found event (W5)
 */
export async function emitOpportunityFound(params: {
  tenant_id: string
  brand_id: string
  topic: string
  related_queries: string[]
  competitor_coverage: boolean
  estimated_volume: string
}): Promise<string | null> {
  return emitFeedEvent({
    tenant_id: params.tenant_id,
    brand_id: params.brand_id,
    workflow: 'greenspace',
    event_type: 'opportunity_found',
    title: `Greenspace: "${params.topic}"`,
    description: params.competitor_coverage 
      ? `Competitors covering this - ${params.related_queries.length} related queries`
      : `Untapped topic - ${params.related_queries.length} related queries`,
    severity: params.competitor_coverage ? 'warning' : 'info',
    action_available: ['generate_memo', 'add_to_prompts', 'dismiss'],
    action_cost_credits: 3,
    data: {
      opportunity: {
        topic: params.topic,
        related_queries: params.related_queries,
        competitor_coverage: params.competitor_coverage,
        estimated_volume: params.estimated_volume,
      },
    },
  })
}

/**
 * Emit a credits low warning (system)
 */
export async function emitCreditsLow(params: {
  tenant_id: string
  brand_id: string
  credits_used: number
  credits_remaining: number
  credits_limit: number
  reset_date: string
}): Promise<string | null> {
  const percentUsed = Math.round((params.credits_used / params.credits_limit) * 100)
  
  return emitFeedEvent({
    tenant_id: params.tenant_id,
    brand_id: params.brand_id,
    workflow: 'system',
    event_type: 'credits_low',
    title: `${percentUsed}% of credits used`,
    description: `${params.credits_remaining} credits remaining - resets ${params.reset_date}`,
    severity: percentUsed >= 90 ? 'action_required' : 'warning',
    action_available: ['upgrade_plan', 'view_details'],
    action_cost_credits: 0,
    data: {
      system: {
        credits_used: params.credits_used,
        credits_remaining: params.credits_remaining,
        credits_limit: params.credits_limit,
        reset_date: params.reset_date,
      },
    },
  })
}

/**
 * Emit a prompt scanned event - individual feed item for each prompt scan
 */
export async function emitPromptScanned(params: {
  tenant_id: string
  brand_id: string
  query_id: string
  query_text: string
  model: string
  // Scan result
  cited: boolean
  mentioned: boolean
  position: number | null
  competitors_mentioned: string[]
  // Tracking data
  scan_number: number
  streak: number
  longest_streak: number
  is_first_citation: boolean
  is_citation_lost: boolean
  previous_cited: boolean | null
  position_change: number | null
  new_competitors: string[]
  // Context
  persona: string | null
  source_type: string
  winner_name: string | null
  first_cited_at: string | null
  citation_lost_at: string | null
}): Promise<string | null> {
  // Determine event type based on what happened
  let event_type: FeedEventType = 'prompt_scanned'
  let severity: FeedSeverity = 'info'
  let title: string
  let description: string
  
  const shortQuery = params.query_text.length > 50 
    ? params.query_text.slice(0, 47) + '...' 
    : params.query_text

  if (params.is_first_citation) {
    // BIG WIN - first time cited
    event_type = 'first_citation'
    severity = 'success'
    title = `🎉 First citation: "${shortQuery}"`
    description = `Brand now cited by ${params.model}! This is a major win.`
  } else if (params.is_citation_lost) {
    // OH NO - was cited, now isn't
    event_type = 'citation_lost'
    severity = 'action_required'
    title = `⚠️ Lost citation: "${shortQuery}"`
    description = params.winner_name 
      ? `${params.winner_name} is now winning this prompt`
      : `Brand no longer cited - content may need updating`
  } else if (params.streak > 0 && (params.streak === 3 || params.streak === 5 || params.streak === 10 || params.streak % 10 === 0)) {
    // Streak milestone
    event_type = 'streak_milestone'
    severity = 'success'
    title = `🔥 ${params.streak}x streak: "${shortQuery}"`
    description = `Cited ${params.streak} times in a row!`
  } else if (params.position_change && params.position_change > 0) {
    // Position improved
    event_type = 'position_improved'
    severity = 'success'
    title = `📈 Position improved: "${shortQuery}"`
    description = `Moved up ${params.position_change} position${params.position_change > 1 ? 's' : ''} to #${params.position}`
  } else if (params.new_competitors.length > 0) {
    // Found new competitor
    event_type = 'new_competitor_found'
    severity = 'info'
    title = `New competitor on: "${shortQuery}"`
    description = `Found: ${params.new_competitors.slice(0, 3).join(', ')}${params.new_competitors.length > 3 ? ` +${params.new_competitors.length - 3} more` : ''}`
  } else if (params.cited) {
    // Normal citation (good)
    title = `✓ Cited: "${shortQuery}"`
    description = params.streak > 1 
      ? `Scan #${params.scan_number} • ${params.streak}x streak`
      : `Scan #${params.scan_number} by ${params.model}`
  } else if (params.mentioned) {
    // Mentioned but not cited
    severity = 'warning'
    title = `Mentioned (not cited): "${shortQuery}"`
    description = `Scan #${params.scan_number} • Needs authoritative content`
  } else {
    // Gap - not mentioned or cited
    severity = 'warning'
    title = `Gap: "${shortQuery}"`
    description = params.winner_name 
      ? `${params.winner_name} winning • Scan #${params.scan_number}`
      : `Scan #${params.scan_number} • Content needed`
  }

  // Determine available actions based on status
  const actions: FeedAction[] = ['view_details', 'exclude_prompt']
  if (!params.cited) {
    actions.unshift('generate_memo')
  }

  return emitFeedEvent({
    tenant_id: params.tenant_id,
    brand_id: params.brand_id,
    workflow: 'core_discovery',
    event_type,
    title,
    description,
    severity,
    action_available: actions,
    action_cost_credits: params.cited ? 0 : 3, // Cost to generate memo if gap
    related_query_id: params.query_id,
    data: {
      prompt: {
        query_text: params.query_text,
        query_id: params.query_id,
        scan_number: params.scan_number,
        cited: params.cited,
        mentioned: params.mentioned,
        streak: params.streak,
        longest_streak: params.longest_streak,
        is_first_citation: params.is_first_citation,
        is_citation_lost: params.is_citation_lost,
        position: params.position,
        position_change: params.position_change,
        competitors_mentioned: params.competitors_mentioned,
        new_competitors: params.new_competitors,
        winner_name: params.winner_name,
        persona: params.persona,
        source_type: params.source_type,
        model: params.model,
        previous_cited: params.previous_cited,
        first_cited_at: params.first_cited_at,
        citation_lost_at: params.citation_lost_at,
      },
    },
  })
}

/**
 * Emit a prompt excluded event
 */
export async function emitPromptExcluded(params: {
  tenant_id: string
  brand_id: string
  query_id: string
  query_text: string
  reason: string
}): Promise<string | null> {
  return emitFeedEvent({
    tenant_id: params.tenant_id,
    brand_id: params.brand_id,
    workflow: 'system',
    event_type: 'prompt_excluded',
    title: `Prompt excluded: "${params.query_text.slice(0, 50)}..."`,
    description: `Reason: ${params.reason}`,
    severity: 'info',
    action_available: ['reenable_prompt'],
    action_cost_credits: 0,
    related_query_id: params.query_id,
    data: {
      prompt: {
        query_text: params.query_text,
        query_id: params.query_id,
        scan_number: 0,
        cited: false,
        mentioned: false,
        streak: 0,
        longest_streak: 0,
        is_first_citation: false,
        is_citation_lost: false,
        position: null,
        position_change: null,
        competitors_mentioned: [],
        new_competitors: [],
        winner_name: null,
        persona: null,
        source_type: 'manual',
        model: '',
        previous_cited: null,
        first_cited_at: null,
        citation_lost_at: null,
      },
    },
  })
}

/**
 * Mark a feed event as actioned
 */
export async function markFeedEventActioned(
  event_id: string, 
  action: FeedAction
): Promise<boolean> {
  const { error } = await supabase
    .from('feed_events')
    .update({
      action_taken: action,
      action_taken_at: new Date().toISOString(),
    })
    .eq('id', event_id)

  if (error) {
    console.error('Failed to mark feed event actioned:', error)
    return false
  }
  return true
}

/**
 * Mark feed events as read
 */
export async function markFeedEventsRead(event_ids: string[]): Promise<boolean> {
  const { error } = await supabase
    .from('feed_events')
    .update({ read: true })
    .in('id', event_ids)

  if (error) {
    console.error('Failed to mark feed events read:', error)
    return false
  }
  return true
}
