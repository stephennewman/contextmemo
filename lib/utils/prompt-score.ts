/**
 * Prompt Score (0-100)
 * 
 * Measures how valuable a prompt is for a potential buyer.
 * Higher score = more citations + more buyer-relevant + more competitive.
 * 
 * Components:
 *   Citation Richness (0-30): More citations = AI models pull many sources = more opportunity
 *   Buyer Intent (0-40): High-intent purchase keywords score highest
 *   Competitive Density (0-30): More competitors mentioned = active buying category
 */

// High-intent patterns (BOFU: comparison, purchase, switching)
const HIGH_INTENT_PATTERNS = [
  /\bbest\b/i,
  /\btop\s+\d/i,
  /\bvs\.?\b/i,
  /\bversus\b/i,
  /\bcompar(e|ison|ing)\b/i,
  /\balternative/i,
  /\breplace(ment)?\b/i,
  /\bswitch(ing)?\s+(from|to)\b/i,
  /\bmigrat/i,
  /\bpric(e|ing|es)\b/i,
  /\bcost\b/i,
  /\breview/i,
  /\bwhich\s+(should|is|one|tool|platform|software)\b/i,
  /\brecommend/i,
  /\bbuy(ing)?\b/i,
  /\bpurchas/i,
  /\bselect(ing|ion)?\s+(a|the|best)\b/i,
  /\bchoose\b/i,
  /\bpros\s+and\s+cons\b/i,
]

// Mid-intent patterns (MOFU: implementation, evaluation)
const MID_INTENT_PATTERNS = [
  /\bhow\s+to\b/i,
  /\bimplement/i,
  /\bintegrat/i,
  /\bsetup\b/i,
  /\binstall/i,
  /\bconfigur/i,
  /\bautomation\b/i,
  /\bworkflow/i,
  /\bsolution\s+for\b/i,
  /\btool[s]?\s+for\b/i,
  /\bsoftware\s+for\b/i,
  /\bplatform\s+for\b/i,
  /\bfeatures?\b/i,
  /\bcapabilit/i,
  /\bbenefits?\s+of\b/i,
  /\buse\s+case/i,
]

export interface PromptScoreInput {
  queryText: string
  /** Average number of citations per scan (across all scans for this prompt) */
  avgCitationCount: number
  /** Average number of competitors mentioned per scan */
  avgCompetitorCount: number
  /** Funnel stage if set on the prompt */
  funnelStage: string | null
}

export function calculatePromptScore(input: PromptScoreInput): number {
  const { queryText, avgCitationCount, avgCompetitorCount, funnelStage } = input

  // --- Citation Richness (0-30) ---
  let citationScore = 0
  if (avgCitationCount >= 8) citationScore = 30
  else if (avgCitationCount >= 5) citationScore = 25
  else if (avgCitationCount >= 3) citationScore = 20
  else if (avgCitationCount >= 1) citationScore = 12
  // 0 citations = 0

  // --- Buyer Intent (0-40) ---
  let intentScore = 0
  const hasHighIntent = HIGH_INTENT_PATTERNS.some(p => p.test(queryText))
  const hasMidIntent = MID_INTENT_PATTERNS.some(p => p.test(queryText))

  if (hasHighIntent) {
    intentScore = 36
  } else if (hasMidIntent) {
    intentScore = 22
  } else if (funnelStage === 'bottom_funnel') {
    intentScore = 36
  } else if (funnelStage === 'mid_funnel') {
    intentScore = 22
  } else {
    intentScore = 8 // TOFU / untagged
  }

  // Bonus for BOFU funnel stage even if keywords already matched
  if (funnelStage === 'bottom_funnel' && !hasHighIntent) {
    intentScore = Math.max(intentScore, 30)
  }

  // --- Competitive Density (0-30) ---
  let competitiveScore = 0
  if (avgCompetitorCount >= 4) competitiveScore = 30
  else if (avgCompetitorCount >= 2) competitiveScore = 22
  else if (avgCompetitorCount >= 1) competitiveScore = 14
  else competitiveScore = 3

  const total = citationScore + intentScore + competitiveScore
  return Math.min(100, Math.max(0, total))
}

/** Color coding for prompt score badges */
export function getPromptScoreColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 75) return { bg: 'bg-green-100', text: 'text-green-700', label: 'High Value' }
  if (score >= 50) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Medium' }
  if (score >= 25) return { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Low' }
  return { bg: 'bg-slate-50', text: 'text-slate-400', label: 'Minimal' }
}
