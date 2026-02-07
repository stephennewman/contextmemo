import { createClient } from '@supabase/supabase-js'
import { calculateTotalCost } from '@/lib/config/costs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface UsageEntry {
  model: string
  inputTokens: number
  outputTokens: number
}

/**
 * Log one or more OpenRouter API calls to usage_events.
 * Call this at the end of each inngest function that uses OpenRouter.
 */
export async function logUsageEvents(
  tenantId: string,
  brandId: string,
  eventType: string,
  entries: UsageEntry[],
  metadata?: Record<string, unknown>
): Promise<number> {
  if (entries.length === 0) return 0

  let totalCostCents = 0

  const rows = entries.map(entry => {
    const costs = calculateTotalCost(entry.model, entry.inputTokens, entry.outputTokens)
    totalCostCents += costs.totalCost
    return {
      tenant_id: tenantId,
      brand_id: brandId,
      event_type: eventType,
      model: entry.model,
      input_tokens: entry.inputTokens,
      output_tokens: entry.outputTokens,
      search_queries: 1,
      token_cost_cents: costs.tokenCost,
      search_cost_cents: costs.searchCost,
      total_cost_cents: costs.totalCost,
      metadata: metadata || {},
    }
  })

  const { error } = await supabase.from('usage_events').insert(rows)
  if (error) {
    console.error(`[UsageLogger] Failed to log ${entries.length} usage events for ${eventType}:`, error)
  }

  return totalCostCents
}

/**
 * Log a single OpenRouter call.
 * Convenience wrapper for logUsageEvents with a single entry.
 */
export async function logSingleUsage(
  tenantId: string,
  brandId: string,
  eventType: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  metadata?: Record<string, unknown>
): Promise<number> {
  return logUsageEvents(tenantId, brandId, eventType, [
    { model, inputTokens, outputTokens },
  ], metadata)
}

/**
 * Map OpenRouter model IDs to our internal model names for cost calculation.
 */
export function normalizeModelId(modelId: string): string {
  const map: Record<string, string> = {
    // OpenRouter model IDs
    'openai/gpt-4o-mini': 'gpt-4o-mini',
    'openai/gpt-4o-mini:online': 'gpt-4o-mini',
    'openai/gpt-4o': 'gpt-4o',
    'anthropic/claude-3.5-haiku:online': 'claude-3-5-haiku',
    'x-ai/grok-4-fast:online': 'grok-4-fast',
    'sonar': 'perplexity-sonar',
    // Direct OpenAI SDK model IDs
    'gpt-4o': 'gpt-4o',
    'gpt-4o-mini': 'gpt-4o-mini',
  }
  return map[modelId] || 'gpt-4o-mini'
}
