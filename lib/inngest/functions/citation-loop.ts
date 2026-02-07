/**
 * Autonomous Citation Loop
 * 
 * The Loop:
 * 1. Brand → reverse engineer high-intent prompts → run prompts
 * 2. Extract competitors mentioned (but brand wasn't)
 * 3. For each competitor → extract THEIR context → generate THEIR prompts
 * 4. Run competitor prompts → see if competitor gets cited
 * 5. If cited → analyze WHAT content enabled the citation
 * 6. That content = gap for original brand to fill
 * 7. Repeat until content gaps identified
 * 
 * Metrics:
 * - Prompt Cycle: How many cycles to get a mention
 * - Hit Rate: % of prompts that result in mention
 * - Goal: 1 prompt cycle, 100% hit rate
 */

import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { fetchUrlAsMarkdown } from '@/lib/utils/jina-reader'

const supabase = createServiceRoleClient()

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

// Prompt to analyze WHY a competitor was cited
const CITATION_ANALYSIS_PROMPT = `Analyze why this competitor was mentioned/cited in this AI response.

QUERY: {{query}}

AI RESPONSE:
{{response}}

COMPETITOR MENTIONED: {{competitor_name}}

CITATIONS PROVIDED BY AI:
{{citations}}

Analyze:
1. What specific content/page enabled this citation?
2. What content STRUCTURE made this citable (FAQ? Comparison? How-to? Product page?)
3. What KEYWORDS/TOPICS in the content aligned with the query?
4. What authority signals made this trustworthy to cite?

Respond with JSON:
{
  "cited_url": "the specific URL that was likely cited, or null if in training data",
  "content_type": "faq|comparison|how_to|product_page|blog_post|landing_page|documentation|unknown",
  "key_factors": ["factor1", "factor2", "factor3"],
  "content_structure": "Description of what made this content citable",
  "query_alignment": "How the content matched the user's intent",
  "recommendation": "What the original brand should create to compete"
}`

// Prompt to reverse engineer queries for a competitor
const COMPETITOR_QUERY_PROMPT = `You are reverse-engineering high-intent, non-branded search queries that this competitor would likely appear in AI responses for.

COMPETITOR: {{competitor_name}}
COMPETITOR WEBSITE: {{competitor_domain}}
COMPETITOR DESCRIPTION: {{competitor_description}}
COMPETITOR CONTEXT:
{{competitor_context}}

Generate 10-15 non-branded, high-intent queries where this competitor SHOULD appear if AI knows about them.

Focus on:
1. Problem-solution queries ("How do I solve X?")
2. Category queries ("Best tools for X")
3. Comparison queries ("X vs Y alternatives")
4. Use case queries ("X for [industry/role]")
5. Feature queries ("Tools with [specific capability]")

DO NOT include the competitor name in any query.

Respond with JSON array:
[
  {
    "query": "the search query",
    "intent": "problem_solution|category|comparison|use_case|feature",
    "expected_match_reason": "Why this competitor should appear for this query"
  }
]`

interface CitationAnalysis {
  cited_url: string | null
  content_type: string
  key_factors: string[]
  content_structure: string
  query_alignment: string
  recommendation: string
}

interface ContentGap {
  id: string
  brand_id: string
  competitor_id: string
  competitor_name: string
  source_query: string
  cited_url: string | null
  content_type: string
  content_structure: string
  recommendation: string
  key_factors: string[]
  status: 'identified' | 'content_created' | 'verified'
  created_at: string
}

/**
 * Main autonomous loop - orchestrates the full cycle
 */
export const citationLoopRun = inngest.createFunction(
  {
    id: 'citation-loop-run',
    name: 'Run Citation Analysis Loop',
    concurrency: { limit: 1 },
  },
  { event: 'citation-loop/run' },
  async ({ event, step }) => {
    const { brandId, maxCycles = 3 } = event.data

    // Step 1: Get brand and existing scan results
    const { brand, recentScans } = await step.run('get-brand-data', async () => {
      const [brandResult, scansResult] = await Promise.all([
        supabase.from('brands').select('*').eq('id', brandId).single(),
        supabase
          .from('scan_results')
          .select('*, query:query_id(query_text, query_type)')
          .eq('brand_id', brandId)
          .eq('brand_mentioned', false)
          .not('competitors_mentioned', 'eq', '{}')
          .order('scanned_at', { ascending: false })
          .limit(50),
      ])

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      return {
        brand: brandResult.data,
        recentScans: scansResult.data || [],
      }
    })

    // Step 2: Extract unique competitors that were mentioned (where brand wasn't)
    const competitorsMentioned = await step.run('extract-competitors', async () => {
      const allCompetitors = new Set<string>()
      
      for (const scan of recentScans) {
        if (scan.competitors_mentioned && Array.isArray(scan.competitors_mentioned)) {
          for (const comp of scan.competitors_mentioned) {
            allCompetitors.add(comp.toLowerCase())
          }
        }
      }

      // Get competitor records
      const { data: competitors } = await supabase
        .from('competitors')
        .select('*')
        .eq('brand_id', brandId)
        .eq('is_active', true)

      // Match mentioned competitors to our records
      const matched = (competitors || []).filter(c => 
        allCompetitors.has(c.name.toLowerCase())
      )

      return matched
    })

    if (competitorsMentioned.length === 0) {
      return {
        success: true,
        message: 'No competitors to analyze - brand may already be winning or no competitors mentioned',
        gapsFound: 0,
      }
    }

    let totalGapsFound = 0
    let cycle = 0

    // Step 3: For each competitor, run the analysis cycle
    for (const competitor of competitorsMentioned.slice(0, 5)) { // Limit to top 5
      if (cycle >= maxCycles) break
      cycle++

      // Step 3a: Extract competitor context if not already done
      const competitorContext = await step.run(`extract-context-${competitor.id}`, async () => {
        // Check if context already extracted
        if (competitor.context && Object.keys(competitor.context).length > 0) {
          return competitor.context
        }

        // Extract context from competitor website
        try {
          const homepage = await fetchUrlAsMarkdown(`https://${competitor.domain}`)
          
          const { text } = await generateText({
            model: openrouter('openai/gpt-4o-mini'),
            prompt: `Extract key information about this company from their homepage:

WEBSITE CONTENT:
${homepage.content?.slice(0, 10000) || 'Unable to fetch'}

Extract:
- What they do (core product/service)
- Target markets/industries
- Key features/capabilities
- Value proposition

Respond with JSON:
{
  "description": "...",
  "products": ["..."],
  "markets": ["..."],
  "features": ["..."],
  "value_proposition": "..."
}`,
            temperature: 0.3,
          })

          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const context = JSON.parse(jsonMatch[0])
            
            // Save context
            await supabase
              .from('competitors')
              .update({ 
                context,
                context_extracted_at: new Date().toISOString(),
              })
              .eq('id', competitor.id)

            return context
          }
        } catch (e) {
          console.error(`Failed to extract context for ${competitor.name}:`, e)
        }

        return { description: competitor.description || '' }
      })

      // Step 3b: Generate queries that would favor this competitor
      const competitorQueries = await step.run(`generate-queries-${competitor.id}`, async () => {
        const prompt = COMPETITOR_QUERY_PROMPT
          .replace('{{competitor_name}}', competitor.name)
          .replace('{{competitor_domain}}', competitor.domain || '')
          .replace('{{competitor_description}}', competitor.description || '')
          .replace('{{competitor_context}}', JSON.stringify(competitorContext, null, 2))

        const { text } = await generateText({
          model: openrouter('openai/gpt-4o-mini'),
          prompt,
          temperature: 0.5,
        })

        try {
          const jsonMatch = text.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0])
          }
        } catch (e) {
          console.error('Failed to parse competitor queries:', e)
        }

        return []
      })

      // Step 3c: Run competitor queries and analyze citations
      const gapsIdentified: ContentGap[] = []

      for (const cQuery of competitorQueries.slice(0, 5)) { // Limit queries per competitor
        const analysis = await step.run(`analyze-${competitor.id}-${cQuery.query.slice(0, 20)}`, async () => {
          // Run the query through AI
          try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'openai/gpt-4o-mini:online',
                messages: [
                  { role: 'system', content: 'You are a helpful assistant. Provide recommendations and cite sources.' },
                  { role: 'user', content: cQuery.query },
                ],
              }),
            })

            const data = await response.json()
            const responseText = data.choices?.[0]?.message?.content || ''
            const annotations = data.choices?.[0]?.message?.annotations || []
            
            // Check if competitor was mentioned
            const competitorMentioned = responseText.toLowerCase().includes(competitor.name.toLowerCase())
            
            // Extract citations
            const citations = annotations
              .filter((a: { type: string }) => a.type === 'url_citation')
              .map((a: { url_citation?: { url: string } }) => a.url_citation?.url)
              .filter(Boolean)

            if (!competitorMentioned) {
              return null // Competitor not mentioned, skip
            }

            // Analyze WHY competitor was cited
            const analysisPrompt = CITATION_ANALYSIS_PROMPT
              .replace('{{query}}', cQuery.query)
              .replace('{{response}}', responseText.slice(0, 2000))
              .replace('{{competitor_name}}', competitor.name)
              .replace('{{citations}}', citations.join('\n') || 'No citations provided')

            const { text: analysisText } = await generateText({
              model: openrouter('openai/gpt-4o-mini'),
              prompt: analysisPrompt,
              temperature: 0.3,
            })

            const analysisMatch = analysisText.match(/\{[\s\S]*\}/)
            if (analysisMatch) {
              return JSON.parse(analysisMatch[0]) as CitationAnalysis
            }
          } catch (e) {
            console.error('Query analysis failed:', e)
          }

          return null
        })

        if (analysis) {
          // Save content gap
          const gap: ContentGap = {
            id: crypto.randomUUID(),
            brand_id: brandId,
            competitor_id: competitor.id,
            competitor_name: competitor.name,
            source_query: cQuery.query,
            cited_url: analysis.cited_url,
            content_type: analysis.content_type,
            content_structure: analysis.content_structure,
            recommendation: analysis.recommendation,
            key_factors: analysis.key_factors,
            status: 'identified',
            created_at: new Date().toISOString(),
          }

          gapsIdentified.push(gap)
        }
      }

      // Step 3d: Save identified gaps
      if (gapsIdentified.length > 0) {
        await step.run(`save-gaps-${competitor.id}`, async () => {
          await supabase.from('content_gaps').insert(gapsIdentified)
        })

        totalGapsFound += gapsIdentified.length
      }
    }

    // Step 4: Create summary alert
    await step.run('create-alert', async () => {
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'citation_loop_complete',
        title: 'Citation Analysis Complete',
        message: `Analyzed ${competitorsMentioned.length} competitors, found ${totalGapsFound} content gaps to address.`,
        data: {
          competitorsAnalyzed: competitorsMentioned.length,
          gapsFound: totalGapsFound,
          cycles: cycle,
        },
      })
    })

    return {
      success: true,
      competitorsAnalyzed: competitorsMentioned.length,
      gapsFound: totalGapsFound,
      cycles: cycle,
    }
  }
)

/**
 * Analyze a specific scan result to understand competitor citations
 */
export const analyzeCitation = inngest.createFunction(
  {
    id: 'analyze-citation',
    name: 'Analyze Why Competitor Was Cited',
    concurrency: { limit: 5 },
  },
  { event: 'citation/analyze' },
  async ({ event, step }) => {
    const { scanResultId, brandId } = event.data

    // Get scan result with full details
    const scanResult = await step.run('get-scan', async () => {
      const { data, error } = await supabase
        .from('scan_results')
        .select('*, query:query_id(query_text)')
        .eq('id', scanResultId)
        .single()

      if (error || !data) throw new Error('Scan result not found')
      return data
    })

    if (!scanResult.competitors_mentioned?.length) {
      return { success: false, message: 'No competitors to analyze' }
    }

    const analyses: CitationAnalysis[] = []

    for (const competitorName of scanResult.competitors_mentioned) {
      const analysis = await step.run(`analyze-${competitorName}`, async () => {
        const prompt = CITATION_ANALYSIS_PROMPT
          .replace('{{query}}', scanResult.query?.query_text || '')
          .replace('{{response}}', scanResult.response_text?.slice(0, 3000) || '')
          .replace('{{competitor_name}}', competitorName)
          .replace('{{citations}}', (scanResult.citations || []).join('\n') || 'None')

        const { text } = await generateText({
          model: openrouter('openai/gpt-4o-mini'),
          prompt,
          temperature: 0.3,
        })

        const match = text.match(/\{[\s\S]*\}/)
        if (match) {
          return JSON.parse(match[0]) as CitationAnalysis
        }
        return null
      })

      if (analysis) {
        analyses.push(analysis)
      }
    }

    // Save analyses
    await step.run('save-analyses', async () => {
      await supabase
        .from('scan_results')
        .update({
          citation_analysis: analyses,
        })
        .eq('id', scanResultId)
    })

    return {
      success: true,
      competitorsAnalyzed: scanResult.competitors_mentioned.length,
      analyses,
    }
  }
)
