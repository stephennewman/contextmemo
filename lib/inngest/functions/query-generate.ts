import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { FUNNEL_QUERY_GENERATION_PROMPT } from '@/lib/ai/prompts/context-extraction'
import { BrandContext } from '@/lib/supabase/types'
import { isJunkQuery } from '@/lib/utils/query-validation'
import { logSingleUsage } from '@/lib/utils/usage-logger'

const supabase = createServiceRoleClient()

interface GeneratedQuery {
  query_text: string
  query_type: string
  priority: number
  related_competitor: string | null
  funnel_stage?: 'top_funnel' | 'mid_funnel' | 'bottom_funnel' | null
}

export const queryGenerate = inngest.createFunction(
  { id: 'query-generate', name: 'Generate Search Queries' },
  { event: 'query/generate' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Step 1: Get brand data
    const brand = await step.run('get-brand-data', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (error || !data) {
        throw new Error('Brand not found')
      }

      return data
    })

    const context = brand.context as BrandContext

    // Check if we have any meaningful context
    if (!context || (!context.description && !context.company_name && !context.homepage_content)) {
      throw new Error('Brand context not available. Run context extraction first.')
    }

    // Step 2: Generate 30 structured funnel queries (10 TOF / 10 MOF / 10 BOF)
    const queries = await step.run('generate-funnel-queries', async () => {
      const descriptionText = context.description || 
        (context.homepage_content ? `Based on website content: ${context.homepage_content.slice(0, 2000)}` : `Company: ${brand.name}`)

      // Build personas text from extracted context
      const personasText = (context.personas || [])
        .map(p => `${p.title}: ${p.description}`)
        .join('; ') || 'Not specified'

      const prompt = FUNNEL_QUERY_GENERATION_PROMPT
        .replace(/\{\{company_name\}\}/g, context.company_name || brand.name)
        .replace('{{description}}', descriptionText)
        .replace('{{products}}', (context.products || []).join(', ') || 'Not specified')
        .replace('{{markets}}', (context.markets || []).join(', ') || 'Not specified')
        .replace('{{personas}}', personasText)

      const { text, usage } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.4,
      })

      await logSingleUsage(
        brand.tenant_id, brandId, 'query_generate',
        'gpt-4o', usage?.inputTokens || 0, usage?.outputTokens || 0
      )

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          throw new Error('No JSON array found in response')
        }
        return JSON.parse(jsonMatch[0]) as GeneratedQuery[]
      } catch (e) {
        console.error('Failed to parse funnel queries:', e, text.slice(0, 500))
        return [] as GeneratedQuery[]
      }
    })

    if (queries.length === 0) {
      throw new Error('Failed to generate queries')
    }

    // Filter out junk queries
    const brandNameLower = brand.name.toLowerCase()
    const validQueries = queries.filter(q => !isJunkQuery(q.query_text, brandNameLower))
    
    if (validQueries.length < queries.length) {
      console.log(`Filtered ${queries.length - validQueries.length} junk queries`)
    }

    // Count by funnel stage
    const tofCount = validQueries.filter(q => q.funnel_stage === 'top_funnel').length
    const mofCount = validQueries.filter(q => q.funnel_stage === 'mid_funnel').length
    const bofCount = validQueries.filter(q => q.funnel_stage === 'bottom_funnel').length
    console.log(`Funnel breakdown: ${tofCount} TOF, ${mofCount} MOF, ${bofCount} BOF (${validQueries.length} total)`)

    // Step 3: Save prompts to database
    const savedQueries = await step.run('save-prompts', async () => {
      const queriesToInsert = validQueries.map(q => ({
        brand_id: brandId,
        query_text: q.query_text,
        query_type: q.query_type,
        priority: q.priority,
        related_competitor_id: null,
        auto_discovered: true,
        is_active: true,
        persona: null,
        funnel_stage: q.funnel_stage || null,
      }))

      // Use upsert to avoid duplicates
      const { data, error } = await supabase
        .from('queries')
        .upsert(queriesToInsert, {
          onConflict: 'brand_id,query_text',
          ignoreDuplicates: true,
        })
        .select()

      if (error) {
        console.error('Failed to save queries:', error)
      }

      return data || []
    })

    // Step 4: Trigger initial scan
    await step.sendEvent('trigger-initial-scan', {
      name: 'scan/run',
      data: { brandId, autoGenerateMemos: true },
    })

    // Create alert for user
    await step.run('create-alert', async () => {
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'setup_complete',
        title: 'Prompt Generation Complete',
        message: `Generated ${savedQueries.length} prompts (${tofCount} TOF, ${mofCount} MOF, ${bofCount} BOF). Running initial scan...`,
      })
    })

    return {
      success: true,
      promptsGenerated: validQueries.length,
      promptsSaved: savedQueries.length,
      tofPrompts: tofCount,
      mofPrompts: mofCount,
      bofPrompts: bofCount,
    }
  }
)
