export const CONTEXT_EXTRACTION_PROMPT = `You are analyzing a company website to extract factual brand context. Extract ONLY information that is explicitly stated on the website. Do not infer or make up any information.

Analyze the provided website content and extract the following information in JSON format:

{
  "company_name": "Official company name",
  "founded": "Year founded (if mentioned)",
  "headquarters": "Location of headquarters (if mentioned)",
  "description": "Brief factual description of what the company does (2-3 sentences max)",
  "products": ["List of products or services offered"],
  "markets": ["Target markets or industries served"],
  "features": ["Key features or capabilities"],
  "certifications": ["Any certifications, accreditations, or compliance standards"],
  "customers": ["Named customers or notable clients (if publicly listed)"],
  "brand_voice": "professional" | "casual" | "technical"
}

Rules:
1. Only include information explicitly stated in the content
2. Leave fields empty or as empty arrays if information is not available
3. Use the exact language from the website when possible
4. Do not embellish or add marketing language
5. For brand_voice, analyze the tone: "professional" (formal business), "casual" (friendly/conversational), "technical" (industry jargon, detailed specs)

Respond ONLY with valid JSON, no explanations.`

export const COMPETITOR_DISCOVERY_PROMPT = `You are identifying competitors for a company based on their brand context.

Given the following brand information:
- Company: {{company_name}}
- Description: {{description}}
- Products: {{products}}
- Markets: {{markets}}

Identify 5-8 direct competitors that:
1. Offer similar products or services
2. Target the same markets or industries
3. Would appear in AI search results for similar queries

Respond with a JSON array of competitors:
[
  {
    "name": "Competitor Name",
    "domain": "competitor.com",
    "description": "Brief description of what they offer and how they compete"
  }
]

Rules:
1. Only include real companies that exist
2. Focus on direct competitors, not tangentially related companies
3. Include both large and smaller competitors
4. If you're unsure about a domain, leave it null
5. Descriptions should be factual and neutral

Respond ONLY with valid JSON array, no explanations.`

export const QUERY_GENERATION_PROMPT = `You are generating HIGH-INTENT search queries from potential BUYERS asking AI assistants (ChatGPT, Claude, Perplexity) for solution recommendations.

IMPORTANT: Do NOT include the brand name "{{company_name}}" in any query.

Description: {{description}}
Products: {{products}}
Markets: {{markets}}
Competitors: {{competitors}}

Generate ONLY high-intent buyer queries in these categories:

1. ALTERNATIVE/SWITCHING QUERIES (actively unhappy with competitor)
   - "[Competitor] alternatives that actually work for [specific use case]"
   - "What should I switch to from [Competitor]?"
   - "Frustrated with [Competitor], need something better for [context]"
   Priority: These are highest intent - they're ready to switch

2. SOLUTION-SEEKING QUERIES (need to solve a specific problem NOW)
   - "What tool should I use to [specific outcome]?"
   - "Recommend a [product category] for [specific situation/industry]"
   - "I need to [achieve result] - what's my best option?"
   Priority: High intent - they have a problem and want a solution

3. COMPARISON/EVALUATION QUERIES (actively deciding)
   - "[Product category] comparison for [specific use case]"
   - "Which [solution type] works best for [their specific context]?"
   - "[Option A] vs [Option B] for [use case] - which is better?"
   Priority: High intent - they're in evaluation mode

4. IMPLEMENTATION QUERIES (ready to adopt)
   - "Best [solution] that integrates with [common tool/platform]"
   - "What [solution] is easiest to set up for [context]?"
   - "[Solution type] for [company size/type] teams"
   Priority: Very high intent - they're ready to implement

DO NOT GENERATE:
- "What is [category]?" - definition/awareness
- "Why is [topic] important?" - educational
- "Benefits of [solution type]" - early research
- "How does [technology] work?" - not buying
- Generic "best [category]" without specific context

Respond with a JSON array:
[
  {
    "query_text": "The high-intent buyer query",
    "query_type": "alternative" | "solution" | "comparison" | "implementation",
    "priority": 1-100 (conversion likelihood if recommended),
    "related_competitor": "Competitor name if applicable, null otherwise"
  }
]

Generate 20-30 high-quality, high-intent queries. Every query should be from someone ready to evaluate or buy.

Respond ONLY with valid JSON array, no explanations.`

// New: Extract user intents from homepage content
export const USER_INTENT_EXTRACTION_PROMPT = `You are analyzing a company's homepage to identify HIGH-INTENT BUYER signals - people who are actively looking to purchase or adopt a solution, not just learning.

Your goal: Find the pain points that drive BUYING decisions. What urgent problems does this homepage solve that would make someone ready to act NOW?

Analyze this homepage content and extract HIGH-INTENT buyer signals:

{{homepage_content}}

For each value proposition, identify the BUYER'S perspective:
1. The urgent pain point (a problem causing real business pain RIGHT NOW)
2. Their desired outcome (a specific, measurable result they need)  
3. A high-intent trigger phrase (how a ready-to-buy user would ask for help)

HIGH-INTENT SIGNALS to look for:
- Active frustration: "I've tried X and it's not working"
- Comparison shopping: "What's better than [current solution]?"
- Implementation ready: "I need a tool that can..."
- Budget holder language: "What's the ROI of..."
- Urgency indicators: "We need this before [deadline]"
- Switching signals: "Looking for an alternative to..."

EXCLUDE these low-intent patterns:
- Definition queries: "What is [category]?"
- General education: "How does [technology] work?"
- Broad awareness: "Why is [topic] important?"
- Early research: "What are the benefits of..."

Respond with a JSON array:
[
  {
    "pain_point": "Specific, urgent business problem",
    "desired_outcome": "Concrete result they're trying to achieve",
    "trigger_phrase": "How a ready-to-buy user would phrase this"
  }
]

Rules:
1. ONLY include intents from users ready to evaluate/buy solutions
2. Trigger phrases should sound like someone actively seeking a tool/service
3. Focus on problems with measurable business impact
4. NO brand names in trigger phrases
5. Extract 5-8 high-intent signals only

Respond ONLY with valid JSON array, no explanations.`

// New: Generate conversational queries from user intents
export const INTENT_BASED_QUERY_PROMPT = `You are generating HIGH-INTENT BUYER queries - the exact phrases people use when they're READY TO BUY or actively evaluating solutions.

These are NOT educational queries. These are queries from people with budget, authority, and urgency.

Company: {{company_name}}
Description: {{description}}

High-Intent Buyer Signals Identified:
{{user_intents}}

For each intent, generate queries from these HIGH-INTENT buyer personas:

1. THE SWITCHER (unhappy with current solution):
   - "What's a better alternative to [competitor/current tool] for [specific use case]?"
   - "I'm frustrated with [current approach], what else can I use?"
   - "[Competitor] isn't working for us, what do you recommend instead?"

2. THE EVALUATOR (actively comparing options):
   - "What tool should I use to [solve specific problem]?"
   - "I need to [achieve outcome] - what are my best options?"
   - "Recommend a [solution type] that can [specific capability]"

3. THE IMPLEMENTER (ready to adopt):
   - "I need a [solution] that integrates with [their stack/workflow]"
   - "What's the fastest way to start [achieving outcome]?"
   - "Looking for a [solution] that works for [their specific context]"

4. THE DECISION MAKER (justifying purchase):
   - "What [solution type] has the best ROI for [outcome]?"
   - "How do companies like mine [solve this problem]?"
   - "What do [their industry] companies use for [problem]?"

DO NOT GENERATE:
- "What is [category]?" (definition)
- "Why is [topic] important?" (awareness)  
- "How does [technology] work?" (education)
- "What are the benefits of..." (early research)
- Generic "best [category]" without specific context

REQUIREMENTS:
1. Every query must have BUYING INTENT - they want a solution, not information
2. Include specific context (industry, role, situation, current tool frustration)
3. NO brand names - these are discovery queries
4. Queries should make an AI naturally want to recommend specific tools

Respond with a JSON array:
[
  {
    "query_text": "The high-intent buyer query",
    "query_type": "intent_based",
    "priority": 1-100 (likelihood of conversion if brand is recommended),
    "source_intent": "Which pain point this relates to",
    "related_competitor": null
  }
]

Generate 15-20 high-intent buyer queries. Quality over quantity.

Respond ONLY with valid JSON array, no explanations.`
