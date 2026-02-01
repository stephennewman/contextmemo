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

export const QUERY_GENERATION_PROMPT = `You are generating search queries that potential customers might ask AI assistants (ChatGPT, Claude, Perplexity) when looking for solutions like {{company_name}} offers.

IMPORTANT: Do NOT include the brand name "{{company_name}}" in any query. We want generic queries where the brand needs to earn visibility, not queries that obviously mention the brand.

Description: {{description}}
Products: {{products}}
Markets: {{markets}}
Competitors: {{competitors}}

Generate search queries in these categories:

1. ALTERNATIVE QUERIES (users looking for alternatives to competitors)
   - "[Competitor] alternatives"
   - "Companies like [Competitor]"
   - "[Competitor] vs alternatives"

2. SOLUTION QUERIES (looking for solutions by category)
   - "Best [product category] for [market]"
   - "Top [product category] software"
   - "[product category] tools for [use case]"

3. HOW-TO QUERIES (educational - problems the product solves)
   - "How to [solve problem the product addresses]"
   - "How to choose [product category]"
   - "How to improve [metric the product helps with]"

4. BEST-OF QUERIES (listicle-style)
   - "Best [product category] in 2024"
   - "Top tools for [market/industry]"
   - "[product category] comparison"

5. INDUSTRY QUERIES (market-specific)
   - "[product category] for [specific industry]"
   - "[industry] [product category] solutions"

Respond with a JSON array:
[
  {
    "query_text": "The exact query users would type",
    "query_type": "alternative" | "solution" | "how_to" | "best_of" | "industry",
    "priority": 1-100 (how important/common this query is),
    "related_competitor": "Competitor name if applicable, null otherwise"
  }
]

Generate 30-50 queries covering all categories. Prioritize queries that:
1. Are commonly asked by potential customers
2. Have clear commercial intent
3. Do NOT mention the brand name - these are queries where visibility must be earned
4. Represent real opportunities to capture AI recommendation traffic

Respond ONLY with valid JSON array, no explanations.`
