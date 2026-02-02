export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
  blog_id?: string  // content_group_id in HubSpot
  auto_sync?: boolean  // Auto-push memos on publish
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

// Prompt personas - how different user types phrase AI queries
// Core personas (predefined)
export type CorePersona = 
  | 'b2b_marketer'      // Marketing leader, ROI-focused
  | 'developer'         // Technical IC, API/integration focused
  | 'product_leader'    // PM/Director, team workflows
  | 'enterprise_buyer'  // Procurement/IT, security/compliance
  | 'smb_owner'         // Small business, cost-conscious
  | 'student'           // Early career, free tiers, learning

// PromptPersona can be a core persona OR a custom string for industry-specific personas
export type PromptPersona = CorePersona | string

// Custom persona detected from website
export interface CustomPersona {
  id: string                    // slug identifier (e.g., "restaurant_owner")
  name: string                  // Display name (e.g., "Restaurant Owner")
  description: string           // Who this persona is
  phrasing_style: string        // How they phrase questions
  priorities: string[]          // What they care about
  detected_from: string         // What website signal detected this
}

// Persona configuration for prompt generation
export interface PersonaConfig {
  id: PromptPersona
  name: string
  description: string
  phrasingSyle: string
  priorities: string[]
  examplePhrasing: string
}

export const PERSONA_CONFIGS: PersonaConfig[] = [
  {
    id: 'b2b_marketer',
    name: 'B2B Marketer',
    description: 'Marketing leader evaluating tools for their team',
    phrasingSyle: 'ROI-focused, mentions integrations, campaign performance',
    priorities: ['ROI', 'integrations', 'analytics', 'automation'],
    examplePhrasing: 'What marketing automation integrates with our CRM and shows clear ROI?',
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Technical IC looking for tools and APIs',
    phrasingSyle: 'Technical specs, API quality, documentation, rate limits',
    priorities: ['API quality', 'documentation', 'reliability', 'developer experience'],
    examplePhrasing: 'Which API has the best rate limits and SDK support for Node.js?',
  },
  {
    id: 'product_leader',
    name: 'Product Leader',
    description: 'PM or Director evaluating for their team',
    phrasingSyle: 'Team workflows, scalability, collaboration features',
    priorities: ['team collaboration', 'scalability', 'roadmap features', 'user adoption'],
    examplePhrasing: 'What project management tool works well as we scale from 10 to 50 people?',
  },
  {
    id: 'enterprise_buyer',
    name: 'Enterprise Buyer',
    description: 'Procurement or IT evaluating vendors',
    phrasingSyle: 'Security, compliance, enterprise features, pricing',
    priorities: ['SOC 2', 'SSO', 'compliance', 'SLA', 'enterprise support'],
    examplePhrasing: 'What solution is SOC 2 compliant and supports SSO for our enterprise?',
  },
  {
    id: 'smb_owner',
    name: 'SMB Owner',
    description: 'Small business owner, cost-conscious',
    phrasingSyle: 'Cost-focused, ease of use, quick setup, value',
    priorities: ['price', 'ease of use', 'quick setup', 'value for money'],
    examplePhrasing: 'What\'s the most affordable way to automate my invoicing?',
  },
  {
    id: 'student',
    name: 'Student/Researcher',
    description: 'Early career, learning, budget-constrained',
    phrasingSyle: 'Free tiers, tutorials, learning resources, simplicity',
    priorities: ['free tier', 'tutorials', 'learning curve', 'community'],
    examplePhrasing: 'Free tools to help me learn data analysis for my thesis?',
  },
]

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
  // Target personas identified from website analysis (core + custom)
  target_personas?: PromptPersona[]
  // Custom industry-specific personas detected from website
  custom_personas?: CustomPersona[]
  // Personas that have been manually disabled (won't generate prompts)
  disabled_personas?: string[]
  // Primary and secondary offers/CTAs
  offers?: BrandOffers
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
