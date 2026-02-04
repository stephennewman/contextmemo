/**
 * Feed System Types
 * Types for the v2 feed-based UI
 */

// Workflow identifiers
export type FeedWorkflow = 
  | 'core_discovery'
  | 'network_expansion'
  | 'competitive_response'
  | 'verification'
  | 'greenspace'
  | 'system'

// Event severity levels
export type FeedSeverity = 
  | 'action_required'
  | 'success'
  | 'info'
  | 'warning'

// Event types by workflow
export type CoreDiscoveryEventType = 
  | 'gap_identified'
  | 'prompt_generated'
  | 'scan_complete'
  | 'context_extracted'
  | 'competitors_discovered'

export type NetworkExpansionEventType = 
  | 'competitor_discovered'
  | 'network_analyzed'
  | 'prompts_from_competitor'
  | 'partner_identified'

export type CompetitiveResponseEventType = 
  | 'competitor_published'
  | 'response_drafted'
  | 'response_published'
  | 'content_opportunity'

export type VerificationEventType = 
  | 'citation_verified'
  | 'mention_improved'
  | 'verification_failed'
  | 'verification_pending'

export type GreenspaceEventType = 
  | 'opportunity_found'
  | 'trend_detected'
  | 'adjacent_topic'
  | 'coverage_gap'

export type SystemEventType = 
  | 'limit_reached'
  | 'credits_low'
  | 'weekly_summary'
  | 'welcome'
  | 'setup_complete'

// Prompt-level event types (per-prompt scan results)
export type PromptEventType =
  | 'prompt_scanned'       // Every scan
  | 'first_citation'       // BIG WIN - first time brand was cited
  | 'citation_lost'        // OH NO - brand was cited but now isn't
  | 'streak_milestone'     // 3, 5, 10 citations in a row
  | 'position_improved'    // Moved up in ranking
  | 'new_competitor_found' // Found new competitor on this prompt
  | 'prompt_excluded'      // User excluded this prompt

export type FeedEventType = 
  | CoreDiscoveryEventType
  | NetworkExpansionEventType
  | CompetitiveResponseEventType
  | VerificationEventType
  | GreenspaceEventType
  | SystemEventType
  | PromptEventType

// Available actions on feed items
export type FeedAction = 
  | 'generate_memo'
  | 'dismiss'
  | 'expand_network'
  | 'view_details'
  | 'view_scan'
  | 'view_memo'
  | 'view_competitor'
  | 'add_to_prompts'
  | 'upgrade_plan'
  | 'mark_reviewed'
  | 'retry_verification'
  | 'push_to_hubspot'
  | 'exclude_prompt'
  | 'reenable_prompt'

// Feed event database row
export interface FeedEvent {
  id: string
  tenant_id: string
  brand_id: string
  workflow: FeedWorkflow
  event_type: FeedEventType
  title: string
  description: string | null
  severity: FeedSeverity
  action_available: FeedAction[] | null
  action_cost_credits: number
  action_taken: FeedAction | null
  action_taken_at: string | null
  related_query_id: string | null
  related_memo_id: string | null
  related_competitor_id: string | null
  related_scan_id: string | null
  data: FeedEventData
  read: boolean
  dismissed: boolean
  pinned: boolean
  created_at: string
  updated_at: string
}

// Flexible data payload - varies by event type
export interface FeedEventData {
  // Gap identified (W1)
  gap?: {
    query_text: string
    visibility_rate: number
    winner_name?: string
    winner_domain?: string
    winner_citation_url?: string
    models_checked: string[]
  }
  
  // Citation verified (W4)
  verification?: {
    memo_title: string
    memo_slug: string
    time_to_citation_hours: number
    citing_models: string[]
    citation_rate: number
  }
  
  // Competitor content (W3)
  competitor_content?: {
    competitor_name: string
    article_title: string
    article_url: string
    relevance_score: number
    matched_prompts: string[]
  }
  
  // Network expansion (W2)
  network?: {
    competitor_name: string
    competitor_domain: string
    prompts_found: number
    new_competitors_found: number
  }
  
  // Greenspace (W5)
  opportunity?: {
    topic: string
    related_queries: string[]
    competitor_coverage: boolean
    estimated_volume: string
  }
  
  // Scan summary
  scan?: {
    prompts_scanned: number
    citation_rate: number
    mention_rate: number
    gaps_found: number
    models_used: string[]
  }
  
  // System events
  system?: {
    credits_used: number
    credits_remaining: number
    credits_limit: number
    reset_date: string
  }
  
  // Prompt-level scan result
  prompt?: {
    query_text: string
    query_id: string
    scan_number: number           // "Scan #47"
    cited: boolean
    mentioned: boolean
    streak: number
    longest_streak: number
    is_first_citation: boolean
    is_citation_lost: boolean
    position: number | null
    position_change: number | null
    competitors_mentioned: string[]
    new_competitors: string[]
    winner_name: string | null
    persona: string | null
    source_type: string
    model: string
    previous_cited: boolean | null
    first_cited_at: string | null
    citation_lost_at: string | null
  }
  
  // Generic key-value for extensibility
  [key: string]: unknown
}

// Brand settings for workflow automation
export interface BrandSettings {
  brand_id: string
  
  // W1: Core Discovery
  auto_scan_enabled: boolean
  daily_scan_cap: number
  
  // W2: Network Expansion
  auto_expand_network: boolean
  max_competitors_to_expand: number
  
  // W3: Competitive Response
  auto_respond_content: boolean
  content_response_threshold: 'all' | 'high' | 'critical'
  
  // W4: Verification
  auto_verify_citations: boolean
  verification_retry_days: number
  
  // W5: Greenspace
  weekly_greenspace_enabled: boolean
  greenspace_day_of_week: number
  
  // Memo generation
  auto_memo_enabled: boolean
  daily_memo_cap: number
  memo_approval_required: boolean
  
  // Cost controls
  monthly_credit_cap: number | null
  alert_at_percent: number
  pause_at_cap: boolean
  
  // Notifications
  notify_on_gaps: boolean
  notify_on_verifications: boolean
  notify_on_competitor_content: boolean
  notify_on_opportunities: boolean
  notification_frequency: 'realtime' | 'daily_digest' | 'weekly_digest'
  
  created_at: string
  updated_at: string
}

// Usage summary returned from API
export interface UsageSummary {
  credits_used: number
  credits_limit: number
  credits_remaining: number
  percent_used: number
  reset_date: string
  by_workflow: Record<FeedWorkflow, number>
  by_event_type: Record<string, number>
}

// Feed query params
export interface FeedQueryParams {
  brand_id?: string
  cursor?: string
  limit?: number
  workflow?: FeedWorkflow | 'all'
  severity?: FeedSeverity | 'all'
  unread_only?: boolean
  include_dismissed?: boolean
}

// Feed API response
export interface FeedResponse {
  items: FeedEvent[]
  next_cursor: string | null
  has_more: boolean
  unread_count: number
  total_count: number
}

// Workflow metadata for UI
export interface WorkflowMeta {
  id: FeedWorkflow
  name: string
  shortName: string
  description: string
  icon: string // lucide icon name
  color: string // tailwind color
  defaultEnabled: boolean
  avgCreditsPerEvent: number
}

export const WORKFLOW_META: Record<FeedWorkflow, WorkflowMeta> = {
  core_discovery: {
    id: 'core_discovery',
    name: 'Core Discovery',
    shortName: 'Discovery',
    description: 'Daily scans, gap identification, and prompt generation',
    icon: 'Search',
    color: 'blue',
    defaultEnabled: true,
    avgCreditsPerEvent: 1,
  },
  network_expansion: {
    id: 'network_expansion',
    name: 'Network Expansion',
    shortName: 'Expand',
    description: 'Analyze competitors to discover new prompts and gaps',
    icon: 'Network',
    color: 'purple',
    defaultEnabled: false,
    avgCreditsPerEvent: 2,
  },
  competitive_response: {
    id: 'competitive_response',
    name: 'Competitive Response',
    shortName: 'Compete',
    description: 'Monitor competitor content and generate responses',
    icon: 'Swords',
    color: 'orange',
    defaultEnabled: false,
    avgCreditsPerEvent: 3,
  },
  verification: {
    id: 'verification',
    name: 'Verification Loop',
    shortName: 'Verify',
    description: 'Track citation status of published memos',
    icon: 'CheckCircle',
    color: 'green',
    defaultEnabled: true,
    avgCreditsPerEvent: 0,
  },
  greenspace: {
    id: 'greenspace',
    name: 'Greenspace Discovery',
    shortName: 'Greenspace',
    description: 'Find new content opportunities not yet covered',
    icon: 'Sparkles',
    color: 'emerald',
    defaultEnabled: false,
    avgCreditsPerEvent: 2,
  },
  system: {
    id: 'system',
    name: 'System',
    shortName: 'System',
    description: 'Usage alerts and system notifications',
    icon: 'Bell',
    color: 'gray',
    defaultEnabled: true,
    avgCreditsPerEvent: 0,
  },
}

// Credit costs for actions
export const ACTION_CREDITS: Record<FeedAction, number> = {
  generate_memo: 3,
  dismiss: 0,
  expand_network: 2,
  view_details: 0,
  view_scan: 0,
  view_memo: 0,
  view_competitor: 0,
  add_to_prompts: 0,
  upgrade_plan: 0,
  mark_reviewed: 0,
  retry_verification: 1,
  push_to_hubspot: 0,
  exclude_prompt: 0,
  reenable_prompt: 0,
}
