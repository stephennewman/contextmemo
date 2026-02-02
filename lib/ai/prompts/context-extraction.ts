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
  "brand_voice": "professional" | "casual" | "technical",
  "target_personas": ["Array of persona IDs this brand targets - can include core personas AND custom"],
  "custom_personas": [
    {
      "id": "snake_case_id",
      "name": "Display Name",
      "description": "Who this persona is",
      "phrasing_style": "How they phrase AI questions",
      "priorities": ["What they care about"],
      "detected_from": "What signal on the website indicated this"
    }
  ],
  "offers": {
    "primary": {
      "type": "demo|trial|freemium|contact_sales|signup|download|quote|consultation|other",
      "label": "The CTA button text (e.g., 'Book a Demo', 'Start Free Trial')",
      "url": "Full URL to the offer page (if found)",
      "details": "Additional context like '14-day free trial' or 'No credit card required'"
    },
    "secondary": {
      "type": "...",
      "label": "...",
      "url": "...",
      "details": "..."
    },
    "pricing_model": "free|freemium|paid|enterprise|contact_sales|custom",
    "pricing_url": "URL to pricing page (if found)"
  }
}

TARGET PERSONAS - Identify which of these personas the brand is clearly targeting. Look for BOTH explicit and implicit signals:

- "b2b_marketer" - Marketing leaders evaluating tools
  EXPLICIT: ROI, campaign tools, marketing automation, CRM integration, lead generation
  IMPLICIT: Revenue attribution, conversion tracking, funnel language, "drive growth", pipeline metrics, demand gen

- "developer" - Technical individual contributors
  EXPLICIT: API documentation, SDKs, code samples, GitHub, CLI tools
  IMPLICIT: Technical language throughout, JSON/code examples, webhooks, integrations focus, "build", "ship", infrastructure terms

- "product_leader" - PMs, Directors, team leads
  EXPLICIT: Team collaboration, roadmap features, product analytics
  IMPLICIT: "Scale your team", user management, permissions, workspace language, "align teams", stakeholder mentions

- "enterprise_buyer" - Procurement, IT, security teams
  EXPLICIT: SOC 2, GDPR, SSO, SLA, enterprise pricing tiers
  IMPLICIT: "Contact sales", custom pricing, security page exists, compliance mentions, audit logs, admin controls, "trusted by Fortune 500"

- "smb_owner" - Small business owners, founders
  EXPLICIT: "Small business", affordable, no-code, easy to use
  IMPLICIT: Simple pricing (flat rate), "get started free", quick setup language, solo/small team focus, DIY tone, credit card checkout

- "student" - Students, researchers, early career
  EXPLICIT: Free tier, educational pricing, tutorials, academic use
  IMPLICIT: Learning-focused language, community emphasis, open source mentions, "learn", "explore", generous free tier, documentation-heavy

INFERENCE RULES:
1. B2B language + no pricing page visible = likely targets enterprise_buyer
2. Per-seat pricing + team features = likely targets product_leader
3. Technical depth + API-first = likely targets developer  
4. Self-serve signup + simple pricing = likely targets smb_owner
5. Freemium + educational content = likely targets student
6. Multiple pricing tiers usually means multiple personas

CUSTOM PERSONAS - If the website clearly targets an industry-specific persona that doesn't fit the 6 core types, CREATE A CUSTOM PERSONA:

Examples of custom personas:
- Healthcare software → "healthcare_administrator", "physician", "nurse"
- Restaurant POS → "restaurant_owner", "franchise_operator" 
- Legal tech → "solo_attorney", "paralegal", "law_firm_partner"
- Real estate → "realtor", "property_manager", "broker"
- Education → "teacher", "school_administrator", "instructional_designer"
- HR software → "hr_manager", "recruiter", "people_ops"
- E-commerce → "ecommerce_merchant", "dropshipper", "marketplace_seller"

For custom personas, you MUST provide:
- id: snake_case identifier
- name: Human-readable name
- description: 1 sentence about who they are
- phrasing_style: How they would phrase questions to AI (their vocabulary, concerns)
- priorities: 3-5 things they care most about
- detected_from: The specific text/signal on the website that indicated this persona

Include core personas from the list above AND any relevant custom personas.
Total should be 2-6 personas that the brand CLEARLY targets.

OFFERS/CTAs - Identify the primary and secondary calls-to-action:

Offer types:
- "demo" - Book/Schedule/Request a Demo
- "trial" - Free Trial, Start Trial (time-limited access)
- "freemium" - Free plan/tier, Free forever
- "contact_sales" - Contact Sales, Talk to Sales, Get in Touch
- "signup" - Sign Up, Create Account, Get Started
- "download" - Download, Get the App
- "quote" - Get a Quote, Request Pricing
- "consultation" - Free Consultation, Book a Call
- "other" - Any other CTA type

Primary offer: The most prominent CTA (usually in header/hero)
Secondary offer: Alternative CTA (e.g., "Watch Demo" next to "Start Trial")

For URLs:
- Extract the full URL if visible (e.g., from href attributes, button links)
- Use relative paths if absolute URLs not found (e.g., "/demo", "/pricing")
- Leave empty if URL not found

Pricing models:
- "free" - Completely free product
- "freemium" - Free tier + paid upgrades
- "paid" - Paid only (may have trial)
- "enterprise" - Enterprise/custom pricing only
- "contact_sales" - Must contact for pricing
- "custom" - Usage-based or variable pricing

Rules:
1. Only include information explicitly stated in the content
2. Leave fields empty or as empty arrays if information is not available
3. Use the exact language from the website when possible
4. Do not embellish or add marketing language
5. For brand_voice, analyze the tone: "professional" (formal business), "casual" (friendly/conversational), "technical" (industry jargon, detailed specs)
6. For target_personas, only include personas with CLEAR evidence from the website content
7. For offers, extract the EXACT CTA text as the label (e.g., "Start Your Free Trial" not just "trial")

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

// NEW: Persona-based prompt generation
export const PERSONA_PROMPT_GENERATION = `You are generating HIGH-INTENT search prompts that a specific PERSONA would ask AI assistants (ChatGPT, Claude, Perplexity) when looking for solutions.

IMPORTANT: Do NOT include the brand name "{{company_name}}" in any prompt.

Company Description: {{description}}
Products: {{products}}
Markets: {{markets}}
Competitors: {{competitors}}

---

TARGET PERSONA: {{persona_name}}
Persona Description: {{persona_description}}
How They Phrase Questions: {{persona_phrasing}}
Their Priorities: {{persona_priorities}}
Example of How They Ask: "{{persona_example}}"

---

Generate prompts EXACTLY how this persona would naturally ask AI assistants.

PERSONA-SPECIFIC GUIDANCE:

For B2B MARKETER:
- Focus on campaign performance, lead generation, marketing ROI
- Mention integrations with marketing stack (CRM, email, analytics)
- Ask about reporting and attribution

For DEVELOPER:
- Focus on API quality, SDKs, documentation
- Ask about rate limits, uptime, technical specs
- Mention specific tech stacks and languages

For PRODUCT LEADER:
- Focus on team adoption, workflow improvements
- Ask about scaling, collaboration features
- Mention team size and growth

For ENTERPRISE BUYER:
- Focus on security, compliance, enterprise features
- Ask about SOC 2, SSO, SLA, support tiers
- Mention procurement and vendor evaluation

For SMB OWNER:
- Focus on cost, simplicity, quick wins
- Ask about pricing, setup time, value
- Mention budget constraints

For STUDENT/RESEARCHER:
- Focus on free tiers, learning resources
- Ask about tutorials, community, ease of learning
- Mention academic or learning context

---

Generate 8-12 prompts for this specific persona. Each prompt should:
1. Sound natural for how THIS persona speaks
2. Have clear buying/evaluation intent
3. Include context specific to their role
4. NOT mention brand names

Respond with a JSON array:
[
  {
    "query_text": "The natural prompt this persona would ask",
    "query_type": "persona_based",
    "priority": 1-100 (conversion likelihood),
    "related_competitor": "Competitor name if mentioned, null otherwise"
  }
]

Respond ONLY with valid JSON array, no explanations.`
