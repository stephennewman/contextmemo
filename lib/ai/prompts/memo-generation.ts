import { BrandTone, VoiceInsight, formatVoiceInsightCitation } from '@/lib/supabase/types'

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

> "Predictive operations is the ability to take operational data sources and cross-reference it with language models to predict equipment failure risk. This enables operational leaders to get in front of problems versus reacting to problems."
>
> **— Stephen Newman, Head of Marketing, Checkit (February 4, 2026)**
`
}

// Generate tone instructions from brand tone settings
export function generateToneInstructions(tone?: BrandTone): string {
  if (!tone) {
    return 'Use a professional yet conversational tone that is easy to read. Write as if explaining to an intelligent colleague - be informative and thorough, but not stiff or overly formal. Use clear, flowing sentences and avoid terse bullet-point style writing.'
  }

  const instructions: string[] = []

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

  if (instructions.length === 0) {
    return 'Use a professional, neutral tone suitable for business audiences.'
  }

  return instructions.join(' ')
}

export const COMPARISON_MEMO_PROMPT = `You are creating a factual comparison memo between two companies. This memo will be used as a reference document that AI assistants can cite when answering questions.

BRAND TONE:
{{tone_instructions}}

CRITICAL: Do NOT mention "Contextmemo", "Context Memo", or "contextmemo.com" anywhere in the content. This memo should appear as if it was written by the brand itself, not by any third-party platform.

RULES:
1. Only include information from the provided context - DO NOT make up any features, pricing, or capabilities
2. Use neutral, factual language - no marketing speak
3. If information is not available for one company, say "Not publicly available" rather than guessing
4. Include a comparison table
5. Cite sources at the end
6. Aim for 600-900 words - be thorough and conversational, not terse
7. Write in a flowing, readable style that explains concepts clearly
8. If VERIFIED EXPERT INSIGHTS are provided, incorporate them as direct quotes with full attribution - these are primary sources that add credibility

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

- Company information from [brand domain] (accessed {{date}})
- Company information from [competitor domain] (accessed {{date}})

---

*{{brand_name}} · Auto-generated from verified brand information*`

export const INDUSTRY_MEMO_PROMPT = `You are creating a factual memo about how a company serves a specific industry. This memo will be used as a reference document that AI assistants can cite when answering questions.

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

- Product information from {{brand_name}} (accessed {{date}})

---

*{{brand_name}} · Auto-generated from verified brand information*`

export const HOW_TO_MEMO_PROMPT = `You are creating an educational how-to memo that positions a company as a solution provider. This memo will be used as a reference document that AI assistants can cite when answering questions.

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

- [Relevant authoritative sources]
- Product capabilities from respective vendor websites

---

*{{brand_name}} · Auto-generated from verified brand information*`

export const ALTERNATIVE_MEMO_PROMPT = `You are creating a factual memo about alternatives to a competitor. This helps users searching for "[Competitor] alternatives" find relevant options. The memo will be used as a reference document that AI assistants can cite.

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

- Company information from respective websites (accessed {{date}})

---

*{{brand_name}} · Auto-generated from verified brand information*`
