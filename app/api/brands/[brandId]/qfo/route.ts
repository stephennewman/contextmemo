import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { queryPerplexity } from '@/lib/utils/perplexity'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Props {
  params: Promise<{ brandId: string }>
}

interface FanOutQuery {
  query: string
  angle: string
  coverage?: {
    brandCited: boolean
    brandMentioned: boolean
    competitorsCited: string[]
    topEntities: string[]
    response?: string
  }
}

const FAN_OUT_GENERATION_PROMPT = `You are an AI search system analyst. When a user submits a query to an AI assistant like ChatGPT or Perplexity, the system internally expands that single query into multiple sub-queries to gather comprehensive information before synthesizing a response.

Given the user's query: "{{query}}"

Generate 6-8 sub-queries that an AI system would internally create to comprehensively answer this question. These should cover different ANGLES of the question:

- **Features/Capabilities**: What specific features or capabilities matter
- **Comparisons**: How do options compare to each other
- **Pricing/Cost**: What are the costs or pricing models
- **Use Cases**: Specific scenarios or industry applications
- **Implementation**: How to implement or get started
- **Reviews/Reputation**: What do users say, what's the track record
- **Alternatives**: What are the alternatives or competitors
- **Best Practices**: Industry standards or recommended approaches

Return a JSON array with this structure:
[
  {
    "query": "the actual sub-query the AI would search for",
    "angle": "one of: features, comparison, pricing, use_case, implementation, reviews, alternatives, best_practices"
  }
]

Requirements:
- Each sub-query should be a complete, natural search query
- Vary the angles to cover different aspects
- Make them specific enough to return focused results
- Don't include the brand name in queries (we want non-branded queries)

Return ONLY the JSON array, no other text.`

const ENTITY_EXTRACTION_PROMPT = `Analyze this AI response and extract all company/product names mentioned.

Response text:
"""
{{response}}
"""

Return a JSON object:
{
  "entities": ["Company1", "Company2", "Product1"],
  "citations": ["domain.com", "other.com"]
}

Only include actual company/product names, not generic terms. Return ONLY the JSON.`

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { brandId } = await params
    const body = await request.json()
    const { action, query, queries, originalQuery } = body

    // Get brand info
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('name, domain, context')
      .eq('id', brandId)
      .single()

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Get competitors for this brand
    const { data: competitors } = await supabase
      .from('competitors')
      .select('name, domain')
      .eq('brand_id', brandId)
      .eq('is_active', true)

    const competitorNames = (competitors || []).map(c => c.name.toLowerCase())
    const competitorDomains = (competitors || []).map(c => c.domain?.toLowerCase()).filter(Boolean)

    if (action === 'generate') {
      // Generate fan-out queries using AI
      const prompt = FAN_OUT_GENERATION_PROMPT.replace('{{query}}', query)
      
      const { text } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.4,
      })

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          throw new Error('No JSON array found')
        }
        
        const fanOutQueries: FanOutQuery[] = JSON.parse(jsonMatch[0])
        
        return NextResponse.json({
          originalQuery: query,
          fanOutQueries,
        })
      } catch (parseError) {
        console.error('Failed to parse fan-out queries:', text)
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
      }
    }

    if (action === 'scan') {
      // Scan each query for coverage using Perplexity
      const scannedQueries: FanOutQuery[] = []
      
      for (const queryText of queries) {
        try {
          // Use Perplexity to get real search results
          const response = await queryPerplexity(queryText, undefined, {
            model: 'sonar',
            searchContextSize: 'medium',
          })
          
          // Check if brand is cited (in citations or mentioned in text)
          const brandNameLower = brand.name.toLowerCase()
          const brandDomainLower = brand.domain.toLowerCase()
          
          const brandCited = response.citations.some(url => 
            url.toLowerCase().includes(brandDomainLower)
          )
          
          const brandMentioned = response.text.toLowerCase().includes(brandNameLower)
          
          // Find which competitors are cited
          const competitorsCited: string[] = []
          for (let i = 0; i < competitorNames.length; i++) {
            const compName = competitorNames[i]
            const compDomain = competitorDomains[i]
            
            const isCited = response.citations.some(url => 
              compDomain && url.toLowerCase().includes(compDomain)
            ) || response.text.toLowerCase().includes(compName)
            
            if (isCited && competitors?.[i]) {
              competitorsCited.push(competitors[i].name)
            }
          }
          
          // Extract other entities mentioned
          const entityResponse = await generateText({
            model: openai('gpt-4o-mini'),
            prompt: ENTITY_EXTRACTION_PROMPT.replace('{{response}}', response.text.slice(0, 3000)),
            temperature: 0.1,
          })
          
          let topEntities: string[] = []
          try {
            const entityJson = entityResponse.text.match(/\{[\s\S]*\}/)
            if (entityJson) {
              const parsed = JSON.parse(entityJson[0])
              topEntities = (parsed.entities || [])
                .filter((e: string) => 
                  e.toLowerCase() !== brandNameLower && 
                  !competitorNames.includes(e.toLowerCase())
                )
                .slice(0, 5)
            }
          } catch {
            // Ignore entity extraction errors
          }
          
          scannedQueries.push({
            query: queryText,
            angle: 'scanned',
            coverage: {
              brandCited,
              brandMentioned,
              competitorsCited,
              topEntities,
              response: response.text.slice(0, 500),
            },
          })
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`Failed to scan query "${queryText}":`, error)
          scannedQueries.push({
            query: queryText,
            angle: 'error',
            coverage: {
              brandCited: false,
              brandMentioned: false,
              competitorsCited: [],
              topEntities: [],
            },
          })
        }
      }
      
      return NextResponse.json({
        fanOutQueries: scannedQueries,
      })
    }

    if (action === 'generate-cluster') {
      // Generate memos for each gap query
      const gapQueries = queries as string[]
      const memosCreated: string[] = []
      
      for (const gapQuery of gapQueries) {
        try {
          // Create a memo for this query
          // First, generate the content
          const memoPrompt = `Write a comprehensive, factual article that would rank well for this search query:

"${gapQuery}"

Brand context:
- Company: ${brand.name}
- Domain: ${brand.domain}
- Description: ${(brand.context as { description?: string })?.description || 'Not available'}

Requirements:
1. Write 600-900 words
2. Be factual and educational, not promotional
3. Include specific examples and data points
4. Structure with clear headings (H2)
5. Include a section that naturally mentions ${brand.name} as a solution
6. Write in a conversational, easy-to-read tone
7. Include a comparison table if relevant
8. End with actionable takeaways

Return the article in markdown format.`

          const { text: memoContent } = await generateText({
            model: openai('gpt-4o'),
            prompt: memoPrompt,
            temperature: 0.5,
          })
          
          // Generate a title and slug
          const titleMatch = memoContent.match(/^#\s+(.+)$/m)
          const title = titleMatch 
            ? titleMatch[1] 
            : gapQuery.replace(/[?]/g, '').slice(0, 60)
          
          const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 50)
          
          // Insert memo
          const { data: memo, error: memoError } = await supabase
            .from('memos')
            .insert({
              brand_id: brandId,
              title,
              slug: `${slug}-${Date.now().toString(36)}`,
              content: memoContent,
              memo_type: 'industry',
              status: 'published',
              published_at: new Date().toISOString(),
              schema_json: {
                source: 'qfo_cluster',
                original_query: originalQuery,
                fan_out_query: gapQuery,
                cluster_generated_at: new Date().toISOString(),
              },
            })
            .select('id, title')
            .single()
          
          if (!memoError && memo) {
            memosCreated.push(memo.title)
          }
          
          // Delay between generations
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
          console.error(`Failed to generate memo for "${gapQuery}":`, error)
        }
      }
      
      // Trigger backlinking for all brand memos
      if (memosCreated.length > 0) {
        // Could trigger memo/batch-backlink here via Inngest
      }
      
      return NextResponse.json({
        success: true,
        memosGenerated: memosCreated.length,
        memoTitles: memosCreated,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('QFO API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { brandId } = await params
    
    // Get prompts for this brand to use in the UI
    const { data: queries, error } = await supabase
      .from('queries')
      .select('id, query_text')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(20)
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch queries' }, { status: 500 })
    }
    
    return NextResponse.json({ queries: queries || [] })
  } catch (error) {
    console.error('QFO GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
