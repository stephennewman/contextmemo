/**
 * AI Visibility Audit Report Types
 * Internal codename: Trojan Horse
 * 
 * These types define the frozen data snapshot stored in brand_reports.report_data
 */

export interface AuditReportData {
  // Brand basics
  brand: {
    name: string
    domain: string
    description: string
    products: string[]
    markets: string[]
  }

  // Headline metrics
  scores: {
    citation_rate: number        // 0-100 — primary metric (cited in AI citations)
    mention_rate: number         // 0-100 — secondary metric (mentioned in response text)
    total_queries: number
    total_models: number
    total_scans: number
    scan_date: string            // ISO date of latest scan
  }

  // Per-model breakdown
  model_results: ModelResult[]

  // Competitive landscape
  competitors: CompetitorResult[]

  // Top gaps (queries where brand is invisible)
  gaps: GapResult[]

  // Top strengths (queries where brand IS cited)
  strengths: StrengthResult[]

  // AI-generated executive summary
  executive_summary: string

  // AI-generated recommendations
  recommendations: string[]
}

export interface ModelResult {
  model_id: string               // e.g. "gpt-4o-mini"
  display_name: string           // e.g. "GPT-4o Mini"
  total_scans: number
  mentions: number
  citations: number
  mention_rate: number           // 0-100
  citation_rate: number          // 0-100
  sentiment: 'positive' | 'negative' | 'neutral' | null
  sample_context: string | null  // How the model described the brand
}

export interface CompetitorResult {
  name: string
  mention_count: number
  // How many queries this competitor wins where the brand doesn't
  queries_won: number
}

export interface GapResult {
  query_text: string
  funnel_stage: 'top_funnel' | 'mid_funnel' | 'bottom_funnel' | null
  models_missing: string[]      // Model display names that don't cite the brand
  winner_name: string | null    // Who AI recommends instead
}

export interface StrengthResult {
  query_text: string
  funnel_stage: 'top_funnel' | 'mid_funnel' | 'bottom_funnel' | null
  models_cited: string[]        // Model display names that cite the brand
  sentiment: 'positive' | 'negative' | 'neutral' | null
}

// Score color thresholds
export function getScoreColor(score: number): { text: string; bg: string; ring: string } {
  if (score >= 60) return { text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'stroke-emerald-500' }
  if (score >= 30) return { text: 'text-amber-600', bg: 'bg-amber-50', ring: 'stroke-amber-500' }
  return { text: 'text-red-600', bg: 'bg-red-50', ring: 'stroke-red-500' }
}

export function getScoreLabel(score: number): string {
  if (score >= 60) return 'Strong'
  if (score >= 30) return 'Moderate'
  if (score >= 10) return 'Weak'
  return 'Critical'
}

// Funnel stage display
export function getFunnelLabel(stage: string | null): { label: string; color: string; bg: string } {
  switch (stage) {
    case 'top_funnel': return { label: 'TOFU', color: 'text-violet-700', bg: 'bg-violet-50' }
    case 'mid_funnel': return { label: 'MOFU', color: 'text-amber-700', bg: 'bg-amber-50' }
    case 'bottom_funnel': return { label: 'BOFU', color: 'text-emerald-700', bg: 'bg-emerald-50' }
    default: return { label: '—', color: 'text-slate-500', bg: 'bg-slate-50' }
  }
}
