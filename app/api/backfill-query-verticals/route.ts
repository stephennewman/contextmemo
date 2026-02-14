import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { BrandContext } from '@/lib/supabase/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * One-time backfill route to classify existing queries with vertical + query_framing.
 * Uses AI to classify each query based on the brand's target verticals.
 * 
 * POST /api/backfill-query-verticals
 * Headers: x-admin-key: <SUPABASE_SERVICE_ROLE_KEY>
 * Body (optional): { brandId?: string, dryRun?: boolean }
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('x-admin-key')
  if (authHeader !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const targetBrandId = body.brandId as string | undefined
  const dryRun = body.dryRun === true

  // Fetch queries that need classification
  let queryBuilder = supabase
    .from('queries')
    .select('id, query_text, brand_id, funnel_stage')
    .eq('is_active', true)
    .is('vertical', null)

  if (targetBrandId) {
    queryBuilder = queryBuilder.eq('brand_id', targetBrandId)
  }

  const { data: queries, error: qErr } = await queryBuilder

  if (qErr || !queries) {
    return NextResponse.json({ error: 'Failed to fetch queries', details: qErr }, { status: 500 })
  }

  if (queries.length === 0) {
    return NextResponse.json({ success: true, message: 'No queries to backfill', updated: 0 })
  }

  // Group queries by brand
  const queryByBrand = new Map<string, typeof queries>()
  for (const q of queries) {
    const existing = queryByBrand.get(q.brand_id) || []
    existing.push(q)
    queryByBrand.set(q.brand_id, existing)
  }

  // Fetch brand contexts
  const brandIds = Array.from(queryByBrand.keys())
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name, context')
    .in('id', brandIds)

  const brandMap = new Map((brands || []).map(b => [b.id, b]))

  let updated = 0
  let errors = 0
  const results: Array<{ brandId: string; brandName: string; queriesClassified: number }> = []

  for (const [brandId, brandQueries] of queryByBrand) {
    const brand = brandMap.get(brandId)
    if (!brand) continue

    const context = brand.context as BrandContext
    const verticalsList = context?.corporate_positioning?.primary_verticals
      || context?.markets
      || []
    const cleanVerticals = verticalsList.map((v: string) => v.replace(/^[•\-\s]+/, '').trim())

    if (cleanVerticals.length === 0) {
      console.log(`Skipping brand ${brand.name}: no verticals defined`)
      continue
    }

    // Classify in batches of 20
    const batchSize = 20
    for (let i = 0; i < brandQueries.length; i += batchSize) {
      const batch = brandQueries.slice(i, i + batchSize)

      try {
        const prompt = `Classify each query below with a vertical and framing type.

VERTICALS (use EXACTLY one of these):
${cleanVerticals.map((v: string) => `- "${v}"`).join('\n')}

FRAMING TYPES:
- "problem": Query asks about challenges, pain points, risks, trends, or market dynamics — does NOT ask about specific tools or solutions
- "solution": Query asks about tools, platforms, software, approaches, or evaluates/compares specific solution categories

QUERIES TO CLASSIFY:
${batch.map((q, idx) => `${idx + 1}. "${q.query_text}"`).join('\n')}

Respond with a JSON array of objects, one per query, in the same order:
[
  { "index": 1, "vertical": "exact vertical name", "query_framing": "problem" | "solution" }
]

RULES:
- Use the EXACT vertical name from the list above
- If a query doesn't clearly map to any vertical, use the MOST RELEVANT one
- "problem" = about challenges/issues/trends, "solution" = about tools/products/approaches
- Respond ONLY with valid JSON array`

        const { text } = await generateText({
          model: openai('gpt-4o-mini'),
          prompt,
          temperature: 0.1,
        })

        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          console.error(`Failed to parse classification for brand ${brand.name} batch ${i}`)
          errors++
          continue
        }

        const classifications = JSON.parse(jsonMatch[0]) as Array<{
          index: number
          vertical: string
          query_framing: 'problem' | 'solution'
        }>

        // Apply classifications
        for (const classification of classifications) {
          const query = batch[classification.index - 1]
          if (!query) continue

          // Validate vertical is in the allowed list
          const vertical = cleanVerticals.find(
            (v: string) => v.toLowerCase() === classification.vertical.toLowerCase()
          ) || classification.vertical

          const framing = classification.query_framing === 'problem' || classification.query_framing === 'solution'
            ? classification.query_framing
            : null

          if (!dryRun) {
            await supabase
              .from('queries')
              .update({ vertical, query_framing: framing })
              .eq('id', query.id)
          }

          updated++
        }
      } catch (e) {
        console.error(`Error classifying batch for brand ${brand.name}:`, e)
        errors++
      }
    }

    results.push({
      brandId,
      brandName: brand.name,
      queriesClassified: brandQueries.length,
    })
  }

  return NextResponse.json({
    success: true,
    dryRun,
    updated,
    errors,
    total: queries.length,
    brands: results,
  })
}
