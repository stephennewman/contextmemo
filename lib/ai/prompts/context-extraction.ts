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
  "personas": [
    {
      "id": "snake_case_id",
      "title": "Job Title (e.g., VP of Marketing, Sales Manager)",
      "seniority": "executive|manager|specialist",
      "function": "Department/function (e.g., Marketing, Sales, Operations)",
      "description": "Who this persona is and what they do",
      "phrasing_style": "How they phrase AI questions",
      "priorities": ["What they care about when evaluating solutions"],
      "detected_from": "What signal on the website indicated this",
      "is_auto_detected": true
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
  },
  "prompt_themes": [
    {
      "theme": "1-3 word keyword cluster (e.g., 'temperature monitoring', 'food safety')",
      "priority": "high|medium|low",
      "category": "product|use_case|industry|feature"
    }
  ]
}

TARGET PERSONAS - Reverse-engineer the 2-3 primary buyer personas from website signals.

Each persona should capture TWO dimensions:
1. SENIORITY - Who has the budget/authority?
   - "executive" = C-level, VP, Director with budget authority
   - "manager" = Team leads, department managers, decision influencers  
   - "specialist" = Individual contributors, entry-level, end users

2. FUNCTION - What department/role?
   - Marketing, Sales, Operations, IT, Finance, HR, Training, Product, Engineering, etc.
   - Be SPECIFIC to this company's actual buyers (e.g., "Food Safety" not just "Operations")

DETECTION SIGNALS:

For SENIORITY:
- Executive signals: "ROI", "strategic", "business impact", "cost savings", "$X million", case studies with VP/Director quotes, "enterprise", "demo" CTAs
- Manager signals: "team", "workflow", "productivity", "scale", per-seat pricing, "collaboration", admin features
- Specialist signals: "easy to use", "tutorials", "free tier", "get started", individual pricing, "learn", integrations with daily tools

For FUNCTION (look for industry-specific roles):
- What job titles are mentioned on the website?
- What problems are being solved? (compliance → Operations/Legal, campaigns → Marketing)
- What tools/integrations are highlighted? (Salesforce → Sales, HubSpot → Marketing)
- What industry jargon is used?

EXAMPLES of good personas:
- IoT monitoring software: "VP of Operations" (executive, Operations), "Quality Assurance Manager" (manager, Quality), "Compliance Officer" (specialist, Compliance)
- Marketing automation: "CMO" (executive, Marketing), "Demand Gen Manager" (manager, Marketing), "Marketing Coordinator" (specialist, Marketing)
- Developer tools: "CTO" (executive, Engineering), "Engineering Manager" (manager, Engineering), "Software Developer" (specialist, Engineering)
- HR software: "CHRO" (executive, HR), "Recruiting Manager" (manager, Talent), "HR Coordinator" (specialist, HR)
- Restaurant tech: "Franchise Owner" (executive, Operations), "Restaurant Manager" (manager, Operations), "Shift Lead" (specialist, Operations)

RULES for personas:
1. Generate exactly 2-3 personas - no more, no less
2. Each persona should be UNIQUE - different seniority OR function
3. Use job titles that match how the website talks about its customers
4. Be specific to the industry (not generic "Business Owner")
5. The id should be a slug of the title (e.g., "vp_of_marketing")
6. detected_from must cite specific text/signals from the website
7. priorities should reflect what THIS persona cares about (not generic)

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

PROMPT THEMES - Extract 5-10 critical keyword clusters (1-3 words each) that define what this brand is about:

Examples of good prompt themes:
- "temperature monitoring" (product capability)
- "food safety compliance" (use case)
- "predictive maintenance" (feature)
- "healthcare operations" (industry application)
- "cold chain monitoring" (specific solution)

Priority levels:
- "high" - Core to what the brand does (would be in top 3 keywords)
- "medium" - Important but secondary capabilities
- "low" - Relevant but not primary focus

Categories:
- "product" - Core product or service
- "use_case" - Specific problem solved
- "industry" - Target vertical
- "feature" - Key capability or functionality

Rules:
1. Only include information explicitly stated in the content
2. Leave fields empty or as empty arrays if information is not available
3. Use the exact language from the website when possible
4. Do not embellish or add marketing language
5. For brand_voice, analyze the tone: "professional" (formal business), "casual" (friendly/conversational), "technical" (industry jargon, detailed specs)
6. For target_personas, only include personas with CLEAR evidence from the website content
7. For offers, extract the EXACT CTA text as the label (e.g., "Start Your Free Trial" not just "trial")
8. For prompt_themes, extract the most specific keyword clusters - prefer "temperature monitoring" over generic "monitoring"

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

1. ALTERNATIVE/SWITCHING QUERIES (actively unhappy with competitor) - REQUIRED: 5-8 queries
   CRITICAL: For each competitor listed above, generate at least one alternative query using their EXACT name.
   - "[Competitor name] alternatives for [specific use case]"
   - "What should I switch to from [Competitor name]?"
   - "Looking for [Competitor name] replacement that [specific requirement]"
   Priority: 85-95 - These are highest intent - they're ready to switch
   NOTE: "related_competitor" MUST be set to the EXACT competitor name from the list above

2. COMPARISON/EVALUATION QUERIES (actively deciding) - REQUIRED: 5-8 queries
   CRITICAL: For each competitor listed above, generate at least one versus query using their EXACT name.
   - "[Competitor name] vs alternatives for [specific use case]"
   - "How does [Competitor name] compare for [use case]?"
   - "[Product category] comparison: [Competitor name] vs others"
   Priority: 80-90 - High intent - they're in evaluation mode
   NOTE: "related_competitor" MUST be set to the EXACT competitor name from the list above

3. SOLUTION-SEEKING QUERIES (need to solve a specific problem NOW) - 5-8 queries
   - "What tool should I use to [specific outcome]?"
   - "Recommend a [product category] for [specific situation/industry]"
   - "I need to [achieve result] - what's my best option?"
   Priority: 70-85 - High intent - they have a problem and want a solution

4. IMPLEMENTATION QUERIES (ready to adopt) - 3-5 queries
   - "Best [solution] that integrates with [common tool/platform]"
   - "What [solution] is easiest to set up for [context]?"
   - "[Solution type] for [company size/type] teams"
   Priority: 75-90 - Very high intent - they're ready to implement

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
    "query_type": "alternative" | "versus" | "solution" | "implementation",
    "priority": 1-100 (conversion likelihood if recommended),
    "related_competitor": "EXACT competitor name from list above (REQUIRED for alternative/versus queries), null for others"
  }
]

Generate 20-30 high-quality, high-intent queries. Ensure at least 10 queries have a related_competitor set.

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

ADAPT YOUR PROMPTS BASED ON SENIORITY:

For EXECUTIVE-LEVEL personas (C-suite, VP, Director with budget):
- Focus on strategic impact, ROI, competitive advantage
- Ask about business outcomes and measurable results
- Mention enterprise requirements, team-wide adoption
- Use language like "our organization", "strategic initiative", "investment"

For MANAGER-LEVEL personas (Team leads, Department managers):
- Focus on team efficiency, workflow improvements, implementation
- Ask about scalability, collaboration, day-to-day operations
- Mention team size, departmental goals, reporting
- Use language like "my team", "our department", "manage"

For SPECIALIST-LEVEL personas (Individual contributors, Entry-level):
- Focus on usability, learning curve, daily tasks
- Ask about ease of use, tutorials, specific features
- Mention personal productivity, skill development
- Use language like "I need", "help me", "easiest way to"

ADAPT YOUR PROMPTS BASED ON FUNCTION:

Use industry-specific terminology for their department/function. Examples:
- Marketing: campaigns, leads, attribution, conversion, pipeline
- Sales: CRM, pipeline, forecasting, outreach, deals
- Operations: efficiency, compliance, automation, process
- Engineering: API, integration, reliability, performance
- HR: recruiting, onboarding, engagement, retention
- Finance: reporting, compliance, audit, forecasting

---

Generate 8-12 prompts for this specific persona. Each prompt should:
1. Sound natural for how THIS persona speaks (match their seniority + function)
2. Have clear buying/evaluation intent
3. Include context specific to their role and priorities
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
