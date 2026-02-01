export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
}

// User intent extracted from homepage content
export interface UserIntent {
  pain_point: string  // The problem the user is experiencing
  desired_outcome: string  // What they want to achieve
  trigger_phrase: string  // How they'd describe it to an AI
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
