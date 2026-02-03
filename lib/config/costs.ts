/**
 * Cost Configuration for Usage Tracking
 * 
 * These values are estimates based on provider pricing.
 * All costs are in cents for precision.
 */

// Per-model token costs (per 1M tokens, in cents)
export const TOKEN_COSTS = {
  'perplexity-sonar': { input: 100, output: 100 },     // ~$1/1M
  'gpt-4o-mini': { input: 15, output: 60 },            // $0.15/$0.60 per 1M
  'claude-3-5-haiku': { input: 80, output: 400 },      // $0.80/$4 per 1M
  'grok-4-fast': { input: 20, output: 50 },            // $0.20/$0.50 per 1M
} as const

// Search costs per query (in cents)
export const SEARCH_COSTS = {
  'perplexity': 0,           // Included in token cost
  'openai-native': 2.5,      // ~$0.025 per search
  'anthropic-native': 1.5,   // ~$0.015 per search
  'xai-native': 1.0,         // ~$0.01 per search
} as const

// Map model IDs to their search cost type
export const MODEL_SEARCH_TYPE: Record<string, keyof typeof SEARCH_COSTS> = {
  'perplexity-sonar': 'perplexity',
  'gpt-4o-mini': 'openai-native',
  'claude-3-5-haiku': 'anthropic-native',
  'grok-4-fast': 'xai-native',
}

/**
 * Calculate token cost in cents
 */
export function calculateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS]
  if (!costs) return 0
  
  // Convert from per-1M to actual cost
  const inputCost = (inputTokens / 1_000_000) * costs.input
  const outputCost = (outputTokens / 1_000_000) * costs.output
  
  return inputCost + outputCost
}

/**
 * Calculate search cost in cents
 */
export function calculateSearchCost(model: string): number {
  const searchType = MODEL_SEARCH_TYPE[model]
  if (!searchType) return 0
  
  return SEARCH_COSTS[searchType]
}

/**
 * Calculate total cost for a scan result
 */
export function calculateTotalCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { tokenCost: number; searchCost: number; totalCost: number } {
  const tokenCost = calculateTokenCost(model, inputTokens, outputTokens)
  const searchCost = calculateSearchCost(model)
  
  return {
    tokenCost,
    searchCost,
    totalCost: tokenCost + searchCost,
  }
}
