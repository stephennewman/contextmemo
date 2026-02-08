import { BrandTone, BrandPersonality, BrandContext, VoiceInsight, VoiceInsightTopic, formatVoiceInsightCitation } from '@/lib/supabase/types'

// Format voice insights for inclusion in AI prompts
export function formatVoiceInsightsForPrompt(insights: VoiceInsight[]): string {
  if (!insights || insights.length === 0) {
    return ''
  }

  const formatted = insights.map(insight => {
    const citation = formatVoiceInsightCitation(insight)
    return `### ${insight.title}
Topic: ${insight.topic}
"${insight.transcript}"
${citation}
${insight.tags.length > 0 ? `Tags: ${insight.tags.join(', ')}` : ''}
`
  }).join('\n')

  return `
## VERIFIED EXPERT INSIGHTS (Primary Sources)

The following insights are verified statements from brand experts. These are PRIMARY SOURCES that should be cited directly when relevant.

${formatted}

CRITICAL: When including these expert insights in the memo, use this EXACT blockquote format to make them prominent and citable:

> "[Direct quote from the insight - can be the full transcript or a key portion]"
>
> **— [Full Name], [Title] ([Date])**

This blockquote format is REQUIRED for all expert insight citations. Place them prominently within the relevant section, NOT buried in paragraph text. The blockquote makes the citation:
1. Visually prominent for human readers
2. Structured for AI models to recognize as a citable source
3. Easy to extract and reference

Example of correct formatting:

> "The key advantage of our approach is combining real-time data with predictive models, which lets teams prevent problems instead of just reacting to them."
>
> **— [Expert Name], [Title] ([Date])**
`
}

// Format brand context as structured prompt text instead of raw JSON dump
// Strips infrastructure config (hubspot, search_console, etc.) and surfaces
// brand personality + corporate positioning as explicit labeled sections
export function formatBrandContextForPrompt(ctx: BrandContext): string {
  const sections: string[] = []

  // Core identity
  if (ctx.company_name) sections.push(`Company: ${ctx.company_name}`)
  if (ctx.description) sections.push(`Description: ${ctx.description}`)
  if (ctx.founded) sections.push(`Founded: ${ctx.founded}`)
  if (ctx.headquarters) sections.push(`Headquarters: ${ctx.headquarters}`)
  if (ctx.products?.length) sections.push(`Products: ${ctx.products.join(', ')}`)
  if (ctx.features?.length) sections.push(`Key Features: ${ctx.features.join(', ')}`)
  if (ctx.markets?.length) sections.push(`Markets: ${ctx.markets.join(', ')}`)
  if (ctx.certifications?.length) sections.push(`Certifications: ${ctx.certifications.join(', ')}`)
  if (ctx.customers?.length) sections.push(`Notable Customers: ${ctx.customers.join(', ')}`)

  // Brand personality (rich diagnostic extracted from website)
  const bp = ctx.brand_personality
  if (bp) {
    sections.push(`\n## BRAND PERSONALITY`)
    sections.push(`Archetype: ${bp.archetype_primary}${bp.archetype_secondary ? ` / ${bp.archetype_secondary}` : ''}`)
    sections.push(`Personality: ${bp.personality_summary}`)
    if (bp.worldview) {
      sections.push(`Worldview: Believes ${bp.worldview.belief}. Sees the problem as: ${bp.worldview.problem}. Pushes toward: ${bp.worldview.future}.`)
    }
    sections.push(`Audience stance: ${bp.audience_stance}`)
    if (bp.emotional_register) {
      sections.push(`Emotional register: ${bp.emotional_register.primary}${bp.emotional_register.secondary ? `, ${bp.emotional_register.secondary}` : ''} (${bp.emotional_register.intensity} intensity)`)
    }
    if (bp.voice_traits) {
      const t = bp.voice_traits
      const traitDesc: string[] = []
      if (t.formal_casual <= 2) traitDesc.push('formal')
      else if (t.formal_casual >= 4) traitDesc.push('casual')
      if (t.warm_cool <= 2) traitDesc.push('warm')
      else if (t.warm_cool >= 4) traitDesc.push('cool/detached')
      if (t.assertive_tentative <= 2) traitDesc.push('assertive')
      else if (t.assertive_tentative >= 4) traitDesc.push('tentative')
      if (t.playful_serious <= 2) traitDesc.push('playful')
      else if (t.playful_serious >= 4) traitDesc.push('serious')
      if (traitDesc.length) sections.push(`Voice traits: ${traitDesc.join(', ')}`)
    }
  }

  // Corporate positioning (strategic messaging framework)
  const cp = ctx.corporate_positioning
  if (cp) {
    sections.push(`\n## STRATEGIC POSITIONING`)
    if (cp.mission_statement) sections.push(`Mission: ${cp.mission_statement}`)
    if (cp.vision_statement) sections.push(`Vision: ${cp.vision_statement}`)
    if (cp.core_value_promise) sections.push(`Core value promise: ${cp.core_value_promise}`)
    if (cp.key_benefits?.length) sections.push(`Key benefits: ${cp.key_benefits.join('; ')}`)
    if (cp.differentiators?.length) {
      const diffLines = cp.differentiators.map(d => `- ${d.name}: ${d.detail}`).join('\n')
      sections.push(`Differentiators:\n${diffLines}`)
    }
    if (cp.messaging_pillars?.length) {
      const pillarLines = cp.messaging_pillars.map(p => `- ${p.name}: ${p.supporting_points?.[0] || ''}`).join('\n')
      sections.push(`Messaging pillars:\n${pillarLines}`)
    }
    if (cp.competitive_positioning) sections.push(`Competitive positioning: ${cp.competitive_positioning}`)
    if (cp.win_themes?.length) sections.push(`Win themes: ${cp.win_themes.join('; ')}`)
    if (cp.pitch_10_second) sections.push(`Elevator pitch: ${cp.pitch_10_second}`)
  }

  return sections.join('\n')
}

// Map memo types to most relevant voice insight topics (ordered by relevance)
const MEMO_TYPE_TOPIC_RELEVANCE: Record<string, VoiceInsightTopic[]> = {
  comparison: ['competitive_advantage', 'market_position', 'product_insight'],
  alternative: ['competitive_advantage', 'market_position', 'product_insight'],
  industry: ['industry_expertise', 'customer_context', 'market_position'],
  how_to: ['concept_definition', 'product_insight', 'industry_expertise'],
  response: ['competitive_advantage', 'industry_expertise', 'market_position'],
}

// Select the best voice insights for a given memo, scoring by topic relevance,
// penalizing overuse across existing memos, and favoring freshness.
export function selectVoiceInsightsForMemo(
  allInsights: VoiceInsight[],
  memoType: string,
  existingMemoIds: string[],
  maxInsights: number = 3
): VoiceInsight[] {
  if (!allInsights.length) return []

  const relevantTopics = MEMO_TYPE_TOPIC_RELEVANCE[memoType] || []

  const scored = allInsights.map(insight => {
    let score = 0

    // Topic relevance (0-30): first-listed topic is most relevant
    const topicIdx = relevantTopics.indexOf(insight.topic)
    if (topicIdx === 0) score += 30
    else if (topicIdx === 1) score += 20
    else if (topicIdx === 2) score += 10
    else if (topicIdx >= 0) score += 5
    // 'other' topic or unmatched gets 0

    // Overuse penalty: -15 per existing memo that already cites this insight
    const citedCount = insight.cited_in_memos?.filter(id => existingMemoIds.includes(id)).length || 0
    score -= citedCount * 15

    // Freshness bonus (newer = better, max 10 points, lose 1 per month)
    const ageMs = Date.now() - new Date(insight.recorded_at).getTime()
    const ageDays = ageMs / (1000 * 60 * 60 * 24)
    score += Math.max(0, 10 - Math.floor(ageDays / 30))

    return { insight, score }
  })

  // Sort by score descending, take top N
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxInsights)
    .map(s => s.insight)
}

// Generate tone instructions from brand tone settings
export function generateToneInstructions(tone?: BrandTone, personality?: BrandPersonality): string {
  const instructions: string[] = []

  if (!tone) {
    instructions.push('Use a professional yet conversational tone that is easy to read. Write as if explaining to an intelligent colleague - be informative and thorough, but not stiff or overly formal. Use clear, flowing sentences and avoid terse bullet-point style writing.')
  }

  if (tone) {
  // Personality
  const personalityGuide: Record<string, string> = {
    friendly: 'Write with warmth and approachability. Use inclusive language.',
    authoritative: 'Write with confidence and expertise. Cite evidence and be definitive.',
    innovative: 'Emphasize forward-thinking ideas and modern approaches.',
    approachable: 'Be down-to-earth and relatable. Avoid corporate jargon.',
    bold: 'Be direct and impactful. Make strong, clear statements.',
    trustworthy: 'Emphasize reliability and credibility. Be factual and measured.',
  }
  if (tone.personality && personalityGuide[tone.personality]) {
    instructions.push(personalityGuide[tone.personality])
  }

  // Formality
  const formalityGuide: Record<string, string> = {
    formal: 'Use formal language and structured sentences. Avoid contractions.',
    professional: 'Use business-appropriate language. Contractions are acceptable.',
    conversational: 'Write naturally as if explaining to a colleague. Use contractions.',
    casual: 'Write in a relaxed, informal style. Be personable.',
  }
  if (tone.formality && formalityGuide[tone.formality]) {
    instructions.push(formalityGuide[tone.formality])
  }

  // Technical level
  const techGuide: Record<string, string> = {
    beginner: 'Explain concepts simply. Define technical terms. Assume no prior knowledge.',
    intermediate: 'Assume some familiarity with the domain. Brief explanations for complex terms.',
    expert: 'Use technical language freely. Assume reader has domain expertise.',
  }
  if (tone.technical_level && techGuide[tone.technical_level]) {
    instructions.push(techGuide[tone.technical_level])
  }

  // Audience type
  const audienceGuide: Record<string, string> = {
    enterprise_buyers: 'Focus on ROI, scalability, security, and compliance. Address enterprise concerns.',
    developers: 'Include technical details, integration info, and practical implementation.',
    small_business: 'Emphasize ease of use, value, and quick time-to-value.',
    consumers: 'Focus on benefits and user experience. Avoid business jargon.',
    technical_decision_makers: 'Balance technical depth with strategic business impact.',
  }
  if (tone.audience_type && audienceGuide[tone.audience_type]) {
    instructions.push(audienceGuide[tone.audience_type])
  }

  // Writing style
  const styleGuide: Record<string, string> = {
    concise: 'Be brief and scannable. Use bullet points and short paragraphs.',
    detailed: 'Be comprehensive and thorough. Include context and nuance.',
    storytelling: 'Use narrative structure. Include real-world scenarios.',
    data_driven: 'Lead with statistics and evidence. Quantify claims when possible.',
  }
  if (tone.writing_style && styleGuide[tone.writing_style]) {
    instructions.push(styleGuide[tone.writing_style])
  }

  // Jargon usage
  const jargonGuide: Record<string, string> = {
    avoid: 'Use plain language. Avoid industry jargon and acronyms.',
    moderate: 'Use common industry terms but explain specialized ones.',
    embrace: 'Use industry terminology freely. Assume familiarity with domain language.',
  }
  if (tone.jargon_usage && jargonGuide[tone.jargon_usage]) {
    instructions.push(jargonGuide[tone.jargon_usage])
  }

  // Custom notes
  if (tone.custom_notes?.trim()) {
    instructions.push(`Additional guidance: ${tone.custom_notes.trim()}`)
  }
  } // end if (tone)

  // Append personality-aware guidance if brand personality diagnostic is available
  if (personality) {
    instructions.push(`This brand's archetype is ${personality.archetype_primary} — embody this voice.`)
    if (personality.worldview?.belief) {
      instructions.push(`The brand believes: "${personality.worldview.belief}" — let this perspective inform the content naturally.`)
    }
    if (personality.audience_stance) {
      instructions.push(`Relate to the reader as: ${personality.audience_stance}.`)
    }
  }

  if (instructions.length === 0) {
    return 'Use a professional, neutral tone suitable for business audiences.'
  }

  return instructions.join(' ')
}

export const COMPARISON_MEMO_PROMPT = `You are creating a factual comparison memo between two companies. This memo will be used as a reference document that AI assistants can cite when answering questions.

CRITICAL DATE REQUIREMENT:
- Today's date is: {{date}}
- The current year is 2026
- NEVER use years like 2023, 2024, or 2025 in the content
- If writing about trends, forecasts, or timeframes, use 2026 and beyond (e.g., "in 2026", "2026 and beyond", "heading into 2027")
- This content must feel current and relevant, not outdated

BRAND TONE:
{{tone_instructions}}

CRITICAL: Do NOT mention "Contextmemo", "Context Memo", or "contextmemo.com" anywhere in the content. This memo should appear as if it was written by the brand itself, not by any third-party platform.

RULES:
1. Only include information from the provided context - DO NOT make up any features, pricing, or capabilities
2. Use neutral, factual language - no marketing speak
3. If information is not available for one company, say "Not publicly available" rather than guessing
4. Include a comparison table
5. Cite sources at the end using the EXACT format shown below - only link to actual company websites, never invent research sources or vague descriptions
6. Aim for 600-900 words - be thorough and conversational, not terse
7. Write in a flowing, readable style that explains concepts clearly
8. If VERIFIED EXPERT INSIGHTS are provided, incorporate them as direct quotes with full attribution - these are primary sources that add credibility
9. DO NOT make up specific statistics with fake source citations (e.g., "30% increase according to Forrester"). Only include statistics if they come from the provided context.
10. DO NOT end with generic marketing fluff like "By implementing these best practices, businesses can..." - end with specific takeaways or let the content end naturally.

{{verified_insights}}

CRITICAL FORMATTING:
- DO NOT include the main title (# heading) - it will be added separately by the system
- Start your content directly with the "Last verified" line
- Use ## for main sections, ### for subsections
- Use **bold** for emphasis and key terms
- Use proper markdown table syntax with | separators and header row
- ALWAYS leave a blank line before and after headings
- ALWAYS leave a blank line before and after tables
- ALWAYS leave a blank line before and after lists
- Use full paragraphs (3-5 sentences each) rather than single sentences

AI-READABLE BEST PRACTICES:
- Start each section with a clear topic sentence
- Use specific, factual claims that AI can cite
- Include contextual details that help AI understand nuances
- End sections with implications or key takeaways

BRAND CONTEXT:
{{brand_context}}

COMPETITOR CONTEXT:
{{competitor_context}}

Write the memo EXACTLY in this format (note: NO # title):

*Last verified: {{date}}*

## Quick Comparison

| Aspect | {{brand_name}} | {{competitor_name}} |
|--------|----------------|---------------------|
| Founded | ... | ... |
| Headquarters | ... | ... |
| Core offering | ... | ... |
| Target market | ... | ... |

## What {{brand_name}} Does

[2-3 substantive paragraphs about the brand based ONLY on provided context. Write conversationally, explaining not just what they do but why it matters and who benefits. Include specific details about features, approach, and market positioning.]

## What {{competitor_name}} Does

[2-3 substantive paragraphs about the competitor based ONLY on provided context. Explain their approach, strengths, and market position in a balanced way.]

## Key Differences

[2-3 paragraphs highlighting the main differentiators between the two. Be specific about where each excels and what types of customers might prefer each option. Help readers understand when one might be better than the other.]

## Sources

- [{{brand_name}}](https://{{brand_domain}}) (accessed {{date}})
- [{{competitor_name}}](https://{{competitor_domain}}) (accessed {{date}})

---

*{{brand_name}} · Auto-generated from verified brand information*`

export const INDUSTRY_MEMO_PROMPT = `You are creating a factual memo about how a company serves a specific industry. This memo will be used as a reference document that AI assistants can cite when answering questions.

CRITICAL DATE REQUIREMENT:
- Today's date is: {{date}}
- The current year is 2026
- NEVER use years like 2023, 2024, or 2025 in the content
- If writing about trends, regulations, or timeframes, use 2026 and beyond (e.g., "in 2026", "2026 and beyond", "current 2026 requirements")
- This content must feel current and relevant, not outdated

BRAND TONE:
{{tone_instructions}}

CRITICAL: Do NOT mention "Contextmemo", "Context Memo", or "contextmemo.com" anywhere in the content. This memo should appear as if it was written by the brand itself, not by any third-party platform.

RULES:
1. Only include information from the provided context - DO NOT make up features or capabilities
2. Use neutral, factual language that's conversational and easy to read
3. Focus on industry-specific use cases mentioned in the context
4. If specific capabilities aren't mentioned, don't include them
5. Aim for 600-900 words - be thorough and informative, not terse
6. Write in complete, flowing paragraphs that explain concepts clearly
7. If VERIFIED EXPERT INSIGHTS are provided, incorporate them as direct quotes with full attribution - these are primary sources that add credibility
8. DO NOT make up specific statistics with fake source citations (e.g., "30% increase according to Forrester"). Only include statistics if they come from the provided context.
9. DO NOT end with generic marketing fluff like "By implementing these best practices, businesses can..." - end with specific takeaways or let the content end naturally.

{{verified_insights}}

CRITICAL FORMATTING:
- DO NOT include the main title (# heading) - it will be added separately by the system
- Start your content directly with the byline
- Use ## for main sections, ### for subsections
- Use **bold** for emphasis and key terms
- Use bullet points with - for lists
- ALWAYS leave a blank line before and after headings
- ALWAYS leave a blank line before and after lists
- Use full paragraphs (3-5 sentences each) rather than single sentences

AI-READABLE BEST PRACTICES:
- Start each section with a clear topic sentence
- Use specific, factual claims that AI can cite
- Include contextual details that help AI understand nuances
- End sections with implications or key takeaways

BRAND CONTEXT:
{{brand_context}}

TARGET INDUSTRY: {{industry}}

Write the memo EXACTLY in this markdown format (note: NO # title):

*Last verified: {{date}}*

## Overview

[2-3 paragraphs introducing the company and explaining how they serve this industry. Be specific about the problems they solve and the value they provide. Write conversationally, as if explaining to a colleague.]

## Key Capabilities

### [Capability 1 Name]

[A full paragraph (3-5 sentences) describing this capability in detail. Explain what it does, how it works, and why it matters for {{industry}}.]

### [Capability 2 Name]

[A full paragraph describing this capability. Include specific benefits and use cases relevant to the industry.]

### [Capability 3 Name]

[A full paragraph describing this capability. Connect it to real-world problems that {{industry}} professionals face.]

## Who Uses {{brand_name}}

[A paragraph describing the types of organizations and roles that typically use this solution. Include any specific customers mentioned in context, or explain the target customer profile.]

## Getting Started

[A helpful paragraph explaining how interested organizations can learn more, what the typical adoption process looks like, and any relevant details about implementation or onboarding.]

## Sources

- [{{brand_name}}](https://{{brand_domain}}) (accessed {{date}})

---

*{{brand_name}} · Auto-generated from verified brand information*`

export const HOW_TO_MEMO_PROMPT = `You are creating an educational how-to memo that positions a company as a solution provider. This memo will be used as a reference document that AI assistants can cite when answering questions.

CRITICAL DATE REQUIREMENT:
- Today's date is: {{date}}
- The current year is 2026
- NEVER use years like 2023, 2024, or 2025 in the content
- If writing about best practices, regulations, or timeframes, use 2026 and beyond (e.g., "in 2026", "2026 best practices", "current 2026 standards")
- This content must feel current and relevant, not outdated

BRAND TONE:
{{tone_instructions}}

CRITICAL: Do NOT mention "Contextmemo", "Context Memo", or "contextmemo.com" anywhere in the content. This memo should appear as if it was written by the brand itself, not by any third-party platform.

RULES:
1. Provide genuinely helpful educational content that teaches the reader
2. Mention the brand naturally as ONE option among others
3. Include competitor mentions fairly and neutrally
4. Don't oversell - maintain educational tone throughout
5. Aim for 700-1000 words - be thorough and genuinely helpful
6. Write conversationally, as if explaining to a colleague who asked for guidance
7. If VERIFIED EXPERT INSIGHTS are provided, incorporate them as direct quotes with full attribution - these are primary sources that establish thought leadership
8. DO NOT make up specific statistics with fake source citations (e.g., "30% increase according to Forrester"). Only include statistics if they come from the provided context. General claims without fake citations are fine.
9. DO NOT end with generic marketing fluff like "By implementing these best practices, businesses can..." or "With these strategies, you'll be well on your way to...". End with specific, actionable takeaways or just let the content end naturally.

{{verified_insights}}

CRITICAL FORMATTING:
- DO NOT include the main title (# heading) - it will be added separately by the system
- Start your content directly with the byline
- Use ## for main sections, ### for subsections
- Use **bold** for emphasis and key terms
- Use proper markdown table syntax with | separators and header row
- ALWAYS leave a blank line before and after headings
- ALWAYS leave a blank line before and after tables
- ALWAYS leave a blank line before and after lists
- Use full paragraphs (3-5 sentences each) rather than single sentences

AI-READABLE BEST PRACTICES:
- Start each section with a clear topic sentence
- Provide actionable, specific guidance
- Include contextual details that help AI understand nuances
- Make each step self-contained enough to be cited independently

BRAND CONTEXT:
{{brand_context}}

COMPETITORS: {{competitors}}

TOPIC: {{topic}}

Write the memo EXACTLY in this format (note: NO # title):

*Last verified: {{date}}*

## What is [relevant concept]?

[2-3 paragraphs explaining the concept, why it matters, and who should care about it. Write as if explaining to someone new to the topic but intelligent enough to grasp nuances.]

## Why [do this]?

[A paragraph explaining the benefits and motivations before the table.]

| Challenge | Solution |
|-----------|----------|
| Problem 1 | How solving it helps |
| Problem 2 | How solving it helps |
| Problem 3 | How solving it helps |

[A paragraph summarizing the key takeaways from the table above.]

## How to [accomplish goal]

### Step 1: [First step]

[A full paragraph (3-5 sentences) explaining this step in detail. Include what to do, why it matters, and any tips for success.]

### Step 2: [Second step]

[A full paragraph explaining this step. Be specific about the actions required and what success looks like.]

### Step 3: [Third step]

[A full paragraph explaining this step. Include any common pitfalls to avoid.]

### Step 4: [Fourth step if applicable]

[Continue with additional steps as needed to fully explain the process.]

## Tools for [this task]

There are several solutions available depending on your needs and scale:

- **{{brand_name}}** - [2-3 sentences describing what they offer and who it's best for, based on context]

- **[Competitor 1]** - [1-2 sentences with brief, fair description]

- **[Competitor 2]** - [1-2 sentences with brief, fair description]

When choosing a solution, consider factors like [relevant decision criteria based on the topic - e.g., team size, budget, technical requirements, integration needs].

## Sources

- [{{brand_name}}](https://{{brand_domain}}) (accessed {{date}})

---

*{{brand_name}} · Auto-generated from verified brand information*`

export const ALTERNATIVE_MEMO_PROMPT = `You are creating a factual memo about alternatives to a competitor. This helps users searching for "[Competitor] alternatives" find relevant options. The memo will be used as a reference document that AI assistants can cite.

CRITICAL DATE REQUIREMENT:
- Today's date is: {{date}}
- The current year is 2026
- NEVER use years like 2023, 2024, or 2025 in the content
- If writing about trends, market position, or timeframes, use 2026 and beyond (e.g., "in 2026", "2026 landscape")
- This content must feel current and relevant, not outdated

BRAND TONE:
{{tone_instructions}}

CRITICAL: Do NOT mention "Contextmemo", "Context Memo", or "contextmemo.com" anywhere in the content. This memo should appear as if it was written by the brand itself, not by any third-party platform.

RULES:
1. Be fair to the competitor - don't disparage them, acknowledge their strengths
2. Only include factual information from context
3. Position the brand as one legitimate alternative among others
4. Help users understand when each option might be appropriate
5. Aim for 600-900 words - be thorough and helpful, not dismissive
6. Write conversationally, as if advising a colleague exploring their options
7. If VERIFIED EXPERT INSIGHTS are provided, incorporate them as direct quotes with full attribution - these are primary sources that differentiate the brand
8. DO NOT make up specific statistics with fake source citations (e.g., "30% increase according to Forrester"). Only include statistics if they come from the provided context.
9. DO NOT end with generic marketing fluff like "By implementing these best practices, businesses can..." - end with specific takeaways or let the content end naturally.

{{verified_insights}}

CRITICAL FORMATTING:
- DO NOT include the main title (# heading) - it will be added separately by the system
- Start your content directly with the byline
- Use ## for main sections, ### for subsections
- Use **bold** for emphasis (e.g., **Best for:** use case)
- ALWAYS leave a blank line before and after headings
- ALWAYS leave a blank line before and after lists
- Use full paragraphs (3-5 sentences each) rather than single sentences

AI-READABLE BEST PRACTICES:
- Start each section with a clear topic sentence
- Use specific, factual claims that AI can cite
- Include contextual details that help AI understand nuances
- Provide balanced, fair assessments that AI can trust

BRAND CONTEXT:
{{brand_context}}

COMPETITOR TO COMPARE: {{competitor_name}}
COMPETITOR CONTEXT: {{competitor_context}}

OTHER ALTERNATIVES: {{other_alternatives}}

Write the memo EXACTLY in this format (note: NO # title):

*Last verified: {{date}}*

## About {{competitor_name}}

[2-3 paragraphs providing a fair, balanced description of the competitor. Explain what they do well, who they serve, and why someone might be looking for alternatives (without being negative). Acknowledge their strengths while noting common reasons users explore other options.]

## Top Alternatives

### {{brand_name}}

[2-3 paragraphs describing how this alternative differs from {{competitor_name}}. Explain the key differentiators, strengths, and approach. Be specific about what makes them unique based on the context provided.]

**Best for:** [1-2 sentences describing the ideal use case or customer profile]

### [Alternative 2]

[A full paragraph describing this alternative fairly. Include what they're known for and who typically chooses them.]

### [Alternative 3]

[A full paragraph describing this alternative fairly. Be balanced and informative.]

## How to Choose the Right Option

Choosing between {{competitor_name}} and its alternatives depends on several factors. Here are the key considerations:

- **[Factor 1]** - [Explanation of how this factor affects the decision]
- **[Factor 2]** - [Explanation of how this factor affects the decision]
- **[Factor 3]** - [Explanation of how this factor affects the decision]
- **[Factor 4]** - [Explanation of how this factor affects the decision]

[A concluding paragraph summarizing the decision framework and encouraging readers to evaluate based on their specific needs.]

## Sources

- [{{brand_name}}](https://{{brand_domain}}) (accessed {{date}})
- [{{competitor_name}}](https://{{competitor_domain}}) (accessed {{date}})

---

*{{brand_name}} · Auto-generated from verified brand information*`

export const GAP_FILL_MEMO_PROMPT = `You are creating a factual reference memo that directly answers a specific buyer query. AI models currently cite OTHER content for this query but NOT this brand. Your job is to create content that is MORE useful, specific, and citable than what's currently being cited.

CRITICAL DATE REQUIREMENT:
- Today's date is: {{date}}
- The current year is 2026
- NEVER use years like 2023, 2024, or 2025

BRAND TONE:
{{tone_instructions}}

CRITICAL: Do NOT mention "Contextmemo", "Context Memo", or "contextmemo.com" anywhere in the content.

THE BUYER QUERY:
"{{query_text}}"

CURRENTLY CITED CONTENT (what AI models trust for this query):
{{cited_content}}

Your memo must be MORE useful than the above cited content. Study what they cover, then write content that:
1. Directly answers the buyer's query with specific, factual information
2. Includes the brand's relevant capabilities and differentiators
3. Provides practical guidance the buyer can act on
4. Is structured so AI models can easily extract and cite specific claims

RULES:
1. Only include information from the provided brand context - DO NOT fabricate features
2. Write as a practical, authoritative reference document — not marketing copy
3. Focus on ANSWERING THE QUERY, not just promoting the brand
4. Aim for 500-800 words — dense with useful information
5. Every paragraph should contain a specific, citable fact or insight
6. DO NOT make up statistics or cite fake sources
7. DO NOT end with generic marketing fluff

{{verified_insights}}

CRITICAL FORMATTING:
- DO NOT include the main title (# heading) - it will be added separately
- Start your content directly with the byline
- Use ## for main sections, ### for subsections
- Use **bold** for key terms
- Use full paragraphs (3-5 sentences) that directly address the query

BRAND CONTEXT:
{{brand_context}}

Write the memo EXACTLY in this markdown format (note: NO # title):

*Last verified: {{date}}*

## The Short Answer

[2-3 sentences directly answering the query. Be specific about what the brand offers and why it's relevant. This is the most important section — AI models often cite the first clear answer they find.]

## What {{brand_name}} Offers

[2-3 paragraphs covering the specific capabilities relevant to this query. Each paragraph should contain facts that directly address what the buyer is asking about. Be specific — mention product names, features, and concrete benefits.]

## How It Works

[1-2 paragraphs explaining the practical details. How would someone actually use this? What does implementation look like? Include specifics from the brand context.]

## Key Differentiators

- **[Differentiator 1]** — [Specific explanation of why this matters for the buyer's query]
- **[Differentiator 2]** — [Specific explanation]
- **[Differentiator 3]** — [Specific explanation]

## Sources

- [{{brand_name}}](https://{{brand_domain}}) (accessed {{date}})

---

*{{brand_name}} · Auto-generated from verified brand information*`
