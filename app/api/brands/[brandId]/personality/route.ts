import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const PERSONALITY_PROMPT = `You are a brand strategist and linguist. Analyze the provided brand website content and reverse-engineer the brand's personality, worldview, and voice.

Use only evidence from the text. If something cannot be inferred, mark it as "unclear."

Return a JSON object with this exact structure:
{
  "voice_traits": {
    "formal_casual": <1-5 number>,
    "warm_cool": <1-5 number>,
    "assertive_tentative": <1-5 number>,
    "playful_serious": <1-5 number>,
    "poetic_literal": <1-5 number>
  },
  "archetype_primary": "The Sage|The Hero|The Creator|The Explorer|The Ruler|The Caregiver|The Magician|The Outlaw|The Everyman|The Lover|The Jester|The Innocent",
  "archetype_secondary": "Optional secondary archetype or null",
  "worldview": {
    "belief": "What the brand believes about the world",
    "problem": "The problem it sees as broken",
    "future": "The future it is pushing toward",
    "tension": "The implied villain or tension"
  },
  "audience_stance": "How the brand positions itself relative to the reader",
  "emotional_register": {
    "primary": "Primary emotion the brand wants the reader to feel",
    "secondary": "Secondary emotion",
    "intensity": "low|medium|high"
  },
  "personality_summary": "One paragraph describing the brand as if it were a person, without marketing jargon"
}

Voice trait scale: 1 = strongly left trait, 5 = strongly right trait, 3 = neutral.
Return ONLY the JSON, no markdown.`

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch brand with existing context
  const { data: brand, error } = await supabase
    .from('brands')
    .select('name, domain, context')
    .eq('id', brandId)
    .single()

  if (error || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const context = brand.context as Record<string, unknown> | null

  // Build content summary from existing context for the AI to analyze
  const contentParts: string[] = []
  if (context?.company_name) contentParts.push(`Company: ${context.company_name}`)
  if (context?.description) contentParts.push(`Description: ${context.description}`)
  if (context?.products) contentParts.push(`Products: ${(context.products as string[]).join(', ')}`)
  if (context?.features) contentParts.push(`Features: ${(context.features as string[]).join(', ')}`)
  if (context?.markets) contentParts.push(`Markets: ${(context.markets as string[]).join(', ')}`)
  if (context?.brand_voice) contentParts.push(`Voice: ${context.brand_voice}`)
  if (context?.corporate_positioning) {
    const cp = context.corporate_positioning as Record<string, unknown>
    if (cp.mission_statement) contentParts.push(`Mission: ${cp.mission_statement}`)
    if (cp.vision_statement) contentParts.push(`Vision: ${cp.vision_statement}`)
    if (cp.tagline) contentParts.push(`Tagline: ${cp.tagline}`)
    if (cp.value_propositions) contentParts.push(`Value Props: ${(cp.value_propositions as string[]).join('; ')}`)
  }

  if (contentParts.length === 0) {
    return NextResponse.json({ error: 'No brand context available to analyze' }, { status: 400 })
  }

  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: PERSONALITY_PROMPT,
      prompt: `Brand: ${brand.name}\nDomain: ${brand.domain}\n\n${contentParts.join('\n')}`,
      temperature: 0.3,
    })

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const personality = JSON.parse(cleaned)

    // Update just the brand_personality field in context
    const { error: updateError } = await supabase
      .from('brands')
      .update({
        context: { ...context, brand_personality: personality },
        updated_at: new Date().toISOString(),
      })
      .eq('id', brandId)

    if (updateError) throw updateError

    return NextResponse.json({ personality })
  } catch (err) {
    console.error('Personality extraction error:', err)
    return NextResponse.json({ error: 'Failed to extract personality' }, { status: 500 })
  }
}
