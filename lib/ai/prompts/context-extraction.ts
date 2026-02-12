export const CONTEXT_EXTRACTION_PROMPT = `You are analyzing a company website to extract factual brand context AND comprehensive corporate positioning. Extract ONLY information that is explicitly stated or can be reasonably inferred from the website. Be thorough - this positioning framework will be used for content generation and AI visibility.

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
  ],
  "brand_personality": {
    "voice_traits": {
      "formal_casual": 1-5,
      "warm_cool": 1-5,
      "assertive_tentative": 1-5,
      "playful_serious": 1-5,
      "poetic_literal": 1-5
    },
    "archetype_primary": "The Sage|The Hero|The Creator|The Explorer|The Ruler|The Caregiver|The Magician|The Outlaw|The Everyman|The Lover|The Jester|The Innocent",
    "archetype_secondary": "Optional secondary archetype",
    "worldview": {
      "belief": "First-person: We believe... (the core conviction driving the brand)",
      "problem": "First-person: The problem we see... (what's broken that we fix)",
      "future": "First-person: We're building toward... (the future state we create)",
      "tension": "First-person: What we're up against... (the obstacle or status quo we fight)"
    },
    "audience_stance": "First-person declaration: e.g. 'We are your competitive intelligence team for the AI era.'",
    "emotional_register": {
      "primary": "The feeling we want people to walk away with (e.g. urgency, confidence, clarity)",
      "secondary": "Secondary feeling",
      "intensity": "low|medium|high"
    },
    "personality_summary": "A first-person paragraph: 'We are...' — written as the brand introducing itself. Authoritative, specific, no fluff. NOT a third-party description."
  },
  "corporate_positioning": {
    "mission_statement": "The company's mission - why they exist, what problem they solve (1-2 sentences)",
    "vision_statement": "Where the company is headed - the future state they're creating (1-2 sentences)",
    "primary_verticals": [
      "• Industry 1 - specific sub-segments served",
      "• Industry 2 - specific sub-segments served"
    ],
    "buyer_personas": [
      "• Persona Title - responsibilities, pain points, what they're looking for",
      "• Persona Title - responsibilities, pain points, what they're looking for"
    ],
    "user_personas": [
      "• User Type - how they interact with the product, their daily challenges",
      "• User Type - how they interact with the product, their daily challenges"
    ],
    "core_value_promise": "One-sentence value proposition - what the customer gets and why it matters",
    "key_benefits": [
      "Benefit statement with specific outcome",
      "Benefit statement with specific outcome"
    ],
    "proof_points": [
      "Trust signal - customer logos, stats, awards, certifications",
      "Trust signal - customer logos, stats, awards, certifications"
    ],
    "differentiators": [
      {
        "name": "Short Differentiator Name (3-5 words)",
        "detail": "Full explanation of what makes this unique and why it matters to buyers (2-3 sentences)"
      }
    ],
    "messaging_pillars": [
      {
        "name": "Pillar Name (1 word like 'Predictability' or 'Simplicity')",
        "supporting_points": [
          "Specific proof point or capability that supports this pillar",
          "Another supporting statement"
        ]
      }
    ],
    "pitch_10_second": "One sentence that explains what the company does and for whom",
    "pitch_30_second": "A short paragraph (3-4 sentences) that covers problem, solution, and key differentiator",
    "pitch_2_minute": "A complete pitch covering: 1) The problem, 2) The solution, 3) Key benefits, 4) How it works, 5) Proof points, 6) Call to action",
    "objection_responses": [
      {
        "objection": "Common objection buyers have (e.g., 'We already have a system')",
        "response": "How to address this objection with specifics"
      }
    ],
    "competitive_positioning": "One paragraph explaining how the company positions against competitors",
    "win_themes": [
      "Key theme that wins deals (e.g., 'Unified platform vs. point solutions')",
      "Another win theme"
    ],
    "competitive_landmines": [
      "Question to ask competitors that exposes their weakness",
      "Another landmine question"
    ]
  }
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

---

BRAND PERSONALITY - Reverse-engineer the brand's voice and persona from website copy:

This is a DIAGNOSTIC profile, not creative writing. Use only evidence from the text.

**Voice Traits** - Rate each on a 1-5 scale:
- formal_casual: 1=Very Formal (e.g., "We provide enterprise solutions"), 5=Very Casual (e.g., "Hey, let's fix that")
- warm_cool: 1=Very Warm (empathetic, personal), 5=Very Cool (detached, analytical)
- assertive_tentative: 1=Very Assertive ("The best solution"), 5=Very Tentative ("One option to consider")
- playful_serious: 1=Very Playful (humor, creativity), 5=Very Serious (gravitas, no-nonsense)
- poetic_literal: 1=Very Poetic (metaphorical, evocative), 5=Very Literal (direct, factual)

**Brand Archetype** - Map to the dominant Jungian archetype:
- The Sage (knowledge, truth) - The Hero (mastery, achievement) - The Creator (innovation, vision)
- The Explorer (freedom, discovery) - The Ruler (control, stability) - The Caregiver (service, protection)
- The Magician (transformation) - The Outlaw (revolution, disruption) - The Everyman (belonging, trust)
- The Lover (passion, connection) - The Jester (joy, levity) - The Innocent (optimism, simplicity)

**Worldview** - What the brand believes:
- belief: The brand's core conviction about the world
- problem: What the brand sees as broken or inadequate
- future: The better world the brand is pushing toward
- tension: Who or what stands in the way

**Audience Stance** - How the brand relates to the reader:
- e.g., "Authority guiding practitioners", "Challenger pushing executives to think differently", "Peer collaborating with equals"

**Emotional Register** - What the reader should feel:
- primary: The dominant emotion (e.g., "confidence", "urgency", "empowerment")
- intensity: How strongly the brand pushes this emotion

**Personality Summary** - One paragraph describing the brand as if it were a person. No jargon.

---

CORPORATE POSITIONING - Extract a comprehensive strategic messaging framework:

This is critical for generating consistent, high-quality content. Be thorough and extract as much as possible from the website.

**Section 1: Mission & Vision (2 fields)**
- mission_statement: The company's purpose - why they exist beyond making money. Look for "Our Mission", "About Us", or purpose statements. Example: "To eliminate unnecessary operational waste that costs companies precious time, money, and opportunities."
- vision_statement: The future state they're working toward. Look for "Our Vision" or aspirational language. Example: "To turn operational waste into predictive operations."

**Section 2: Target Markets (3 fields)**
- primary_verticals: List each industry/vertical with specific sub-segments. Format as "• Industry - sub-segments". Example: "• Food & Beverage - restaurants, food manufacturing, commercial kitchens"
- buyer_personas: Decision-makers who evaluate and purchase. Include title, responsibilities, and what they're looking for. Different from the structured personas field - these are prose descriptions for messaging.
- user_personas: End users who interact with the product daily. Include what they do and their challenges.

**Section 3: Value Proposition (3 fields)**
- core_value_promise: The single most important value statement. Should answer "What do we do and why does it matter?" in one sentence.
- key_benefits: 4-8 specific, outcome-oriented benefits. Use action verbs. Example: "Improve margins through operational efficiency"
- proof_points: Trust signals that back up claims - customer logos, statistics, awards, compliance certifications, case study results.

**Section 4: Key Differentiators (3 differentiators with name + detail)**
What makes this company UNIQUE vs competitors. Each differentiator needs:
- name: A memorable 3-5 word label (e.g., "Predictive Operations Platform")
- detail: 2-3 sentences explaining what this means and why it matters

Good differentiators are specific and defensible, not generic ("great customer service").

**Section 5: Messaging Pillars (3 pillars with name + supporting points)**
Core themes that should appear consistently across all communications:
- name: One-word pillar (e.g., "Predictability", "Scalability", "Simplicity")
- supporting_points: 3-5 specific capabilities or proof points that support this pillar

**Section 6: Elevator Pitches (3 fields)**
- pitch_10_second: One sentence - who we are, what we do, for whom
- pitch_30_second: 3-4 sentences covering problem → solution → key differentiator
- pitch_2_minute: Complete narrative covering problem → solution → how it works → benefits → proof → CTA

**Section 7: Objection Handling (3 objection + response pairs)**
Common buyer objections and how to address them:
- "We already have a system" → Explain why this is different/better
- "It seems expensive" → ROI justification
- "Our team won't adopt it" → Ease of use, training support

**Section 8: Competitive Stance (3 fields)**
- competitive_positioning: One paragraph on how we position vs competitors
- win_themes: 3-5 themes that win deals (e.g., "Unified platform vs. point solutions")
- competitive_landmines: Questions to ask competitors that expose their weaknesses

---

EXTRACTION RULES:
1. For FACTUAL fields (company_name, products, customers, certifications, offers): only include information explicitly stated or clearly implied in the content. Leave empty if not available.
2. For STRATEGIC fields (corporate_positioning, brand_personality): ALWAYS synthesize from the available evidence. These fields are never stated literally on websites — they must be inferred from messaging, products, and market position. NEVER leave strategic fields empty if you have any company context to work with.
3. Use the exact language from the website when possible for factual fields.
4. Do not embellish factual fields, but strategic fields should be substantive and specific.
5. For brand_voice, analyze the tone: "professional" (formal business), "casual" (friendly/conversational), "technical" (industry jargon, detailed specs)
6. For target_personas, only include personas with CLEAR evidence from the website content
7. For offers, extract the EXACT CTA text as the label (e.g., "Start Your Free Trial" not just "trial")
8. For prompt_themes, extract the most specific keyword clusters - prefer "temperature monitoring" over generic "monitoring"
9. For corporate_positioning, be THOROUGH - this data powers content generation. Fill ALL 8 sections. Synthesize messaging_pillars from repeated themes, elevator_pitches from the value proposition, objection_responses from likely buyer concerns, and competitive_stance from differentiators.
10. The goal is to produce a profile that is at least 70% complete from a single extraction pass. Do not leave positioning fields empty.

Respond ONLY with valid JSON, no explanations.`

// Second-pass enrichment: focused on filling corporate positioning gaps
// Only called when the initial extraction leaves strategic fields empty
export const POSITIONING_ENRICHMENT_PROMPT = `You are a B2B positioning strategist. You've been given a company's extracted website data and need to SYNTHESIZE the missing strategic positioning fields.

Unlike extraction (which only captures what's stated), your job is to INFER and GENERATE strategic positioning from the available evidence. These fields are never explicitly on a website — they must be constructed from the company's messaging, products, markets, and value proposition.

## COMPANY CONTEXT
Company: {{company_name}}
Description: {{description}}
Products: {{products}}
Markets: {{markets}}
Features: {{features}}
Customers: {{customers}}
Mission: {{mission_statement}}
Value Promise: {{core_value_promise}}
Existing Differentiators: {{differentiators}}

## YOUR TASK
Fill in ONLY the missing fields listed below. Do not modify fields that already have values.

{{missing_fields_instructions}}

## RULES
1. Be SPECIFIC to this company — no generic business platitudes
2. Ground everything in the company's actual products, markets, and capabilities
3. For objection handling, think about what a skeptical buyer in their market would ask
4. For competitive stance, infer from their differentiators and market position
5. For messaging pillars, identify the 3 most repeated themes across their messaging
6. For elevator pitches, build from their value promise and key benefits
7. For target markets, use the company's actual markets and personas data
8. Write in a professional, concise tone matching the brand voice
9. Every field must have substantive content — no placeholder text

Respond ONLY with valid JSON containing the missing fields. Do not include fields that were already filled.`

export const COMPETITOR_DISCOVERY_PROMPT = `You are identifying ENTITIES that are relevant to a B2B software/service company - both direct competitors AND other important entities in their space (publishers, associations, analysts, etc.).

## COMPANY TO ANALYZE
- Company Name: {{company_name}}
- Website Domain: {{domain}}
- Description: {{description}}
- Core Products/Services: {{products}}
- Target Markets/Industries: {{markets}}
- Key Features: {{features}}

## ENTITIES MENTIONED ON THEIR WEBSITE
These were found mentioned on the website:
{{mentioned_competitors}}

## PREVIOUSLY DELETED ENTITIES
DO NOT suggest these - the user has already rejected them:
{{deleted_competitors}}

## YOUR TASK
Identify 8-12 relevant ENTITIES in these categories:

### 1. PRODUCT COMPETITORS (3-5 entities)
Direct competitors selling similar solutions:
- Sell to the SAME buyer personas
- Solve the SAME core problem
- Would appear in a buyer's shortlist

### 2. PUBLISHERS & CONTENT SOURCES (1-3 entities)
Important content sources in this space:
- Industry blogs, educational sites
- Content platforms that write about this space
- Potential content partnership opportunities

### 3. ASSOCIATIONS & ACCREDITING BODIES (1-2 entities)
Organizations that matter in this industry:
- Industry associations
- Certification/accreditation bodies
- Professional organizations

### 4. ANALYSTS & MARKETPLACES (1-2 entities)
Market influencers:
- Analyst firms covering this space (if applicable)
- Software marketplaces (G2, Capterra, etc.)
- Industry influencers

## ENTITY TYPES
Classify each entity as ONE of these types:
- "product_competitor" - Direct product competitor
- "publisher" - Content publisher, blog, educational resource
- "accrediting_body" - Certification/accreditation organization
- "association" - Industry association, professional organization
- "news_outlet" - News media, press outlet
- "analyst" - Industry analyst firm (Gartner, Forrester)
- "influencer" - Industry influencer, thought leader
- "marketplace" - Software marketplace/directory (G2, Capterra)
- "partner" - Integration/channel partner
- "research_institution" - University, research lab
- "other" - Other entity type

## PARTNERSHIP POTENTIAL
For NON-competitors, assess partnership potential:
- Publishers → Guest posts, backlinks, co-marketing
- Associations → Membership, speaking opportunities, certification
- Analysts → Inclusion in reports, briefings
- Influencers → Reviews, mentions, endorsements

## CRITICAL RULES

### DO Include:
- All direct product competitors you're confident about
- Publishers/blogs that the target audience reads
- Associations where target customers are members
- Marketplaces where buyers research solutions

### DO NOT Include:
- Generic tech giants unless they have a SPECIFIC competing product
- Companies from the "deleted" list
- Entities you're not confident actually exist
- Entities without a clear domain

### BLOCKLIST - NEVER suggest these (they are too generic or common tools):
- Single generic words: "Customer", "SEO", "Seamless", "Marketing", "Sales", "Analytics", "Data", "Cloud", "AI"
- Common CRM/marketing tools that brands USE (not compete with): HubSpot, Salesforce, Marketo, Pardot, Mailchimp, Klaviyo, Intercom, Zendesk, Drift, Segment
- Integration tools: Zapier, Make, Workato, Tray.io
- Project management tools (unless actually competing): Monday.com, Asana, Trello, Notion, ClickUp, Jira, Wrike, Hive, Basecamp
- Communication tools: Slack, Microsoft Teams, Zoom
- Cloud providers: AWS, Azure, Google Cloud

### IMPORTANT TYPE ASSIGNMENTS:
- Gartner, Forrester, IDC → "analyst" (NOT product_competitor)
- G2, Capterra, GetApp, TrustRadius, SourceForge → "marketplace" (NOT product_competitor)
- TechCrunch, VentureBeat, Forbes, Wired → "publisher" (NOT product_competitor)

## OUTPUT FORMAT
Respond with a JSON array:
[
  {
    "name": "Exact Entity Name",
    "domain": "entity.com",
    "description": "1-2 sentences: What they do and why they're relevant",
    "entity_type": "product_competitor|publisher|accrediting_body|association|news_outlet|analyst|influencer|marketplace|partner|research_institution|other",
    "confidence": "high" | "medium",
    "competition_type": "direct" | "partial" | "none",
    "is_partner_candidate": true | false,
    "partnership_opportunity": "Brief description of partnership potential (for non-competitors)",
    "reasoning": "Why this entity is relevant"
  }
]

confidence:
- "high" = You're certain this entity is relevant and exists
- "medium" = Likely relevant but less certain

competition_type:
- "direct" = Head-to-head product competitor
- "partial" = Some competitive overlap
- "none" = Not a competitor (publisher, association, etc.)

Only include entities with "high" or "medium" confidence.

Respond ONLY with valid JSON array, no explanations.`

// Focused competitor research prompt - finds TRUE product competitors even with minimal context
// Uses multiple research angles and works from the model's training knowledge
export const COMPETITOR_RESEARCH_PROMPT = `You are a competitive intelligence researcher. Your job is to identify the TRUE direct product competitors for a specific company.

## COMPANY TO RESEARCH
- Company Name: {{company_name}}
- Website Domain: {{domain}}
- Description: {{description}}
- Products/Services: {{products}}
- Target Markets: {{markets}}
- Key Features: {{features}}

## EXISTING ENTITIES (already tracked - do NOT repeat these)
{{existing_entities}}

## PREVIOUSLY REJECTED (do NOT suggest these)
{{rejected_entities}}

## YOUR TASK
Identify 8-15 TRUE PRODUCT COMPETITORS - companies that a buyer would evaluate alongside this company.

## RESEARCH ANGLES (use ALL of these to find competitors)

### 1. SAME-PROBLEM COMPETITORS
Who else solves the exact same core problem for the same buyer?
Think: "If I'm a {{primary_persona}} looking to solve {{core_problem}}, what companies would be on my shortlist?"

### 2. COMPARISON SITE COMPETITORS
What companies appear on comparison pages (G2, Capterra, TrustRadius) in the same category?
Think: "What category would this company be listed under, and who else is in that category?"

### 3. "VS" PAGE COMPETITORS
What companies does this brand (or would this brand) write "vs" comparison pages about?
Think: "What would {{company_name}} vs _____ look like?"

### 4. BUDGET ALTERNATIVES
Who competes at different price points - both cheaper alternatives and premium alternatives?
Think: "What would a buyer consider if {{company_name}} is too expensive? Too basic?"

### 5. ADJACENT COMPETITORS
Who is expanding into this space from an adjacent market?
Think: "What larger platforms are adding features that compete with {{company_name}}?"

## CRITICAL RULES

### MUST BE TRUE COMPETITORS:
- They sell a product/service to the SAME buyer persona
- A buyer would realistically evaluate them alongside {{company_name}}
- They solve the SAME or very similar core problem
- They would appear in the same G2/Capterra category

### DO NOT INCLUDE:
- Companies from the "existing" or "rejected" lists
- Generic tech giants (AWS, Google, Microsoft) unless they have a SPECIFIC competing product
- Consulting firms, system integrators, or agencies (Accenture, Deloitte, etc.) unless they sell competing SOFTWARE
- Tools the company USES (CRM, project management, etc.) that aren't in the same market
- Publishers, analysts, marketplaces, associations — this is ONLY for product competitors
- Companies you're not confident actually exist

### QUALITY OVER QUANTITY:
- Only include companies you're genuinely confident are real competitors
- It's better to return 5 high-confidence competitors than 15 questionable ones
- If you're unsure about the company's exact space, say so in the reasoning

## OUTPUT FORMAT
Respond with a JSON array:
[
  {
    "name": "Exact Company Name",
    "domain": "company.com",
    "description": "1-2 sentences: what they sell and why they're a competitor",
    "confidence": "high" | "medium",
    "competition_type": "direct" | "partial",
    "research_angle": "same_problem" | "comparison_site" | "vs_page" | "budget_alternative" | "adjacent",
    "reasoning": "Why a buyer would compare them to {{company_name}}"
  }
]

confidence:
- "high" = You're certain this is a real competitor in this space
- "medium" = Likely a competitor but less certain about the overlap

competition_type:
- "direct" = Head-to-head, same buyer, same problem
- "partial" = Significant overlap but not identical offering

Respond ONLY with valid JSON array, no explanations.`

// Entity revalidation prompt - pressure-tests whether existing entities are TRUE competitors
// Used to clean up noisy entity lists after initial discovery
export const ENTITY_REVALIDATION_PROMPT = `You are an entity classification expert. Your job is to audit a list of entities tracked as "competitors" for a specific company and determine which ones are ACTUALLY relevant.

## THE COMPANY
- Company Name: {{company_name}}
- Website Domain: {{domain}}
- Description: {{description}}
- Products/Services: {{products}}
- Target Markets: {{markets}}
- Key Features: {{features}}

## THE CORE QUESTION FOR EACH ENTITY
"Would a buyer evaluating {{company_name}} also evaluate this entity as an alternative solution?"

If YES → it's a true product_competitor.
If NO → classify it correctly or mark it as irrelevant.

## ENTITIES TO EVALUATE
{{entities_list}}

## CLASSIFICATION RULES

### product_competitor (keep active)
- Sells a product/service that solves the SAME core problem
- A buyer would realistically compare them to {{company_name}}
- Would appear in the same G2/Capterra/TrustRadius category
- Examples for an OKR tool: other OKR software, goal-setting platforms, performance management tools with OKR features

### technology (deactivate)
- Tech companies that are NOT in the same market
- Tools the company might USE, but not compete with
- Cloud providers, dev tools, APIs, etc. that serve a completely different buyer
- Examples: AWS, Docker, Postman, Stripe

### consultant (deactivate)
- Consulting firms, system integrators, professional services
- Examples: Accenture, Deloitte, Infosys, TCS, Wipro

### publisher (deactivate)
- Media, blogs, news outlets, content sites
- Examples: TechCrunch, Forbes, PCMag

### marketplace (deactivate)
- Review sites, directories, comparison platforms
- Examples: G2, Capterra, TrustRadius

### infrastructure (deactivate)
- Cloud platforms, hosting, DevOps tools
- Examples: AWS, Azure, Google Cloud Platform

### irrelevant (deactivate)
- No meaningful connection to the company's market
- Misclassified during initial discovery
- Generic terms that aren't real products

## CRITICAL: BE STRICT
- A company writing ABOUT a topic does NOT make them a competitor IN that space
- Example: Postman writing about APIs doesn't make them an API analytics competitor
- Example: Slack having OKR integrations doesn't make them an OKR competitor
- Large platforms (Salesforce, Microsoft) are ONLY competitors if they have a SPECIFIC product that directly competes
- "Adjacent" or "could theoretically compete" is NOT enough — they must ACTUALLY be in the market today

## OUTPUT FORMAT
Respond with a JSON array, one entry per entity:
[
  {
    "name": "Entity Name",
    "recommended_type": "product_competitor" | "technology" | "consultant" | "publisher" | "marketplace" | "infrastructure" | "irrelevant",
    "should_be_active": true | false,
    "confidence": "high" | "medium",
    "reasoning": "One sentence explaining your classification"
  }
]

Only set should_be_active=true for genuine product_competitor entities.
All other types should have should_be_active=false.

Respond ONLY with valid JSON array, no explanations.`

// Structured funnel-based query generation: exactly 30 prompts (10 TOF / 10 MOF / 10 BOF)
export const FUNNEL_QUERY_GENERATION_PROMPT = `You are generating search prompts that potential BUYERS would ask AI assistants (ChatGPT, Claude, Perplexity) at different stages of their buying journey.

IMPORTANT: Do NOT include the brand name "{{company_name}}" in any prompt.

## BRAND CONTEXT
Company: {{company_name}}
Description: {{description}}
Products/Services: {{products}}
Target Markets: {{markets}}
Target Personas: {{personas}}

## GENERATE EXACTLY 30 PROMPTS — 10 per funnel stage:

### TOP OF FUNNEL (10 prompts) — Educational & Situational
These are people learning about the PROBLEMS and OPPORTUNITIES in the market. They don't know specific solutions yet.

Think: "What challenges exist?" / "What's changing in this space?" / "How do companies handle X?"

Examples of good TOF prompts:
- "What are the biggest challenges in managing product lifecycle data across global teams?"
- "How are manufacturing companies handling digital transformation of their engineering processes?"
- "What happens when companies outgrow their current PLM system?"

Rules for TOF:
- Focus on PROBLEMS, TRENDS, and MARKET DYNAMICS — not solutions
- Use educational/exploratory language
- Reference specific industries, roles, or situations relevant to this brand
- NO product category names, NO solution types, NO brand names
- Think: what would someone Google BEFORE they knew this solution category existed?
- Priority: 40-60

### MIDDLE OF FUNNEL (10 prompts) — Exploring Solutions & Approaches
These people know they have a problem and are exploring what kinds of solutions exist. They're comparing categories and approaches.

Think: "What tools exist for X?" / "How do companies solve Y?" / "What should I look for in Z?"

Examples of good MOF prompts:
- "What software do enterprise manufacturers use to manage product data across their supply chain?"
- "How do companies choose between building custom tools vs buying a PLM platform?"
- "What are the most important features to look for in a product lifecycle management solution?"

Rules for MOF:
- Focus on SOLUTION CATEGORIES and EVALUATION CRITERIA
- Reference the problem space and what types of solutions exist
- Include "what should I look for", "how do companies choose", "what are the options for"
- Can mention solution categories (e.g., "PLM software") but NOT specific brand names
- Priority: 60-80

### BOTTOM OF FUNNEL (10 prompts) — Requirements & Specific Needs
These people are actively evaluating specific solutions. They have requirements and are ready to shortlist.

Think: "Which X works best for Y?" / "Recommend a Z that does W" / "What's the best option for my situation?"

Examples of good BOF prompts:
- "Recommend a PLM platform that supports both mechanical and software engineering workflows"
- "What's the best product lifecycle management tool for a mid-size manufacturer with 500+ engineers?"
- "Which enterprise PLM solutions offer the best integration with ERP systems like SAP?"

Rules for BOF:
- Focus on SPECIFIC REQUIREMENTS, USE CASES, and BUYING CRITERIA
- Include concrete details: team size, industry, specific integrations, specific capabilities
- Use "recommend", "which is best", "what should I use" language
- These should make AI assistants naturally want to list and compare specific products
- Priority: 80-95

## OUTPUT FORMAT
Respond with a JSON array of exactly 30 objects:
[
  {
    "query_text": "The search prompt",
    "query_type": "top_funnel" | "mid_funnel" | "bottom_funnel",
    "priority": 40-95 (based on funnel stage ranges above),
    "funnel_stage": "top_funnel" | "mid_funnel" | "bottom_funnel",
    "related_competitor": null
  }
]

## CRITICAL RULES
1. Exactly 10 prompts per funnel stage (30 total)
2. NO brand names in any prompt
3. Each prompt must be UNIQUE — no near-duplicates
4. Prompts should sound NATURAL — like a real person typing into ChatGPT
5. Be SPECIFIC to this brand's market, not generic business questions
6. TOF prompts should NOT mention solution categories
7. BOF prompts should include specific situational details

Respond ONLY with valid JSON array, no explanations.`
