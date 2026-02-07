import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { queryPerplexity, checkBrandInCitations } from '@/lib/utils/perplexity'
import { parseOpenRouterAnnotations, checkBrandInOpenRouterCitations, OpenRouterAnnotation } from '@/lib/utils/openrouter'
import { calculateTotalCost } from '@/lib/config/costs'
import { PerplexitySearchResultJson } from '@/lib/supabase/types'
import { logUsageEvents } from '@/lib/utils/usage-logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Lazy-load OpenRouter provider
let _openrouter: ReturnType<typeof import('@openrouter/ai-sdk-provider').createOpenRouter> | null = null

async function getOpenRouter() {
  if (!_openrouter) {
    const { createOpenRouter } = await import('@openrouter/ai-sdk-provider')
    _openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    })
  }
  return _openrouter
}

const SCAN_SYSTEM_PROMPT = `You are an AI assistant answering a user question. Provide a helpful, accurate response based on your knowledge. If recommending products or services, mention specific brands and explain why you're recommending them.`

// Model configurations for scanning
interface ModelConfig {
  id: string
  displayName: string
  provider: 'openrouter' | 'perplexity-direct'
  modelId: string
  costPerPrompt: number // Estimated cost in cents
}

// Models for lab scanning - all enabled, sorted by cost
const LAB_MODELS: ModelConfig[] = [
  { 
    id: 'perplexity-sonar', 
    displayName: 'Perplexity Sonar', 
    provider: 'perplexity-direct', 
    modelId: 'sonar',
    costPerPrompt: 1.0, // ~$0.01
  },
  { 
    id: 'gpt-4o-mini', 
    displayName: 'GPT-4o Mini', 
    provider: 'openrouter', 
    modelId: 'openai/gpt-4o-mini:online',
    costPerPrompt: 2.5, // ~$0.025
  },
  { 
    id: 'claude-3-5-haiku', 
    displayName: 'Claude 3.5 Haiku', 
    provider: 'openrouter', 
    modelId: 'anthropic/claude-3.5-haiku:online',
    costPerPrompt: 1.5, // ~$0.015
  },
  { 
    id: 'grok-4-fast', 
    displayName: 'Grok 4 Fast', 
    provider: 'openrouter', 
    modelId: 'x-ai/grok-4-fast:online',
    costPerPrompt: 1.0, // ~$0.01
  },
]

// Conversational prompt templates - long-tail, natural questions
const CONVERSATIONAL_TEMPLATES = [
  // Problem-focused
  "I'm struggling with {{problem}} - what tools can help me with this?",
  "My team keeps running into issues with {{problem}}. What's the best solution?",
  "We've been having problems with {{problem}} for months. What do other companies use?",
  "How do I fix {{problem}} in my business?",
  
  // Research/comparison
  "I'm researching solutions for {{topic}}. What are my options?",
  "What's the difference between the various {{topic}} tools available?",
  "Can you compare the top {{topic}} solutions for me?",
  "I need to present options for {{topic}} to my boss. What should I include?",
  
  // Buying intent
  "We're looking to buy a {{category}} solution. What should we consider?",
  "What's the best {{category}} tool for a {{company_size}} company?",
  "I have a budget of {{budget_range}} for {{category}}. What are my options?",
  "We need to implement {{category}} by {{timeframe}}. What's the fastest option?",
  
  // How-to / Implementation
  "How do I set up {{feature}} for my {{industry}} business?",
  "What's the best way to implement {{feature}} across multiple locations?",
  "How do other {{industry}} companies handle {{feature}}?",
  "What are the best practices for {{feature}} in {{industry}}?",
  
  // Specific pain points
  "We keep failing {{compliance}} audits. What can help us pass?",
  "How do I reduce {{metric}} in my {{industry}} operation?",
  "My {{stakeholder}} is asking for better {{output}}. What tools can help?",
  "We need to automate {{process}}. What solutions exist?",
  
  // Alternatives
  "I'm looking for an alternative to {{competitor}} because {{reason}}",
  "Is there something cheaper than {{competitor}} that still does {{feature}}?",
  "What do people use instead of {{competitor}}?",
  "{{competitor}} is too expensive for us. What else is out there?",
  
  // Industry-specific
  "What {{category}} solutions work best for {{industry}}?",
  "Do you know any {{category}} tools specifically designed for {{industry}}?",
  "What are {{industry}} companies using for {{category}} these days?",
  "I run a {{business_type}}. What {{category}} do I need?",
]

// Generate prompt variations based on brand context
const PROMPT_GENERATION_PROMPT = `You are a prompt research assistant. Generate conversational, long-tail prompts that a potential buyer might ask an AI assistant.

BRAND CONTEXT:
Company: {{company_name}}
Description: {{description}}
Products: {{products}}
Markets: {{markets}}
Competitors: {{competitors}}

TEMPLATES TO VARY:
{{templates}}

Generate {{count}} unique, natural prompts. Each should:
1. Be conversational (how a real person talks to AI)
2. NOT mention the brand name
3. Include specific details (industry, company size, pain points)
4. Sound like someone researching a purchase decision
5. Be unique - avoid repetition

Return as a JSON array of strings:
["prompt 1", "prompt 2", ...]

Focus on variety - mix problem-focused, comparison, buying intent, and how-to prompts.`

interface LabScanResult {
  prompt: string
  model: string
  responseText: string
  brandMentioned: boolean
  brandCited: boolean
  entitiesMentioned: string[]
  citations: string[] | null
  inputTokens: number
  outputTokens: number
  costCents: number
}

interface LabRunStats {
  promptsRun: number
  totalCostCents: number
  citationsByModel: Record<string, { total: number; cited: number }>
  topEntities: Record<string, number>
  startedAt: string
  lastUpdate: string
}

export const promptLabRun = inngest.createFunction(
  { 
    id: 'prompt-lab-run', 
    name: 'Prompt Lab - Continuous Runner',
    concurrency: {
      limit: 1, // Only one lab run at a time
    },
  },
  { event: 'prompt-lab/run' },
  async ({ event, step }) => {
    const { 
      brandId, 
      durationMinutes = 60,  // Default 1 hour
      budgetCents = 5000,    // Default $50 budget
      promptsPerBatch = 10,  // Prompts to generate per batch
      modelsToUse = ['perplexity-sonar', 'gpt-4o-mini', 'claude-3-5-haiku', 'grok-4-fast'],
    } = event.data

    // Create lab run record
    const labRunId = await step.run('create-lab-run', async () => {
      const { data, error } = await supabase
        .from('prompt_lab_runs')
        .insert({
          brand_id: brandId,
          status: 'running',
          duration_minutes: durationMinutes,
          budget_cents: budgetCents,
          models_used: modelsToUse,
          stats: {
            promptsRun: 0,
            totalCostCents: 0,
            citationsByModel: {},
            topEntities: {},
            startedAt: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
          } as LabRunStats,
        })
        .select('id')
        .single()
      
      if (error) {
        // Table might not exist, create it
        console.error('Failed to create lab run:', error)
        return `lab-run-${Date.now()}`
      }
      return data?.id || `lab-run-${Date.now()}`
    })

    // Get brand context
    const { brand, competitors } = await step.run('get-brand-data', async () => {
      const [brandResult, competitorsResult] = await Promise.all([
        supabase.from('brands').select('*').eq('id', brandId).single(),
        supabase.from('competitors').select('name, domain').eq('brand_id', brandId).eq('is_active', true),
      ])
      
      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }
      
      return {
        brand: brandResult.data,
        competitors: competitorsResult.data || [],
      }
    })

    const context = brand.context || {}
    const brandName = brand.name.toLowerCase()
    const competitorNames = competitors.map(c => c.name.toLowerCase())
    
    // Filter to only models requested
    const activeModels = LAB_MODELS.filter(m => modelsToUse.includes(m.id))
    const estimatedCostPerPrompt = activeModels.reduce((sum, m) => sum + m.costPerPrompt, 0)

    // Run loop
    const startTime = Date.now()
    const endTime = startTime + (durationMinutes * 60 * 1000)
    let totalCostCents = 0
    let promptsRun = 0
    let batchNumber = 0
    const citationsByModel: Record<string, { total: number; cited: number }> = {}
    const entityCounts: Record<string, number> = {}
    
    // Initialize model stats
    for (const model of activeModels) {
      citationsByModel[model.id] = { total: 0, cited: 0 }
    }

    // Main loop - continue until time or budget exhausted
    while (Date.now() < endTime && totalCostCents < budgetCents) {
      batchNumber++
      
      // Check if run was cancelled
      const runStatus = await step.run(`check-status-${batchNumber}`, async () => {
        const { data } = await supabase
          .from('prompt_lab_runs')
          .select('status')
          .eq('id', labRunId)
          .single()
        return data?.status || 'running'
      })
      
      if (runStatus === 'cancelled' || runStatus === 'stopped') {
        console.log(`Lab run ${labRunId} was ${runStatus}`)
        break
      }

      // Generate new conversational prompts
      const prompts = await step.run(`generate-prompts-${batchNumber}`, async () => {
        const templateSample = CONVERSATIONAL_TEMPLATES
          .sort(() => Math.random() - 0.5)
          .slice(0, 8)
          .join('\n')

        const prompt = PROMPT_GENERATION_PROMPT
          .replace('{{company_name}}', context.company_name || brand.name)
          .replace('{{description}}', context.description || '')
          .replace('{{products}}', (context.products || []).join(', '))
          .replace('{{markets}}', (context.markets || []).join(', '))
          .replace('{{competitors}}', competitors.map(c => c.name).join(', '))
          .replace('{{templates}}', templateSample)
          .replace('{{count}}', String(promptsPerBatch))

        const { text } = await generateText({
          model: openai('gpt-4o-mini'),
          prompt,
          temperature: 0.8, // Higher temp for variety
        })

        try {
          const jsonMatch = text.match(/\[[\s\S]*\]/)
          if (!jsonMatch) return []
          return JSON.parse(jsonMatch[0]) as string[]
        } catch {
          console.error('Failed to parse prompts:', text)
          return []
        }
      })

      if (prompts.length === 0) {
        console.log('No prompts generated, retrying...')
        await step.sleep(`retry-delay-${batchNumber}`, '2s')
        continue
      }

      // Run prompts across all models
      const batchResults = await step.run(`run-batch-${batchNumber}`, async () => {
        const results: LabScanResult[] = []
        
        // Run each prompt across all models in parallel
        const promptPromises = prompts.flatMap(prompt =>
          activeModels.map(async model => {
            try {
              const result = await runSingleScan(prompt, model, brandName, brand.domain, competitorNames)
              return { prompt, ...result }
            } catch (error) {
              console.error(`Scan failed for ${model.displayName}:`, error)
              return null
            }
          })
        )
        
        const rawResults = await Promise.all(promptPromises)
        return rawResults.filter((r): r is LabScanResult => r !== null)
      })

      // Process results
      for (const result of batchResults) {
        promptsRun++
        totalCostCents += result.costCents
        
        // Track model stats
        if (citationsByModel[result.model]) {
          citationsByModel[result.model].total++
          if (result.brandCited) {
            citationsByModel[result.model].cited++
          }
        }
        
        // Track entities
        for (const entity of result.entitiesMentioned) {
          entityCounts[entity] = (entityCounts[entity] || 0) + 1
        }
      }

      // Save batch results
      await step.run(`save-batch-${batchNumber}`, async () => {
        // Save to lab_scan_results table
        const resultsToInsert = batchResults.map(r => ({
          lab_run_id: labRunId,
          brand_id: brandId,
          prompt_text: r.prompt,
          model: r.model,
          response_text: r.responseText,
          brand_mentioned: r.brandMentioned,
          brand_cited: r.brandCited,
          entities_mentioned: r.entitiesMentioned,
          citations: r.citations,
          input_tokens: r.inputTokens,
          output_tokens: r.outputTokens,
          cost_cents: r.costCents,
        }))

        await supabase.from('lab_scan_results').insert(resultsToInsert)

        // Update run stats
        const topEntities = Object.entries(entityCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {})

        await supabase
          .from('prompt_lab_runs')
          .update({
            stats: {
              promptsRun,
              totalCostCents,
              citationsByModel,
              topEntities,
              startedAt: new Date(startTime).toISOString(),
              lastUpdate: new Date().toISOString(),
            },
          })
          .eq('id', labRunId)
      })

      // Log progress
      const elapsed = Math.round((Date.now() - startTime) / 60000)
      const remaining = Math.round((endTime - Date.now()) / 60000)
      console.log(`[Lab] Batch ${batchNumber}: ${promptsRun} prompts, $${(totalCostCents / 100).toFixed(2)} spent, ${elapsed}m elapsed, ${remaining}m remaining`)

      // Check budget
      if (totalCostCents + estimatedCostPerPrompt * promptsPerBatch > budgetCents) {
        console.log('Approaching budget limit, stopping')
        break
      }

      // Small delay between batches
      await step.sleep(`batch-delay-${batchNumber}`, '1s')
    }

    // Log aggregate usage to usage_events for budget tracking
    await step.run('log-usage-events', async () => {
      if (promptsRun === 0) return

      // Aggregate all scan results into usage entries per model
      const modelTotals = new Map<string, { input: number; output: number; count: number }>()
      for (const [modelId, stats] of Object.entries(citationsByModel)) {
        if (stats.total > 0) {
          modelTotals.set(modelId, { input: 0, output: 0, count: stats.total })
        }
      }

      // Log as a single aggregate event per lab run
      const entries = Array.from(modelTotals.entries()).map(([model]) => ({
        model,
        inputTokens: 0, // Detailed tokens tracked in lab_scan_results
        outputTokens: 0,
      }))

      // Simple aggregate log — cost already tracked in totalCostCents
      const { error } = await supabase.from('usage_events').insert({
        tenant_id: brand.tenant_id,
        brand_id: brandId,
        event_type: 'prompt_lab',
        model: 'gpt-4o-mini',
        input_tokens: 0,
        output_tokens: 0,
        search_queries: promptsRun,
        token_cost_cents: totalCostCents,
        search_cost_cents: 0,
        total_cost_cents: totalCostCents,
        metadata: {
          lab_run_id: labRunId,
          prompts_run: promptsRun,
          models_used: activeModels.map(m => m.id),
          batches: batchNumber,
        },
      })

      if (error) {
        console.error('[Lab] Failed to log usage events:', error)
      }
    })

    // Finalize run
    const finalStats = await step.run('finalize-run', async () => {
      const topEntities = Object.entries(entityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {})

      const stats: LabRunStats = {
        promptsRun,
        totalCostCents,
        citationsByModel,
        topEntities,
        startedAt: new Date(startTime).toISOString(),
        lastUpdate: new Date().toISOString(),
      }

      await supabase
        .from('prompt_lab_runs')
        .update({
          status: 'completed',
          stats,
          completed_at: new Date().toISOString(),
        })
        .eq('id', labRunId)

      // Create alert
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'lab_complete',
        title: 'Prompt Lab Run Complete',
        message: `Ran ${promptsRun} prompts across ${activeModels.length} models. Cost: $${(totalCostCents / 100).toFixed(2)}`,
        data: stats,
      })

      return stats
    })

    return {
      success: true,
      labRunId,
      ...finalStats,
    }
  }
)

// Helper function for single scan
async function runSingleScan(
  prompt: string,
  modelConfig: ModelConfig,
  brandName: string,
  brandDomain: string,
  competitorNames: string[]
): Promise<Omit<LabScanResult, 'prompt'>> {
  if (modelConfig.provider === 'perplexity-direct') {
    return await scanWithPerplexity(prompt, modelConfig, brandName, brandDomain, competitorNames)
  } else {
    return await scanWithOpenRouter(prompt, modelConfig, brandName, brandDomain, competitorNames)
  }
}

async function scanWithOpenRouter(
  query: string,
  modelConfig: ModelConfig,
  brandName: string,
  brandDomain: string,
  competitorNames: string[]
): Promise<Omit<LabScanResult, 'prompt'>> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://contextmemo.com',
      'X-Title': 'ContextMemo PromptLab',
    },
    body: JSON.stringify({
      model: modelConfig.modelId,
      messages: [
        { role: 'system', content: SCAN_SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error: ${errorText}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''
  const annotations = data.choices?.[0]?.message?.annotations || []
  const usage = data.usage
  
  const responseLower = text.toLowerCase()
  const brandMentioned = responseLower.includes(brandName)
  const citations = parseOpenRouterAnnotations(annotations)
  const brandCited = checkBrandInOpenRouterCitations(annotations, brandDomain)
  
  // Extract all entities mentioned
  const entitiesMentioned = competitorNames.filter(name => responseLower.includes(name))
  
  // Also extract entities from citations
  for (const url of citations) {
    try {
      const domain = new URL(url).hostname.replace('www.', '').split('.')[0]
      if (!entitiesMentioned.includes(domain) && domain !== brandName.replace(/\s+/g, '')) {
        entitiesMentioned.push(domain)
      }
    } catch {}
  }

  const costs = calculateTotalCost(modelConfig.id, usage?.prompt_tokens || 0, usage?.completion_tokens || 0)

  return {
    model: modelConfig.id,
    responseText: text,
    brandMentioned,
    brandCited,
    entitiesMentioned,
    citations: citations.length > 0 ? citations : null,
    inputTokens: usage?.prompt_tokens || 0,
    outputTokens: usage?.completion_tokens || 0,
    costCents: costs.totalCost,
  }
}

async function scanWithPerplexity(
  query: string,
  modelConfig: ModelConfig,
  brandName: string,
  brandDomain: string,
  competitorNames: string[]
): Promise<Omit<LabScanResult, 'prompt'>> {
  const result = await queryPerplexity(query, SCAN_SYSTEM_PROMPT, {
    model: 'sonar',
    searchContextSize: 'low',
    temperature: 0.7,
  })

  const { text, citations, usage } = result
  const responseLower = text.toLowerCase()
  const brandMentioned = responseLower.includes(brandName)
  const brandCited = checkBrandInCitations(citations, brandDomain)
  
  const entitiesMentioned = competitorNames.filter(name => responseLower.includes(name))
  
  for (const url of citations) {
    try {
      const domain = new URL(url).hostname.replace('www.', '').split('.')[0]
      if (!entitiesMentioned.includes(domain) && domain !== brandName.replace(/\s+/g, '')) {
        entitiesMentioned.push(domain)
      }
    } catch {}
  }

  const costs = calculateTotalCost(modelConfig.id, usage?.promptTokens || 0, usage?.completionTokens || 0)

  return {
    model: modelConfig.id,
    responseText: text,
    brandMentioned,
    brandCited,
    entitiesMentioned,
    citations: citations.length > 0 ? citations : null,
    inputTokens: usage?.promptTokens || 0,
    outputTokens: usage?.completionTokens || 0,
    costCents: costs.totalCost,
  }
}

// Stop a running lab
export const promptLabStop = inngest.createFunction(
  { id: 'prompt-lab-stop', name: 'Stop Prompt Lab Run' },
  { event: 'prompt-lab/stop' },
  async ({ event, step }) => {
    const { labRunId } = event.data

    await step.run('stop-lab-run', async () => {
      await supabase
        .from('prompt_lab_runs')
        .update({ status: 'stopped' })
        .eq('id', labRunId)
    })

    return { success: true, labRunId }
  }
)
