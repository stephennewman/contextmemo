import { CourseModule } from './types'

export const advancedModules: CourseModule[] = [
  {
    slug: 'adv-ai-retrieval-systems',
    title: 'How AI Retrieval Systems Actually Work',
    description: 'Deep technical dive into RAG, vector search, source ranking, and how different AI platforms evaluate content.',
    order: 1,
    estimatedMinutes: 10,
    sections: [
      {
        title: 'RAG Architecture and Source Selection',
        content: `You already know AI models retrieve information from the web. But the specifics of how retrieval-augmented generation (RAG) works have direct implications for your optimization strategy.

**The RAG Pipeline in Detail:**

**1. Query Embedding**
When a user asks a question, the AI system converts it into a vector representation — a numerical fingerprint of the query's meaning. This is done by an embedding model (separate from the generation model). The quality of this embedding determines what content gets retrieved.

**Why this matters:** Your content's semantic similarity to common queries determines whether it's retrieved. Content that uses natural, conversational language around your topic matches embeddings better than keyword-optimized content. If your page says "Our platform enables cross-functional synergy" but users ask "What tool helps teams collaborate?" — the semantic gap may prevent retrieval.

**2. Multi-Stage Retrieval**
Modern systems don't just do a single search. They use multi-stage retrieval:
- **Stage 1: Broad retrieval** — Fast, approximate search returns 100-500 candidate documents
- **Stage 2: Re-ranking** — A more precise model scores each candidate for relevance
- **Stage 3: Diversity filtering** — The system ensures source diversity (won't cite the same domain 5 times)
- **Stage 4: Freshness weighting** — For time-sensitive queries, newer content gets boosted

**The diversity filter is critical.** Even if your brand has the 5 best pages on a topic, the system will typically only cite you once or twice and fill remaining slots with independent sources. This is why third-party presence matters — it gives you multiple chances to appear through different domains.

**3. Context Window Assembly**
Retrieved chunks are assembled into a context window for the generation model. The order and structure of these chunks influences the response:
- Content placed earlier in the context window tends to have more influence
- Sources that directly answer the query get priority over tangential mentions
- Conflicting information from different sources forces the model to arbitrate — and it usually sides with the source that has more corroboration

**Practical implication:** Your content should directly answer questions, not just contain relevant information buried in a longer piece. A page that starts with "The best CRM for small teams is..." has an advantage over one where that answer appears in paragraph 47.`,
      },
      {
        title: 'How Perplexity, ChatGPT, and Gemini Differ Technically',
        content: `Each major AI search platform has different retrieval architectures, which means the same optimization won't work equally across all of them.

**Perplexity:**
- **Retrieval-first architecture** — Always searches the web before answering
- **Source transparency** — Shows numbered citations that users can verify
- **Index freshness** — Can find content published hours ago
- **Bias:** Heavily favors pages that directly answer the query in a structured format. FAQ-style content and listicles perform well because they match Perplexity's extraction patterns.
- **Weakness for marketers:** Perplexity's retrieval sometimes favors aggregate/comparison sites over individual brand pages. Getting featured on comparison platforms is disproportionately valuable here.

**ChatGPT (with browsing/search):**
- **Hybrid architecture** — Uses training data as baseline, supplements with web search when needed
- **Selective retrieval** — Doesn't always search the web; relies on training knowledge for well-established topics
- **GPT-4's training cutoff** creates a split: established brands are in the model's "memory," but newer companies depend entirely on retrieval
- **Bias:** Tends to recommend well-known brands unless specifically prompted otherwise. Strong brand presence in pre-training data creates significant incumbency advantage.
- **Weakness for marketers:** If your brand isn't in ChatGPT's training data AND your real-time web presence is weak, you're invisible on both paths.

**Gemini (Google):**
- **Deep Google integration** — Leverages Google's search index, Knowledge Graph, and Shopping data
- **Entity-heavy** — Strong reliance on Google's Knowledge Graph for understanding entities and relationships
- **Bias:** Google entities (Google Business Profile, Maps data, structured data from Search) heavily influence Gemini's recommendations. 
- **Weakness for marketers:** Brands without a complete Google Business Profile and strong Knowledge Graph presence underperform in Gemini specifically.

**Claude:**
- **Training-data-dominant** — Less real-time retrieval, more reliance on training knowledge
- **Nuanced analysis** — Tends to give more balanced, multi-perspective answers
- **Bias:** Favors well-sourced, nuanced content. Less likely to give a single "best" recommendation and more likely to present trade-offs.
- **Weakness for marketers:** Hard to optimize for directly since there's no real-time retrieval to target. Long-term web presence and content authority matter most.

**Cross-platform strategy:**
The brands that win across all platforms build genuine authority that transcends any single retrieval mechanism: strong third-party presence, factual owned content, consistent entity representation, and broad information distribution.`,
      },
      {
        title: 'Chunk Optimization: How Content Gets Fragmented',
        content: `AI retrieval systems don't ingest your whole page — they break it into chunks and evaluate each chunk independently. Understanding chunking transforms how you structure content.

**How Chunking Works:**
Most retrieval systems split documents into chunks of 256-1024 tokens (~200-800 words). Each chunk is embedded and indexed separately. When a query matches, individual chunks — not whole pages — are retrieved.

**What this means for content structure:**

**1. Each section must be self-contained**
If your H2 section about "Pricing" references context from a previous section ("As mentioned above..."), the pricing chunk loses meaning when retrieved in isolation. Each section should be understandable on its own.

**2. Front-load the answer in each section**
Chunks from the beginning of a section are often scored higher. Start each section with the key fact or answer, then elaborate. Don't build up to the point — lead with it.

**3. Headers are chunk boundaries**
Most chunking algorithms split at HTML headers (H1, H2, H3). Your header text becomes part of the chunk's semantic identity. A header that says "Section 3" is useless for retrieval. A header that says "Enterprise CRM Pricing Comparison 2026" is a query magnet.

**4. Tables and lists chunk well**
Structured data (HTML tables, ordered lists, definition lists) chunks cleanly because each row/item is a self-contained unit. A comparison table where each row compares your product to a competitor on a specific feature is retrieval gold.

**5. Long paragraphs are anti-patterns**
A 500-word paragraph gets chunked into pieces that may split mid-thought. Use shorter paragraphs (2-4 sentences) with clear topic sentences so each chunk maintains coherent meaning.

**Advanced tactic: Anchor text for chunks**
Include a natural-language summary sentence at the start of each major section that reads like an answer to a question. This "anchor" gives the embedding model a strong semantic signal:
- ✅ "HubSpot's Marketing Hub pricing starts at $0/month for the free tier, with Starter at $20/month, Professional at $890/month, and Enterprise at $3,600/month as of 2026."
- ❌ "Let's take a look at how their pricing breaks down across the different options available."

The first version is a citable, self-contained chunk. The second requires surrounding context to be meaningful.`,
      },
    ],
  },
  {
    slug: 'adv-competitive-intelligence',
    title: 'AI Search Competitive Intelligence',
    description: 'Systematic frameworks for monitoring, analyzing, and outmaneuvering competitors in AI search.',
    order: 2,
    estimatedMinutes: 9,
    sections: [
      {
        title: 'Building an AI Competitive Monitoring System',
        content: `Most marketers check their AI visibility reactively. The competitive advantage comes from systematic monitoring that reveals patterns over time.

**The Monitoring Framework:**

**1. Query Matrix**
Build a matrix of queries × AI models × time. For example:
- 30 high-intent queries your buyers actually ask
- 5 AI models (ChatGPT, Claude, Perplexity, Gemini, Copilot)
- Weekly monitoring cadence

That's 150 data points per week. Track: brand mentioned (yes/no), position in response (1st, 2nd, 3rd+), accuracy, sentiment, competitors mentioned alongside you.

**2. Competitive Citation Analysis**
For each query where a competitor is mentioned:
- What source is the AI citing for that competitor?
- What specific claim or data point is being cited?
- Is the citation from the competitor's own site or a third party?
- How recent is the cited content?

This tells you exactly what content to create or improve. If Competitor X gets cited because of a G2 review mentioning their "99.9% uptime SLA," and you have a 99.99% uptime SLA but no one mentions it — that's a specific, actionable gap.

**3. Citation Source Mapping**
Over time, you'll see patterns in which domains AI models cite most frequently in your category:
- Which review sites dominate?
- Which publications get cited?
- Which comparison platforms appear?
- Are there niche directories or forums that carry outsized weight?

This map becomes your off-site content strategy. Don't waste effort on platforms AI never cites.

**4. Share of Voice Tracking**
Calculate your "AI Share of Voice" — the percentage of relevant queries where you're mentioned vs. competitors:
- SOV = (Your mentions / Total brand mentions across all queries) × 100
- Track this weekly to spot trends
- Break it down by query category (comparison, recommendation, feature-specific)

A declining SOV when your content hasn't changed usually means a competitor is investing in the same signals you rely on.`,
      },
      {
        title: 'Reverse-Engineering Why Competitors Win',
        content: `When a competitor consistently beats you in AI responses, there's always a reason. Here's how to find it.

**The Reverse-Engineering Process:**

**Step 1: Collect the AI's exact response**
Copy the full AI response for queries where your competitor is recommended. Note exactly what the AI says about them — the specific claims, data points, and positioning language.

**Step 2: Trace the claims to sources**
For each claim the AI makes about your competitor, find where that information exists on the web. Often you'll find:
- Their G2 profile states the exact capability
- A blog post from an industry analyst mentions them
- A comparison article on a third-party site includes them
- Their own website has a clearly stated fact

**Step 3: Identify the content patterns**
Look for patterns across multiple queries:
- Do they win on comparison queries because they have extensive "vs" content?
- Do they win on recommendation queries because of high review volume?
- Do they win on feature-specific queries because their docs are more detailed?
- Do they win on persona queries because they have use-case pages per industry?

**Step 4: Assess the gap effort**
For each pattern, estimate: how much effort to close the gap?
- **Quick wins (1-2 weeks):** Update your own site with specific facts, improve schema markup, create missing comparison pages
- **Medium effort (1-3 months):** Build review volume on G2, get featured in 2-3 industry publications, create comprehensive guides
- **Long-term (3-12 months):** Build brand authority through sustained PR, analyst relations, community presence

**Step 5: Prioritize by query value**
Not all queries matter equally. A query that drives $50K deals deserves more investment than one that drives $500 transactions. Map your competitive gaps to revenue impact and prioritize accordingly.

**Common finding:** Most competitive gaps aren't about content quality on your own site. They're about third-party presence. The competitor with 500 G2 reviews beats the competitor with a better blog every time.`,
      },
      {
        title: 'Offensive and Defensive AI Strategies',
        content: `AI search creates both offensive opportunities (capturing new visibility) and defensive challenges (protecting existing visibility).

**Offensive Strategies:**

**1. Category Creation**
If no AI model has a clear recommendation for a query in your space, you can become the default by being the first brand with clear, structured content on the topic. Early movers in unclaimed query spaces have outsized advantages.

**2. Competitor Comparison Content**
Create detailed, fair comparison pages for each major competitor. When buyers ask AI "What's the difference between [You] and [Competitor]?" — if you're the only one with a comprehensive comparison page, AI will often cite your framing of the comparison.

This is powerful but requires genuine fairness. AI models can detect biased comparison content, and citing a clearly biased source reflects poorly on the AI's response quality. Be honest about competitor strengths — this actually increases citation likelihood.

**3. Emerging Query Targeting**
Monitor new query patterns in your category. When a new technology, regulation, or trend creates new buyer questions, being the first authoritative source on the topic gives you a citation lock that's hard to displace.

**Defensive Strategies:**

**1. Accuracy Monitoring**
If AI misrepresents your brand, it can cost deals. Monitor for:
- Outdated pricing being cited
- Incorrect feature claims
- Confusion with similarly-named products
- Negative sentiment from old, resolved issues

Fix accuracy issues by updating your own site AND reaching out to third-party sites that may have outdated information.

**2. Review Response**
Negative reviews on G2, Capterra, and similar platforms get synthesized into AI responses. A one-star review describing a bad experience can become "Users report issues with..." in AI answers. Actively respond to negative reviews and address the underlying issues.

**3. Narrative Control**
AI models synthesize your brand narrative from whatever sources are available. If you don't define your positioning clearly and consistently, the AI will define it for you — often inaccurately. Ensure your core positioning statements appear consistently across every web property you control.`,
      },
    ],
  },
  {
    slug: 'adv-attribution-measurement',
    title: 'Advanced AI Attribution & ROI Measurement',
    description: 'Build a measurement framework that captures AI\'s actual impact on your pipeline and revenue.',
    order: 3,
    estimatedMinutes: 9,
    sections: [
      {
        title: 'The AI Attribution Architecture',
        content: `Standard marketing attribution breaks down with AI search because the influence happens outside your measurement systems. Here's how to build an architecture that captures it.

**The Four Layers of AI Attribution:**

**Layer 1: Direct Referral (What you can see)**
This is the traffic you can track — visits from chat.openai.com, perplexity.ai, copilot.microsoft.com, etc. Set up:
- UTM detection rules for AI referral domains
- Custom channel groupings in Google Analytics 4
- First-touch and multi-touch attribution models that tag AI as a channel

Expect this to capture 5-15% of actual AI influence. It's necessary but wildly incomplete.

**Layer 2: Branded Search Lift (What you can infer)**
When AI recommends your brand, many users then Google your brand name. Track:
- Branded search volume over time (Google Search Console)
- Branded search volume correlated with AI visibility changes
- New branded search queries that weren't appearing before

Method: Calculate the correlation coefficient between weekly AI visibility scores and branded search volume (with a 1-2 week lag). Strong correlation (>0.6) suggests AI is driving brand search.

**Layer 3: Self-Reported Attribution (What users tell you)**
Add AI-specific options to your lead capture forms:
- "How did you first hear about us?" → Include "AI assistant (ChatGPT, Claude, etc.)"
- Ask at different pipeline stages (form fill, demo call, closed deal) to capture AI's influence at each stage
- Use open-text fields too — buyers often describe their AI interactions naturally

Self-reported data is biased but valuable. If 25% of demo requests mention AI, that's a meaningful signal even if the exact number isn't precise.

**Layer 4: Controlled Experiments (What you can prove)**
The gold standard: A/B test AI visibility investments against a control:
- Run AI optimization for one product line but not another
- Compare pipeline changes between optimized and control groups
- Account for other variables (market size, seasonality, ad spend)

This is harder to execute but provides the causal evidence leadership teams need to justify larger AI investments.`,
      },
      {
        title: 'Building the AI ROI Model',
        content: `To get budget for AI visibility, you need an ROI model that connects investment to revenue. Here's a practical framework.

**The AI Visibility ROI Equation:**

**Investment Side:**
- Content creation/optimization costs (time, freelancers, tools)
- Review generation program costs (G2, Capterra outreach)
- Third-party placement costs (analyst briefings, publication features)
- Monitoring tool costs (AI visibility tracking)
- Internal team time for strategy and execution

**Return Side (Harder):**

**Model 1: Traffic Value Approach**
Calculate the equivalent Google Ads cost of AI-driven traffic:
- AI referral visits × Average CPC for those keywords = Traffic value
- Add: Branded search lift × CPC of branded terms = Indirect traffic value
- This underestimates because it doesn't capture influence that doesn't result in a click

**Model 2: Pipeline Influence Approach**
- Track self-reported AI attribution through the funnel
- (AI-attributed leads × Lead-to-close rate × Average deal size) = AI pipeline value
- Apply a confidence discount (0.5-0.8x) since self-reporting overestimates
- This captures downstream value but relies on survey data

**Model 3: Incrementality Approach (Most Rigorous)**
- Compare pipeline before and after AI optimization (controlled for other variables)
- The incremental pipeline value beyond trend is attributable to AI
- This requires patience (6+ months of data) and careful control for confounders

**Which model to use:**
Start with Model 1 (it's the easiest to calculate and gives you a floor). Layer in Model 2 once you have self-reported data flowing. Aspire to Model 3 for long-term budget justification.

**Typical findings:**
Early-stage AI optimization programs often see 3-5x ROI on a traffic-value basis within 6 months. The true ROI (including untracked influence) is likely 5-15x, but this is hard to prove definitively.`,
      },
      {
        title: 'Reporting and Stakeholder Communication',
        content: `Translating AI visibility metrics into language leadership understands is half the battle.

**The AI Search Dashboard (What to Report):**

**Leading Indicators (Monthly):**
- **AI Visibility Score** — % of target queries where you're mentioned (trend line)
- **AI Share of Voice** — Your mentions vs. competitor mentions
- **Citation Accuracy Rate** — % of mentions that correctly describe your product
- **Source Coverage** — Number of independent sources citing you (G2, publications, etc.)
- **AI Referral Traffic** — Direct AI platform visits (growing, flat, declining)

**Lagging Indicators (Quarterly):**
- **AI-Attributed Pipeline** — Revenue influenced by AI (self-reported + correlation)
- **Branded Search Volume** — Trend relative to AI visibility investments
- **Win Rate on AI-Sourced Leads** — How AI-influenced deals compare to other sources
- **Cost Per AI Citation** — Total investment / Number of citations gained

**Framing for Executives:**
Don't lead with "we got mentioned by ChatGPT 47 times this month." Lead with the business impact:

"AI search is influencing X% of our qualified pipeline. Buyers are researching via AI assistants before they ever visit our website or talk to sales. We currently appear in Y% of relevant AI queries — up from Z% last quarter. Our competitors appear in [competitive benchmarks]. Here's what we're investing to capture this channel."

**The "What If We Don't" Slide:**
The most powerful stakeholder argument is the cost of inaction:
- "Competitors appear in 60% of relevant AI queries. We appear in 20%."
- "30% of our recent demo requests mentioned an AI assistant as a discovery source."
- "If AI search grows at current rates, a brand that's invisible in AI will miss [X]% of their addressable market by 2027."

**Common mistake:** Presenting AI metrics alongside Google Ads and SEO metrics at the same level of precision. AI attribution is inherently fuzzier. Acknowledge this directly — "This is a directional estimate, not a precise number" — and leadership will trust the data more, not less.`,
      },
    ],
  },
  {
    slug: 'adv-ai-agents-commerce',
    title: 'AI Agents, Autonomous Commerce & What\'s Next',
    description: 'Prepare for the next wave: AI agents that research, compare, and purchase on behalf of users.',
    order: 4,
    estimatedMinutes: 8,
    sections: [
      {
        title: 'The Agent Economy',
        content: `AI agents aren't hypothetical — they're here and rapidly gaining capabilities. Understanding where this is heading helps you prepare before it's urgent.

**What AI Agents Can Do Today (2026):**
- Research products across multiple websites and synthesize findings
- Compare vendors on specific criteria (pricing, features, reviews)
- Fill out forms and request demos on behalf of users
- Monitor competitor pricing and alert on changes
- Generate procurement recommendation reports
- Execute purchases on approved platforms (with user authorization)

**What's Coming (2026-2028):**
- Autonomous vendor evaluation based on company-specific criteria
- Multi-agent negotiations (your AI agent negotiating with a vendor's AI agent)
- Automated contract review and comparison
- Continuous vendor monitoring and re-evaluation
- Agent-to-agent APIs replacing traditional sales touchpoints

**Why This Matters Right Now:**
The brands that prepare for agent-mediated commerce will have a massive advantage when agent adoption hits mainstream (estimated 2027-2028 for B2B procurement). Preparing means:

1. **Your product information must be machine-parseable**
Agents don't read marketing copy — they extract structured data. Feature lists, pricing tiers, SLA terms, integration catalogs, and security certifications need to be available in clean, structured formats.

2. **Comparison axes must be explicit**
An agent evaluating your product against competitors needs clear data on the same dimensions. If your competitor lists "99.9% uptime SLA" and your equivalent guarantee is buried in a PDF terms document, the agent will score you lower on reliability — even if your actual uptime is better.

3. **API-accessible information wins**
Forward-thinking brands are creating public APIs for product information, pricing calculators, and capability databases. When an agent can programmatically query your product specifications, you're ahead of competitors who require human interaction.`,
      },
      {
        title: 'Optimizing for Machine Decision-Makers',
        content: `When the "buyer" is an AI agent, the rules of marketing invert.

**What Agents Don't Care About:**
- Beautiful visual design (they don't render your CSS)
- Emotional storytelling (they evaluate data, not feelings)
- Social proof framing ("Join 10,000+ happy customers" is noise)
- Urgency/scarcity tactics ("Limited time offer!" is ignored)
- Video content (most agents can't process video)

**What Agents Optimize For:**
- **Structured data completeness** — Every product attribute explicitly stated
- **Specification standardization** — Data in formats that enable comparison
- **Freshness signals** — Clear "last updated" dates for pricing and feature info
- **Consistency** — Same information across your site, review platforms, and APIs
- **Verifiability** — Claims backed by third-party data (certifications, audits, reviews)

**The "Machine-Readable Product Sheet":**
Every product page should have a machine-readable layer that includes:
- Product name (exact, consistent with all other platforms)
- Category (using industry-standard taxonomy)
- Pricing (specific tiers, per-user/per-month, any hidden costs)
- Features (enumerated, with yes/no or specific capabilities)
- Integrations (complete list, not "100+" — the actual list)
- Security (certifications: SOC 2, ISO 27001, GDPR compliance, etc.)
- SLA (uptime guarantee, support response times, penalty terms)
- Customer metrics (NPS, retention rate, G2 rating, review count)

**Schema.org markup** is the minimum. **JSON-LD product data** is better. **A public API** is the gold standard.

**The irony:** The brands that are most transparent with their product data (including pricing, limitations, and competitors) will be favored by agents. Opacity — the thing many sales teams prefer — is a negative signal to machine decision-makers.`,
      },
      {
        title: 'Building Your Agent-Ready Strategy',
        content: `You don't need to overhaul everything today. But you should start positioning for the agent era with targeted investments.

**Priority 1: Audit Machine Readability (Do This Now)**
- Run your product/pricing pages through a text-only browser or crawler
- Check if all critical product information is in the HTML (not in images, PDFs, or JavaScript-rendered components)
- Verify your schema markup covers Product, Offer, Organization, and FAQ types
- Ensure your sitemap includes all product, pricing, and feature pages

**Priority 2: Standardize Your Product Data (Next Quarter)**
- Create a canonical "product data sheet" in structured format
- Ensure this data is consistent across your website, G2, Capterra, LinkedIn, and any other platforms
- Add explicit "Last Updated" timestamps to pricing and feature pages
- Document your integration ecosystem with specific partner names and capabilities (not vague counts)

**Priority 3: Build Programmatic Access (6-12 Months)**
- Consider a public product information API
- Create machine-readable comparison pages (your product vs. each major competitor with structured data)
- Develop an "agent landing page" — a page specifically designed for AI agents that contains all product data in structured format with zero marketing fluff

**Priority 4: Monitor Agent Behavior (Ongoing)**
- Track AI agent traffic patterns (they often have identifiable user agents)
- Analyze which pages agents spend most time on
- Monitor agent-originated demo requests or form fills
- Test how agents evaluate your product vs. competitors using available agent tools

**The competitive moat:**
In a world where AI agents mediate 30-50% of B2B procurement decisions (plausible by 2028), the brands with the most complete, accurate, machine-readable product information will systematically win evaluations — regardless of sales team quality or marketing budget.

This is the next SEO. The brands that invest in "Agent Optimization" early will have the same advantage as early SEO adopters had in 2005.`,
      },
    ],
  },
]
