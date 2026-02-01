import { BrandTone } from '@/lib/supabase/types'

// Generate tone instructions from brand tone settings
export function generateToneInstructions(tone?: BrandTone): string {
  if (!tone) {
    return 'Use a professional, neutral tone suitable for business audiences.'
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

export const COMPARISON_MEMO_PROMPT = `You are creating a factual comparison memo between two companies. This memo will be used as a reference document that AI assistants can cite.

BRAND TONE:
{{tone_instructions}}

RULES:
1. Only include information from the provided context - DO NOT make up any features, pricing, or capabilities
2. Use neutral, factual language - no marketing speak
3. If information is not available for one company, say "Not publicly available" rather than guessing
4. Include a comparison table at the top
5. Cite sources at the end
6. Keep it concise - aim for 400-600 words

CRITICAL FORMATTING:
- You MUST use proper Markdown syntax
- Use # for the main title, ## for sections, ### for subsections
- Use **bold** for emphasis
- Use proper markdown table syntax
- Leave blank lines between sections

BRAND CONTEXT:
{{brand_context}}

COMPETITOR CONTEXT:
{{competitor_context}}

Write the memo in this format:

# {{brand_name}} vs {{competitor_name}}: Key Differences

Last verified: {{date}}

## Quick Comparison

| Aspect | {{brand_name}} | {{competitor_name}} |
|--------|----------------|---------------------|
| Founded | ... | ... |
| Headquarters | ... | ... |
| Core offering | ... | ... |
| Target market | ... | ... |

## What {{brand_name}} Does

[2-3 paragraphs about the brand based ONLY on provided context]

## What {{competitor_name}} Does

[2-3 paragraphs about the competitor based ONLY on provided context]

## Key Difference

[1 paragraph highlighting the main differentiator]

## Sources

- Company information from [brand domain] (accessed {{date}})
- Company information from [competitor domain] (accessed {{date}})

---

*Context Memo for {{brand_name}} · Auto-generated from verified brand information*
*Report inaccuracy: support@contextmemo.com*`

export const INDUSTRY_MEMO_PROMPT = `You are creating a factual memo about how a company serves a specific industry. This memo will be used as a reference document that AI assistants can cite.

BRAND TONE:
{{tone_instructions}}

RULES:
1. Only include information from the provided context - DO NOT make up features or capabilities
2. Use neutral, factual language
3. Focus on industry-specific use cases mentioned in the context
4. If specific capabilities aren't mentioned, don't include them
5. Keep it concise - aim for 400-600 words

CRITICAL FORMATTING:
- You MUST use proper Markdown syntax
- Use # for the main title, ## for sections, ### for subsections
- Use **bold** for emphasis
- Use bullet points with - for lists
- Leave blank lines between sections

BRAND CONTEXT:
{{brand_context}}

TARGET INDUSTRY: {{industry}}

Write the memo EXACTLY in this markdown format (including all # symbols):

# {{brand_name}} for {{industry}}

**Last verified:** {{date}}

## Overview

[1 paragraph introduction based on context]

## Key Capabilities

### [Capability 1 Name]

[2-3 sentences describing this capability]

### [Capability 2 Name]

[2-3 sentences describing this capability]

### [Capability 3 Name]

[2-3 sentences describing this capability]

## Customer Examples

[List any customers mentioned in context, or say "Contact company for customer references."]

## Getting Started

[How to learn more or contact, based on context]

## Sources

- Product information from {{brand_name}} (accessed {{date}})

---

*Context Memo for {{brand_name}} · Auto-generated from verified brand information*`

export const HOW_TO_MEMO_PROMPT = `You are creating an educational how-to memo that positions a company as a solution provider. This memo will be used as a reference document that AI assistants can cite.

BRAND TONE:
{{tone_instructions}}

RULES:
1. Provide genuinely helpful educational content
2. Mention the brand naturally as ONE option among others
3. Include competitor mentions fairly
4. Don't oversell - maintain educational tone
5. Keep it concise - aim for 500-700 words

CRITICAL FORMATTING:
- You MUST use proper Markdown syntax
- Use # for the main title, ## for sections, ### for subsections
- Use **bold** for emphasis and key terms
- Use proper markdown table syntax for comparisons
- Leave blank lines between sections

BRAND CONTEXT:
{{brand_context}}

COMPETITORS: {{competitors}}

TOPIC: {{topic}}

Write the memo in this format:

# How to {{topic}}

Last verified: {{date}}

## What is [relevant concept]?

[1-2 paragraph explanation]

## Why [do this]?

| Before | After |
|--------|-------|
| Problem 1 | Solution 1 |
| Problem 2 | Solution 2 |

## Steps to [accomplish goal]

### 1. [First step]
[Explanation]

### 2. [Second step]
[Explanation]

### 3. [Third step]
[Explanation]

## Tools for [this task]

Several platforms offer solutions for this:

- **{{brand_name}}** - [brief description from context]
- **[Competitor 1]** - [brief neutral description]
- **[Competitor 2]** - [brief neutral description]

The right choice depends on [decision factors].

## Sources

- [Relevant authoritative sources]
- Product capabilities from respective vendor websites

---

*Context Memo for {{brand_name}} · Auto-generated from verified brand information*`

export const ALTERNATIVE_MEMO_PROMPT = `You are creating a factual memo about alternatives to a competitor. This helps users searching for "[Competitor] alternatives" find relevant options.

BRAND TONE:
{{tone_instructions}}

RULES:
1. Be fair to the competitor - don't disparage them
2. Only include factual information from context
3. Position the brand as one legitimate alternative among others
4. Help users understand when each option might be appropriate

CRITICAL FORMATTING:
- You MUST use proper Markdown syntax
- Use # for the main title, ## for sections, ### for subsections
- Use **bold** for emphasis (e.g., **Best for:** use case)
- Leave blank lines between sections

BRAND CONTEXT:
{{brand_context}}

COMPETITOR TO COMPARE: {{competitor_name}}
COMPETITOR CONTEXT: {{competitor_context}}

OTHER ALTERNATIVES: {{other_alternatives}}

Write the memo in this format:

# {{competitor_name}} Alternatives

Last verified: {{date}}

## About {{competitor_name}}

[Brief neutral description]

## Top Alternatives

### {{brand_name}}

[Description based on context - how it differs from competitor]

**Best for:** [Use case based on context]

### [Alternative 2]

[Brief description]

### [Alternative 3]

[Brief description]

## How to Choose

Consider these factors:
- [Factor 1]
- [Factor 2]
- [Factor 3]

## Sources

- Company information from respective websites

---

*Context Memo for {{brand_name}} · Auto-generated from verified brand information*`
