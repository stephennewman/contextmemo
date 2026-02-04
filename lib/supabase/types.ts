export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Query/Prompt tracking types
export type QueryStatus = 'never_scanned' | 'gap' | 'cited' | 'lost_citation'
export type QuerySourceType = 'original' | 'expanded' | 'competitor_inspired' | 'greenspace' | 'manual' | 'auto'
export type QueryExcludedReason = 'irrelevant' | 'duplicate' | 'low_value' | 'other' | 'manual'

// Perplexity search result structure for citations (stored as JSONB)
export interface PerplexitySearchResultJson {
  url: string
  title: string | null
  date: string | null
  snippet: string | null
}

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          email: string
          email_domain: string
          name: string | null
          plan: string
          stripe_customer_id: string | null
          created_at: string
          last_login_at: string | null
        }
        Insert: {
          id?: string
          email: string
          email_domain: string
          name?: string | null
          plan?: string
          stripe_customer_id?: string | null
          created_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          email_domain?: string
          name?: string | null
          plan?: string
          stripe_customer_id?: string | null
          created_at?: string
          last_login_at?: string | null
        }
      }
      brands: {
        Row: {
          id: string
          tenant_id: string
          name: string
          domain: string
          subdomain: string
          verified: boolean
          verification_method: string | null
          verified_at: string | null
          context: BrandContext
          context_extracted_at: string | null
          context_edited_at: string | null
          auto_publish: boolean
          visibility_score: number | null
          last_scan_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          domain: string
          subdomain: string
          verified?: boolean
          verification_method?: string | null
          verified_at?: string | null
          context?: BrandContext
          context_extracted_at?: string | null
          context_edited_at?: string | null
          auto_publish?: boolean
          visibility_score?: number | null
          last_scan_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          domain?: string
          subdomain?: string
          verified?: boolean
          verification_method?: string | null
          verified_at?: string | null
          context?: BrandContext
          context_extracted_at?: string | null
          context_edited_at?: string | null
          auto_publish?: boolean
          visibility_score?: number | null
          last_scan_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      competitors: {
        Row: {
          id: string
          brand_id: string
          name: string
          domain: string | null
          description: string | null
          context: Json
          context_extracted_at: string | null
          auto_discovered: boolean
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          name: string
          domain?: string | null
          description?: string | null
          context?: Json
          context_extracted_at?: string | null
          auto_discovered?: boolean
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          name?: string
          domain?: string | null
          description?: string | null
          context?: Json
          context_extracted_at?: string | null
          auto_discovered?: boolean
          is_active?: boolean
          created_at?: string
        }
      }
      queries: {
        Row: {
          id: string
          brand_id: string
          query_text: string
          query_type: string | null
          related_competitor_id: string | null
          priority: number
          is_active: boolean
          auto_discovered: boolean
          created_at: string
          persona: PromptPersona | null
          // Tracking fields
          scan_count: number
          last_scanned_at: string | null
          first_cited_at: string | null
          last_cited_at: string | null
          citation_lost_at: string | null
          citation_streak: number
          longest_streak: number
          current_status: QueryStatus
          // Origin tracking
          source_type: QuerySourceType
          source_batch_id: string | null
          inspired_by_competitor_id: string | null
          // Exclusion tracking
          excluded_at: string | null
          excluded_reason: QueryExcludedReason | null
        }
        Insert: {
          id?: string
          brand_id: string
          query_text: string
          query_type?: string | null
          related_competitor_id?: string | null
          priority?: number
          is_active?: boolean
          auto_discovered?: boolean
          created_at?: string
          persona?: PromptPersona | null
          // Tracking fields
          scan_count?: number
          last_scanned_at?: string | null
          first_cited_at?: string | null
          last_cited_at?: string | null
          citation_lost_at?: string | null
          citation_streak?: number
          longest_streak?: number
          current_status?: QueryStatus
          // Origin tracking
          source_type?: QuerySourceType
          source_batch_id?: string | null
          inspired_by_competitor_id?: string | null
          // Exclusion tracking
          excluded_at?: string | null
          excluded_reason?: QueryExcludedReason | null
        }
        Update: {
          id?: string
          brand_id?: string
          query_text?: string
          query_type?: string | null
          related_competitor_id?: string | null
          priority?: number
          is_active?: boolean
          auto_discovered?: boolean
          created_at?: string
          persona?: PromptPersona | null
          // Tracking fields
          scan_count?: number
          last_scanned_at?: string | null
          first_cited_at?: string | null
          last_cited_at?: string | null
          citation_lost_at?: string | null
          citation_streak?: number
          longest_streak?: number
          current_status?: QueryStatus
          // Origin tracking
          source_type?: QuerySourceType
          source_batch_id?: string | null
          inspired_by_competitor_id?: string | null
          // Exclusion tracking
          excluded_at?: string | null
          excluded_reason?: QueryExcludedReason | null
        }
      }
      scan_results: {
        Row: {
          id: string
          brand_id: string
          query_id: string
          model: string
          response_text: string | null
          brand_mentioned: boolean
          brand_position: number | null
          brand_context: string | null
          competitors_mentioned: string[] | null
          // Perplexity citation fields
          citations: string[] | null
          search_results: PerplexitySearchResultJson[] | null
          brand_in_citations: boolean | null
          scanned_at: string
          // Delta tracking fields
          is_first_citation: boolean
          citation_status_changed: boolean
          previous_cited: boolean | null
          new_competitors_found: string[] | null
          position_change: number | null
        }
        Insert: {
          id?: string
          brand_id: string
          query_id: string
          model: string
          response_text?: string | null
          brand_mentioned: boolean
          brand_position?: number | null
          brand_context?: string | null
          competitors_mentioned?: string[] | null
          // Perplexity citation fields
          citations?: string[] | null
          search_results?: PerplexitySearchResultJson[] | null
          brand_in_citations?: boolean | null
          scanned_at?: string
          // Delta tracking fields
          is_first_citation?: boolean
          citation_status_changed?: boolean
          previous_cited?: boolean | null
          new_competitors_found?: string[] | null
          position_change?: number | null
        }
        Update: {
          id?: string
          brand_id?: string
          query_id?: string
          model?: string
          response_text?: string | null
          brand_mentioned?: boolean
          brand_position?: number | null
          brand_context?: string | null
          competitors_mentioned?: string[] | null
          // Perplexity citation fields
          citations?: string[] | null
          search_results?: PerplexitySearchResultJson[] | null
          brand_in_citations?: boolean | null
          scanned_at?: string
          // Delta tracking fields
          is_first_citation?: boolean
          citation_status_changed?: boolean
          previous_cited?: boolean | null
          new_competitors_found?: string[] | null
          position_change?: number | null
        }
      }
      memos: {
        Row: {
          id: string
          brand_id: string
          source_query_id: string | null
          source_competitor_content_id: string | null
          memo_type: string
          slug: string
          title: string
          content_markdown: string
          content_html: string | null
          meta_description: string | null
          schema_json: Json | null
          sources: Json | null
          status: string
          published_at: string | null
          last_verified_at: string | null
          verified_accurate: boolean
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          source_query_id?: string | null
          source_competitor_content_id?: string | null
          memo_type: string
          slug: string
          title: string
          content_markdown: string
          content_html?: string | null
          meta_description?: string | null
          schema_json?: Json | null
          sources?: Json | null
          status?: string
          published_at?: string | null
          last_verified_at?: string | null
          verified_accurate?: boolean
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          source_query_id?: string | null
          source_competitor_content_id?: string | null
          memo_type?: string
          slug?: string
          title?: string
          content_markdown?: string
          content_html?: string | null
          meta_description?: string | null
          schema_json?: Json | null
          sources?: Json | null
          status?: string
          published_at?: string | null
          last_verified_at?: string | null
          verified_accurate?: boolean
          version?: number
          created_at?: string
          updated_at?: string
        }
      }
      memo_versions: {
        Row: {
          id: string
          memo_id: string
          version: number
          content_markdown: string
          change_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          memo_id: string
          version: number
          content_markdown: string
          change_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          memo_id?: string
          version?: number
          content_markdown?: string
          change_reason?: string | null
          created_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          brand_id: string
          alert_type: string
          title: string
          message: string | null
          data: Json | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          alert_type: string
          title: string
          message?: string | null
          data?: Json | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          alert_type?: string
          title?: string
          message?: string | null
          data?: Json | null
          read?: boolean
          created_at?: string
        }
      }
      visibility_history: {
        Row: {
          id: string
          brand_id: string
          visibility_score: number
          total_scans: number
          brand_mentions: number
          top_competitors_mentioned: Json
          recorded_date: string
          recorded_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          visibility_score: number
          total_scans?: number
          brand_mentions?: number
          top_competitors_mentioned?: Json
          recorded_date?: string
          recorded_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          visibility_score?: number
          total_scans?: number
          brand_mentions?: number
          top_competitors_mentioned?: Json
          recorded_date?: string
          recorded_at?: string
        }
      }
      search_console_stats: {
        Row: {
          id: string
          brand_id: string
          provider: string
          query: string
          page_url: string | null
          impressions: number
          clicks: number
          position: number | null
          ctr: number | null
          date: string
          synced_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          provider: string
          query: string
          page_url?: string | null
          impressions?: number
          clicks?: number
          position?: number | null
          ctr?: number | null
          date: string
          synced_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          provider?: string
          query?: string
          page_url?: string | null
          impressions?: number
          clicks?: number
          position?: number | null
          ctr?: number | null
          date?: string
          synced_at?: string
        }
      }
      competitor_content: {
        Row: {
          id: string
          competitor_id: string
          url: string
          title: string
          content_hash: string
          content_summary: string | null
          topics: string[] | null
          content_type: string | null
          is_competitor_specific: boolean
          universal_topic: string | null
          relevance_score: number | null
          first_seen_at: string
          response_memo_id: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          competitor_id: string
          url: string
          title: string
          content_hash: string
          content_summary?: string | null
          topics?: string[] | null
          content_type?: string | null
          is_competitor_specific?: boolean
          universal_topic?: string | null
          relevance_score?: number | null
          first_seen_at?: string
          response_memo_id?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          competitor_id?: string
          url?: string
          title?: string
          content_hash?: string
          content_summary?: string | null
          topics?: string[] | null
          content_type?: string | null
          is_competitor_specific?: boolean
          universal_topic?: string | null
          relevance_score?: number | null
          first_seen_at?: string
          response_memo_id?: string | null
          status?: string
          created_at?: string
        }
      }
    }
  }
}

// HubSpot integration configuration
export interface HubSpotConfig {
  enabled: boolean
  access_token?: string
  refresh_token?: string
  expires_at?: string
  blog_id?: string  // content_group_id in HubSpot
  auto_sync?: boolean  // Auto-push content to HubSpot
  auto_publish?: boolean  // Publish immediately vs create as draft
  // OAuth connection metadata
  connected_at?: string
  connected_by?: string
  disconnected_at?: string
  disconnected_by?: string
  disconnect_reason?: string
  last_refreshed_at?: string
  // Available blogs from HubSpot
  available_blogs?: Array<{ id: string; name: string; slug?: string }>
}

// Search Console integrations (Bing + Google)
export interface BingWebmasterConfig {
  enabled?: boolean
  api_key?: string
  site_url?: string  // The verified site URL in Bing Webmaster
  last_synced_at?: string
}

export interface GoogleSearchConsoleConfig {
  enabled?: boolean
  access_token?: string
  refresh_token?: string
  token_expiry?: string
  site_url?: string  // The property URL in GSC (e.g., sc-domain:example.com)
  connected_at?: string
  last_synced_at?: string
}

export interface SearchConsoleConfig {
  bing?: BingWebmasterConfig
  google?: GoogleSearchConsoleConfig
}

// Brand tone configuration for content generation
export interface BrandTone {
  // How the brand "speaks" - its character and personality
  personality?: 'friendly' | 'authoritative' | 'innovative' | 'approachable' | 'bold' | 'trustworthy'
  
  // Writing register / how formal the content should be
  formality?: 'formal' | 'professional' | 'conversational' | 'casual'
  
  // Target audience's assumed technical knowledge level
  technical_level?: 'beginner' | 'intermediate' | 'expert'
  
  // Primary audience persona the content targets
  audience_type?: 'enterprise_buyers' | 'developers' | 'small_business' | 'consumers' | 'technical_decision_makers'
  
  // How content is structured and presented
  writing_style?: 'concise' | 'detailed' | 'storytelling' | 'data_driven'
  
  // Whether to use industry-specific terminology
  jargon_usage?: 'avoid' | 'moderate' | 'embrace'
  
  // Custom tone notes - free text for additional guidance
  custom_notes?: string
}

// Seniority levels for personas
export type PersonaSeniority = 'executive' | 'manager' | 'specialist'

// Seniority level descriptions for UI
export const SENIORITY_LABELS: Record<PersonaSeniority, string> = {
  executive: 'Executive (C-level, VP)',
  manager: 'Manager (Director, Team Lead)',
  specialist: 'Specialist (IC, Entry-level)',
}

// Target persona - flexible, brand-specific buyer profile
// No predefined buckets - each is unique to the brand
export interface TargetPersona {
  id: string                    // auto-generated slug (e.g., "vp_marketing")
  title: string                 // Job title (e.g., "VP of Marketing", "Sales Manager")
  seniority: PersonaSeniority   // Executive, Manager, or Specialist
  function: string              // Department/function (e.g., "Marketing", "Sales", "Operations")
  description: string           // Who this persona is and what they do
  phrasing_style: string        // How they phrase AI questions
  priorities: string[]          // What they care about when evaluating solutions
  detected_from?: string        // What website signal indicated this (for auto-detected)
  is_auto_detected: boolean     // Was this auto-detected vs manually added
}

// Backward compatibility: PromptPersona can be a persona ID string
export type PromptPersona = string

// Legacy CustomPersona type - kept for migration compatibility
// @deprecated Use TargetPersona instead
export interface CustomPersona {
  id: string
  name: string
  description: string
  phrasing_style: string
  priorities: string[]
  detected_from: string
}

// Social links for sameAs references
export interface SocialLinks {
  linkedin?: string
  twitter?: string
  crunchbase?: string
  wikipedia?: string
  github?: string
  facebook?: string
  youtube?: string
}

// Prompt theme - keyword cluster for targeting
export interface PromptTheme {
  theme: string           // 1-3 word keyword phrase (e.g., "temperature monitoring")
  priority: 'high' | 'medium' | 'low'
  category?: string       // Optional category (e.g., "product", "use_case", "industry")
  auto_detected?: boolean // Was this auto-detected vs manually added
}

// Brand context structure
export interface BrandContext {
  company_name?: string
  founded?: string
  headquarters?: string
  description?: string
  products?: string[]
  markets?: string[]
  features?: string[]
  certifications?: string[]
  customers?: string[]
  // Deprecated: use brand_tone instead
  brand_voice?: 'professional' | 'casual' | 'technical'
  // New comprehensive tone settings
  brand_tone?: BrandTone
  // Integration configurations
  hubspot?: HubSpotConfig
  search_console?: SearchConsoleConfig
  // Raw homepage content for intent-based query generation
  homepage_content?: string
  // Extracted user intents/pain points from homepage
  user_intents?: UserIntent[]
  // Social links for Schema.org sameAs references
  social_links?: SocialLinks
  // Target personas - flexible buyer profiles unique to this brand
  // Each has seniority (executive/manager/specialist) + function (marketing/sales/etc.)
  personas?: TargetPersona[]
  // Personas that have been manually disabled (won't generate prompts)
  disabled_personas?: string[]
  // @deprecated Legacy fields - kept for migration compatibility
  target_personas?: PromptPersona[]
  custom_personas?: CustomPersona[]
  // Primary and secondary offers/CTAs
  offers?: BrandOffers
  // Critical prompt themes - keyword clusters to focus on
  prompt_themes?: PromptTheme[]
}

// Brand offers/CTAs extracted from website
export interface BrandOffer {
  type: 'demo' | 'trial' | 'freemium' | 'contact_sales' | 'signup' | 'download' | 'quote' | 'consultation' | 'other'
  label: string           // The CTA text (e.g., "Book a Demo", "Start Free Trial")
  url?: string            // Link to the offer page
  details?: string        // Additional context (e.g., "14-day free trial", "No credit card required")
}

export interface BrandOffers {
  primary?: BrandOffer    // Main CTA (most prominent)
  secondary?: BrandOffer  // Secondary CTA
  pricing_model?: 'free' | 'freemium' | 'paid' | 'enterprise' | 'contact_sales' | 'custom'
  pricing_url?: string    // Link to pricing page
}

// User intent extracted from homepage content
export interface UserIntent {
  pain_point: string  // The problem the user is experiencing
  desired_outcome: string  // What they want to achieve
  trigger_phrase: string  // How they'd describe it to an AI
}

// Organization types for teams/multi-user
export interface Organization {
  id: string
  name: string
  slug: string
  owner_id: string
  plan: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan_limits: {
    prompts: number
    memos_per_month: number
    brands: number
    seats: number // -1 = unlimited
  }
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  invited_by: string | null
  invited_at: string | null
  joined_at: string
  created_at: string
}

export interface OrganizationInvite {
  id: string
  organization_id: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

// Role permissions
export const ROLE_PERMISSIONS = {
  owner: ['read', 'write', 'delete', 'manage_members', 'manage_billing', 'transfer_ownership'],
  admin: ['read', 'write', 'delete', 'manage_members'],
  member: ['read', 'write'],
  viewer: ['read'],
} as const

export type OrgRole = keyof typeof ROLE_PERMISSIONS
export type Permission = typeof ROLE_PERMISSIONS[OrgRole][number]

export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission as never)
}

// Helper types
export type Tenant = Database['public']['Tables']['tenants']['Row']
export type Brand = Database['public']['Tables']['brands']['Row']
export type Competitor = Database['public']['Tables']['competitors']['Row']
export type Query = Database['public']['Tables']['queries']['Row']
export type Prompt = Database['public']['Tables']['queries']['Row'] // Alias: prompts are stored in queries table
export type ScanResult = Database['public']['Tables']['scan_results']['Row']
export type Memo = Database['public']['Tables']['memos']['Row']
export type MemoVersion = Database['public']['Tables']['memo_versions']['Row']
export type Alert = Database['public']['Tables']['alerts']['Row']
export type VisibilityHistory = Database['public']['Tables']['visibility_history']['Row']
export type CompetitorContent = Database['public']['Tables']['competitor_content']['Row']
export type SearchConsoleStat = Database['public']['Tables']['search_console_stats']['Row']

// =============================================================================
// Voice Insights - Verified Human Primary Sources
// =============================================================================

// Topics for voice insights
export type VoiceInsightTopic = 
  | 'market_position'       // How the brand positions in the market
  | 'concept_definition'    // Defining industry terms/concepts
  | 'product_insight'       // Product-specific knowledge
  | 'competitive_advantage' // What makes us different
  | 'customer_context'      // Who we serve and why
  | 'industry_expertise'    // Domain expertise
  | 'other'

export const VOICE_INSIGHT_TOPIC_LABELS: Record<VoiceInsightTopic, string> = {
  market_position: 'Market Position',
  concept_definition: 'Concept Definition',
  product_insight: 'Product Insight',
  competitive_advantage: 'Competitive Advantage',
  customer_context: 'Customer Context',
  industry_expertise: 'Industry Expertise',
  other: 'Other',
}

export const VOICE_INSIGHT_TOPIC_DESCRIPTIONS: Record<VoiceInsightTopic, string> = {
  market_position: 'How your brand positions in the market, target segments, and competitive landscape',
  concept_definition: 'Define industry terms or concepts your brand wants to own (e.g., "predictive operations")',
  product_insight: 'Product-specific knowledge, features, and capabilities',
  competitive_advantage: 'What makes your brand different from competitors',
  customer_context: 'Who you serve, their pain points, and why they choose you',
  industry_expertise: 'Domain expertise and thought leadership',
  other: 'Other insights that don\'t fit the categories above',
}

// Geolocation data for verification
export interface VoiceInsightGeolocation {
  lat?: number
  lng?: number
  city?: string
  region?: string
  country?: string
  timezone?: string
}

// Voice insight - verified human primary source
export interface VoiceInsight {
  id: string
  brand_id: string
  tenant_id: string
  
  // Content
  title: string
  transcript: string
  topic: VoiceInsightTopic
  tags: string[]
  
  // Audio (optional)
  audio_url?: string
  audio_duration_seconds?: number
  
  // Verification metadata - the credibility stack
  recorded_at: string
  recorded_by_user_id?: string
  recorded_by_name: string
  recorded_by_title?: string
  recorded_by_email?: string
  recorded_by_linkedin_url?: string
  
  // Location verification
  ip_address?: string
  geolocation?: VoiceInsightGeolocation
  
  // Usage tracking
  cited_in_memos: string[]
  citation_count: number
  
  // Status
  status: 'active' | 'archived' | 'draft'
  
  created_at: string
  updated_at: string
}

// Format a voice insight as a citable quote
export function formatVoiceInsightCitation(insight: VoiceInsight): string {
  const date = new Date(insight.recorded_at)
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
  
  let attribution = insight.recorded_by_name
  if (insight.recorded_by_title) {
    attribution += `, ${insight.recorded_by_title}`
  }
  
  let location = ''
  if (insight.geolocation?.city && insight.geolocation?.region) {
    location = ` (${insight.geolocation.city}, ${insight.geolocation.region})`
  }
  
  return `— ${attribution}${location}, ${formattedDate} at ${formattedTime}`
}

// Competitor feed tracking for RSS/blog monitoring
export interface CompetitorFeed {
  id: string
  competitor_id: string
  feed_url: string
  feed_type: 'rss' | 'atom' | 'blog_index' | 'sitemap'
  title: string | null
  description: string | null
  is_active: boolean
  is_manually_added: boolean
  last_checked_at: string | null
  last_successful_at: string | null
  last_etag: string | null
  last_modified: string | null
  last_build_date: string | null
  total_items_found: number
  check_failures: number
  last_error: string | null
  last_error_at: string | null
  discovered_at: string
  created_at: string
  updated_at: string
}

// Extended competitor content with new fields
export interface CompetitorContentExtended extends CompetitorContent {
  published_at?: string | null
  source_feed_id?: string | null
  author?: string | null
  word_count?: number | null
  full_content?: string | null
}

// AI Traffic tracking - detect visits from AI platforms
export interface AITrafficEvent {
  id?: string
  brand_id: string
  memo_id?: string | null
  page_url: string
  referrer: string | null
  referrer_source: AIReferrerSource
  user_agent: string | null
  country?: string | null
  timestamp: string
}

// Known AI referrer sources
export type AIReferrerSource = 
  | 'chatgpt'      // chat.openai.com
  | 'perplexity'   // perplexity.ai
  | 'claude'       // claude.ai
  | 'gemini'       // gemini.google.com
  | 'copilot'      // copilot.microsoft.com
  | 'meta_ai'      // meta.ai
  | 'poe'          // poe.com
  | 'you'          // you.com
  | 'phind'        // phind.com
  | 'direct'       // No referrer but AI user agent
  | 'unknown_ai'   // AI-like patterns
  | 'organic'      // Regular search/social
  | 'direct_nav'   // Direct navigation

// Helper to detect AI source from referrer/UA
export function detectAISource(referrer: string | null, userAgent: string | null): AIReferrerSource {
  const ref = referrer?.toLowerCase() || ''
  const ua = userAgent?.toLowerCase() || ''
  
  // Check referrer first
  if (ref.includes('chat.openai.com') || ref.includes('chatgpt.com')) return 'chatgpt'
  if (ref.includes('perplexity.ai')) return 'perplexity'
  if (ref.includes('claude.ai')) return 'claude'
  if (ref.includes('gemini.google.com') || ref.includes('bard.google.com')) return 'gemini'
  if (ref.includes('copilot.microsoft.com') || ref.includes('bing.com/chat')) return 'copilot'
  if (ref.includes('meta.ai') || ref.includes('facebook.com/ai')) return 'meta_ai'
  if (ref.includes('poe.com')) return 'poe'
  if (ref.includes('you.com')) return 'you'
  if (ref.includes('phind.com')) return 'phind'
  
  // Check user agent for AI bot patterns
  if (ua.includes('chatgpt') || ua.includes('openai')) return 'chatgpt'
  if (ua.includes('perplexitybot') || ua.includes('perplexity')) return 'perplexity'
  if (ua.includes('anthropic') || ua.includes('claude')) return 'claude'
  if (ua.includes('google-extended') || ua.includes('gemini')) return 'gemini'
  if (ua.includes('bingbot') && ua.includes('ai')) return 'copilot'
  
  // Check for AI-like patterns in referrer
  if (ref.includes('ai.') || ref.includes('/ai/') || ref.includes('chat.')) return 'unknown_ai'
  
  // Organic sources
  if (ref.includes('google.') || ref.includes('bing.') || ref.includes('duckduckgo')) return 'organic'
  if (ref.includes('twitter.') || ref.includes('linkedin.') || ref.includes('facebook.')) return 'organic'
  
  // No referrer = direct navigation
  if (!ref || ref === '') return 'direct_nav'
  
  return 'organic'
}

// AI source display names
export const AI_SOURCE_LABELS: Record<AIReferrerSource, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  claude: 'Claude',
  gemini: 'Gemini',
  copilot: 'Microsoft Copilot',
  meta_ai: 'Meta AI',
  poe: 'Poe',
  you: 'You.com',
  phind: 'Phind',
  direct: 'Direct (AI UA)',
  unknown_ai: 'Unknown AI',
  organic: 'Organic Search/Social',
  direct_nav: 'Direct Navigation',
}

// AI source colors for charts
export const AI_SOURCE_COLORS: Record<AIReferrerSource, string> = {
  chatgpt: '#10B981',
  perplexity: '#8B5CF6',
  claude: '#F97316',
  gemini: '#3B82F6',
  copilot: '#0EA5E9',
  meta_ai: '#1877F2',
  poe: '#7C3AED',
  you: '#EC4899',
  phind: '#14B8A6',
  direct: '#6B7280',
  unknown_ai: '#9CA3AF',
  organic: '#D1D5DB',
  direct_nav: '#E5E7EB',
}

// =============================================================================
// Activity Feed Types
// =============================================================================

// Activity categories for grouping
export type ActivityCategory = 'scan' | 'content' | 'discovery' | 'traffic' | 'system'

// Specific activity types
export type ActivityType =
  // Scans
  | 'scan_started'
  | 'scan_completed'
  | 'scan_failed'
  | 'ai_overview_scanned'
  // Content
  | 'memo_generated'
  | 'memo_published'
  | 'memo_updated'
  | 'context_extracted'
  // Discovery
  | 'competitor_discovered'
  | 'query_generated'
  | 'competitor_content_found'
  | 'discovery_scan_completed'
  // Traffic
  | 'ai_traffic_detected'
  // System
  | 'daily_run_completed'
  | 'search_console_synced'
  | 'brand_created'
  | 'brand_verified'
  | 'error'

// Activity log entry
export interface ActivityLogEntry {
  id: string
  brand_id: string
  tenant_id: string
  activity_type: ActivityType
  category: ActivityCategory
  title: string
  description: string | null
  icon: string | null
  link_url: string | null
  link_label: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// Activity filter options
export interface ActivityFilters {
  categories?: ActivityCategory[]
  activity_types?: ActivityType[]
  brand_ids?: string[]
  start_date?: string
  end_date?: string
}

// Saved view
export interface ActivitySavedView {
  id: string
  tenant_id: string
  name: string
  filters: ActivityFilters
  is_default: boolean
  created_at: string
  updated_at: string
}

// Activity type metadata for UI
export const ACTIVITY_TYPE_META: Record<ActivityType, {
  label: string
  icon: string
  color: string
  category: ActivityCategory
}> = {
  // Scans
  scan_started: { label: 'Scan Started', icon: 'Play', color: '#0EA5E9', category: 'scan' },
  scan_completed: { label: 'Scan Complete', icon: 'CheckCircle', color: '#10B981', category: 'scan' },
  scan_failed: { label: 'Scan Failed', icon: 'XCircle', color: '#EF4444', category: 'scan' },
  ai_overview_scanned: { label: 'AI Overview Scanned', icon: 'Eye', color: '#8B5CF6', category: 'scan' },
  // Content
  memo_generated: { label: 'Memo Generated', icon: 'FileText', color: '#8B5CF6', category: 'content' },
  memo_published: { label: 'Memo Published', icon: 'Globe', color: '#10B981', category: 'content' },
  memo_updated: { label: 'Memo Updated', icon: 'RefreshCw', color: '#F59E0B', category: 'content' },
  context_extracted: { label: 'Context Extracted', icon: 'Database', color: '#0EA5E9', category: 'content' },
  // Discovery
  competitor_discovered: { label: 'Competitor Found', icon: 'Users', color: '#F97316', category: 'discovery' },
  query_generated: { label: 'Query Generated', icon: 'Search', color: '#10B981', category: 'discovery' },
  competitor_content_found: { label: 'Competitor Content', icon: 'Newspaper', color: '#F59E0B', category: 'discovery' },
  discovery_scan_completed: { label: 'Discovery Complete', icon: 'Compass', color: '#8B5CF6', category: 'discovery' },
  // Traffic
  ai_traffic_detected: { label: 'AI Traffic', icon: 'Zap', color: '#0EA5E9', category: 'traffic' },
  // System
  daily_run_completed: { label: 'Daily Run', icon: 'Calendar', color: '#6B7280', category: 'system' },
  search_console_synced: { label: 'Search Console Sync', icon: 'RefreshCw', color: '#10B981', category: 'system' },
  brand_created: { label: 'Brand Created', icon: 'Plus', color: '#10B981', category: 'system' },
  brand_verified: { label: 'Brand Verified', icon: 'BadgeCheck', color: '#10B981', category: 'system' },
  error: { label: 'Error', icon: 'AlertTriangle', color: '#EF4444', category: 'system' },
}

// Category metadata
export const ACTIVITY_CATEGORY_META: Record<ActivityCategory, {
  label: string
  icon: string
  color: string
}> = {
  scan: { label: 'Scans', icon: 'Radar', color: '#0EA5E9' },
  content: { label: 'Content', icon: 'FileText', color: '#8B5CF6' },
  discovery: { label: 'Discovery', icon: 'Compass', color: '#F97316' },
  traffic: { label: 'Traffic', icon: 'Zap', color: '#10B981' },
  system: { label: 'System', icon: 'Settings', color: '#6B7280' },
}
