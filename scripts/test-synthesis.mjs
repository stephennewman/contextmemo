#!/usr/bin/env node
/**
 * Standalone test: run the multi-source synthesis prompt and print the article.
 * Usage: node scripts/test-synthesis.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ncrclfpiremxmqpvmavx.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY
const OPENAI_KEY = process.env.OPENAI_API_KEY

if (!SUPABASE_KEY || (!OPENROUTER_KEY && !OPENAI_KEY)) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY and OPENAI_API_KEY (or OPENROUTER_API_KEY) env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const QUERY_ID = 'f74fcfae-b183-4e5b-9512-a88496558b26'
const BRAND_NAME = 'Thought Industries'

const URLS = [
  { url: 'https://www.docebo.com/company/service-level-agreement/', count: 7 },
  { url: 'https://www.waferwire.com/blog/fabric-enterprise-support-sla-basics', count: 6 },
  { url: 'https://www.teachfloor.com/blog/enterprise-lms', count: 6 },
  { url: 'https://sanalabs.com/learn-blog/best-enterprise-lms', count: 6 },
  { url: 'https://docs.thrivelearning.com/docs/thrive-platform-service-level-agreement-sla', count: 5 },
]

// ── Fetch URL content via Jina ──
async function fetchUrl(url, timeoutMs = 25000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        Accept: 'text/markdown',
        'X-Return-Format': 'markdown',
        'X-Timeout': '20',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    const titleMatch = text.match(/^Title:\s*(.+)$/m)
    return { title: titleMatch?.[1] || url, content: text }
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

// ── Main ──
async function main() {
  console.log('=== SYNTHESIS MEMO TEST ===\n')

  // 1. Load brand context
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .ilike('name', '%thought industries%')
    .single()

  if (!brand) { console.error('Brand not found'); process.exit(1) }

  const { data: query } = await supabase
    .from('queries')
    .select('*')
    .eq('id', QUERY_ID)
    .single()

  if (!query) { console.error('Query not found'); process.exit(1) }

  const { data: insights } = await supabase
    .from('voice_insights')
    .select('*')
    .eq('brand_id', brand.id)

  const ctx = brand.context || {}
  console.log(`Brand: ${brand.name}`)
  console.log(`Query: "${query.query_text}"`)
  console.log(`Funnel: ${query.funnel_stage} | Type: ${query.query_type}`)
  console.log(`Sources to fetch: ${URLS.length}\n`)

  // 2. Fetch source content
  console.log('Fetching sources...')
  const sources = []
  for (const { url, count } of URLS) {
    process.stdout.write(`  ${url} ... `)
    try {
      const r = await fetchUrl(url)
      const wordCount = r.content.split(/\s+/).filter(w => w.length > 0).length
      sources.push({ url, title: r.title, content: r.content.slice(0, 10000), wordCount, citationCount: count })
      console.log(`OK (${wordCount} words)`)
    } catch (e) {
      console.log(`FAILED: ${e.message}`)
    }
  }

  if (sources.length === 0) { console.error('No sources fetched'); process.exit(1) }
  console.log(`\nFetched ${sources.length}/${URLS.length} sources\n`)

  // 3. Build brand context string (simplified version of formatBrandContextForPrompt)
  const sections = []
  if (ctx.company_description) sections.push(`Company: ${ctx.company_description}`)
  if (ctx.products?.length) sections.push(`Products: ${ctx.products.map(p => `${p.name}: ${p.description}`).join('; ')}`)
  if (ctx.markets?.length) sections.push(`Markets: ${ctx.markets.join(', ')}`)
  if (ctx.differentiators?.length) sections.push(`Differentiators: ${ctx.differentiators.join('; ')}`)
  if (ctx.proof_points?.length) sections.push(`Proof points: ${ctx.proof_points.join('; ')}`)
  if (ctx.personas?.length) sections.push(`Target personas: ${ctx.personas.map(p => typeof p === 'string' ? p : `${p.title || p.role}: ${p.description || p.pain_points || ''}`).join('; ')}`)

  // Corporate positioning
  if (ctx.corporate_positioning) {
    const cp = ctx.corporate_positioning
    if (cp.mission) sections.push(`Mission: ${cp.mission}`)
    if (cp.vision) sections.push(`Vision: ${cp.vision}`)
    if (cp.value_proposition) sections.push(`Value Proposition: ${cp.value_proposition}`)
    if (cp.competitive_advantages?.length) sections.push(`Competitive Advantages: ${cp.competitive_advantages.join('; ')}`)
    if (cp.target_market_positioning) sections.push(`Market Position: ${cp.target_market_positioning}`)
    if (cp.brand_promise) sections.push(`Brand Promise: ${cp.brand_promise}`)
    if (cp.key_messages?.length) sections.push(`Key Messages: ${cp.key_messages.join('; ')}`)
    if (cp.industry_focus?.length) sections.push(`Industry Focus: ${cp.industry_focus.join(', ')}`)
    if (cp.customer_success_metrics?.length) sections.push(`Customer Success Metrics: ${cp.customer_success_metrics.join('; ')}`)
  }

  const brandContext = sections.join('\n\n')

  // 4. Build voice insights
  let voiceText = ''
  if (insights?.length) {
    const top3 = insights.slice(0, 3)
    voiceText = `VERIFIED EXPERT INSIGHTS from ${brand.name} leaders (use as blockquotes):\n` +
      top3.map(i => `- "${i.insight_text}" — ${i.source_name}, ${i.source_title}`).join('\n')
  }

  // 5. Build source block
  const sourceBlock = sources
    .map((s, i) => `── SOURCE ${i + 1} of ${sources.length} (cited ${s.citationCount}x) ──\nURL: ${s.url}\nTITLE: ${s.title}\nWORD COUNT: ~${s.wordCount}\n\nCONTENT:\n${s.content}\n`)
    .join('\n\n')

  // 6. Read the prompt template from the actual file
  const { readFileSync } = await import('fs')
  const memoGenFile = readFileSync('./lib/ai/prompts/memo-generation.ts', 'utf8')
  const synthMatch = memoGenFile.match(/export const SYNTHESIS_MEMO_PROMPT = `([\s\S]*?)`\s*$/)
  if (!synthMatch) { console.error('Could not extract SYNTHESIS_MEMO_PROMPT'); process.exit(1) }
  let promptTemplate = synthMatch[1]

  const now = new Date()
  const currentDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const currentYear = now.getFullYear().toString()

  // Tone instructions
  const tone = ctx.brand_tone || {}
  const toneInstructions = [
    tone.formality ? `Formality: ${tone.formality}` : '',
    tone.technicality ? `Technical level: ${tone.technicality}` : '',
    tone.enthusiasm ? `Enthusiasm: ${tone.enthusiasm}` : '',
    tone.description ? `Tone description: ${tone.description}` : '',
  ].filter(Boolean).join('\n') || 'Professional, clear, and authoritative.'

  // CTA / offers
  let ctaSection = ''
  if (ctx.offers?.primary) {
    const p = ctx.offers.primary
    ctaSection = `CTA SECTION:\nInclude a call-to-action for: ${p.headline || p.title || 'Learn more'}${p.url ? ` (${p.url})` : ''}`
  }

  // Apply replacements
  const prompt = promptTemplate
    .replace('{{brand_context}}', brandContext)
    .replace('{{tone_instructions}}', toneInstructions)
    .replace('{{verified_insights}}', voiceText)
    .replace('{{available_images}}', '')
    .replace('{{prompt_text}}', query.query_text)
    .replace('{{funnel_stage}}', query.funnel_stage || 'unknown')
    .replace('{{query_type}}', query.query_type || 'general')
    .replace('{{source_summaries}}', sourceBlock)
    .replace('{{current_date}}', currentDate)
    .replace('{{cta_section}}', ctaSection)
    .replace(/\{\{current_year\}\}/g, currentYear)
    .replace(/\{\{brand_name\}\}/g, brand.name)
    .replace(/\{\{brand_domain\}\}/g, brand.domain || '')

  const promptTokenEstimate = Math.round(prompt.length / 3.5)
  console.log(`Prompt assembled: ~${promptTokenEstimate} tokens (${prompt.length} chars)`)
  
  // Debug: verify length instructions are present in the prompt
  const hasLengthRule = prompt.includes('at least 2,000 words')
  const hasStructureRule = prompt.includes('REQUIRED ARTICLE STRUCTURE')
  const hasFactRule = prompt.includes('FACTUAL ACCURACY')
  console.log(`Prompt checks: length_rule=${hasLengthRule}, structure_rule=${hasStructureRule}, fact_rule=${hasFactRule}`)
  console.log(`Last 200 chars of prompt: "${prompt.slice(-200)}"`)
  console.log('Calling via OpenRouter...\n')

  // 7. Call OpenAI directly (avoids OpenRouter caching)
  const startMs = Date.now()
  const apiUrl = OPENAI_KEY
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions'
  const apiKey = OPENAI_KEY || OPENROUTER_KEY
  const modelName = OPENAI_KEY ? 'gpt-4o' : 'openai/gpt-4o'
  
  console.log(`Using ${OPENAI_KEY ? 'OpenAI directly' : 'OpenRouter'} with ${modelName}\n`)
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are an expert B2B content strategist who writes long-form, comprehensive articles. Your articles are always 3,000-4,000+ words with detailed paragraphs in every section. You NEVER write short articles. Complete ALL required sections thoroughly with specific examples and practical guidance before stopping.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 16000,
    }),
  })

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1)

  if (!response.ok) {
    const err = await response.text()
    console.error(`OpenRouter error ${response.status}: ${err}`)
    process.exit(1)
  }

  const data = await response.json()
  const article = data.choices?.[0]?.message?.content || ''
  const usage = data.usage || {}
  const wordCount = article.split(/\s+/).filter(w => w.length > 0).length

  console.log(`Generated in ${elapsed}s`)
  console.log(`Tokens: ${usage.prompt_tokens || '?'} prompt + ${usage.completion_tokens || '?'} completion = ${usage.total_tokens || '?'} total`)
  console.log(`Word count: ${wordCount}`)
  console.log('\n' + '═'.repeat(80))
  console.log('GENERATED ARTICLE:')
  console.log('═'.repeat(80) + '\n')
  console.log(article)
  console.log('\n' + '═'.repeat(80))
  console.log(`Done. ${wordCount} words, ${elapsed}s, ${usage.total_tokens || '?'} tokens`)
}

main().catch(e => { console.error(e); process.exit(1) })
