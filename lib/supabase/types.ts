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
  // Raw homepage content for intent-based query generation
  homepage_content?: string
  // Extracted user intents/pain points from homepage
  user_intents?: UserIntent[]
  // Social links for Schema.org sameAs references
  social_links?: SocialLinks
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
export type ScanResult = Database['public']['Tables']['scan_results']['Row']
export type Memo = Database['public']['Tables']['memos']['Row']
export type MemoVersion = Database['public']['Tables']['memo_versions']['Row']
export type Alert = Database['public']['Tables']['alerts']['Row']
export type VisibilityHistory = Database['public']['Tables']['visibility_history']['Row']
export type CompetitorContent = Database['public']['Tables']['competitor_content']['Row']
