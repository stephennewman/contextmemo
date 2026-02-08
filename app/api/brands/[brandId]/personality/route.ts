import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const PERSONALITY_PROMPT = `You are reverse-engineering a brand's identity to produce an internal brand personality profile. This profile will be used BY the brand team and fed TO AI systems to generate on-brand content.

CRITICAL: Write everything from the BRAND'S OWN PERSPECTIVE — first-person, authoritative, declarative. This is NOT an external analysis. This is the brand defining itself.

Examples of the voice to use:
- WRONG: "The brand believes AI visibility is important for B2B success."
- RIGHT: "We believe AI visibility is the new competitive moat. If buyers can't find you in ChatGPT, you don't exist."
- WRONG: "The brand positions itself as an expert partner guiding teams."
- RIGHT: "We are the authority on AI search visibility. We don't advise from the sidelines — we give you the tools and the data."
- WRONG: "If the brand were a person, they would be a knowledgeable consultant."
- RIGHT: "We're the sharp, no-BS operator who shows up with the data, cuts through the noise, and tells you exactly where you stand."

Use evidence from the website content. Be specific, not generic. Avoid soft hedging language.

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
    "belief": "First-person: We believe... (the core conviction that drives everything)",
    "problem": "First-person: The problem we see... (what's broken that we're fixing)",
    "future": "First-person: We're building toward... (the future state we're creating)",
    "tension": "First-person: What we're up against... (the obstacle, enemy, or status quo we fight)"
  },
  "audience_stance": "First-person declaration of relationship to the audience. e.g. 'We are your competitive intelligence team for the AI era.'",
  "emotional_register": {
    "primary": "The feeling we want people to walk away with (e.g. urgency, confidence, clarity)",
    "secondary": "Secondary feeling",
    "intensity": "low|medium|high"
  },
  "personality_summary": "A first-person paragraph: 'We are...' — written as if the brand is introducing itself to a new employee or AI system. Authoritative, specific, no fluff."
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
