# Context Memo V2 - Product Requirements Document

**Date:** February 4, 2026  
**Author:** AI Architecture Review  
**For:** Development Handoff  
**Version:** 2.2 (Updated with Entity Taxonomy)

---

## Executive Summary

Context Memo helps B2B brands get cited by AI assistants (ChatGPT, Claude, Perplexity). 

### The Core Insight

**Competitors are discovered from AI responses, NOT from the brand's website.**

When you ask AI "What's the best temperature monitoring solution?", the brands that appear in the response ARE the competitors. Not who the brand *thinks* they compete with. Not who they list on their website. The actual AI response is the source of truth.

### The Core Value Loop

```
Brand Intelligence → Persona-Based Prompts → Run Prompts → AI Results Reveal Competitors → Baseline + Content Opportunities → Verify
```

This PRD defines what to **keep**, **remove**, and **change** for a scalable V2 architecture, plus identifies sustainable competitive moats.

### Key Terminology: Entities, Not Competitors

When AI responds to a prompt, it doesn't just cite competitors. It cites:
- Direct alternatives (actual competitors)
- Industry resources (FDA.gov, trade publications)
- Review sites (G2, Capterra)
- Partners (integration partners, complementary tools)
- Publishers (blogs, news outlets)

**We call all of these "Entities"** - anything that has visibility for a prompt. Each entity has a `type`:

| Entity Type | Description | Strategic Goal |
|-------------|-------------|----------------|
| **Competitor** | Direct alternative (same product category) | Beat them |
| **Partner** | Complementary solution, integration | Be featured alongside |
| **Resource** | Industry publication, gov site, association | Get cited BY them |
| **Aggregator** | Review site, comparison site (G2, Capterra) | Get listed/ranked |
| **Publisher** | Blog, news outlet covering the space | Get featured |

This distinction matters because strategy differs by type:
- **Competitors:** Create content to win those prompts
- **Resources:** Get your brand cited in their content
- **Aggregators:** Ensure you're listed and well-reviewed
- **Partners:** Appear alongside them, cross-reference

---

## Table of Contents

1. [Core Value Proposition](#1-core-value-proposition)
2. [Target Customer](#2-target-customer)
3. [What to Keep](#3-what-to-keep)
4. [What to Remove (Prototype Exclusions)](#4-what-to-remove-prototype-exclusions)
5. [What to Change](#5-what-to-change)
6. [Simplified Architecture](#6-simplified-architecture)
7. [Database Schema (Simplified)](#7-database-schema-simplified)
8. [MOAT Analysis & Differentiation](#8-moat-analysis--differentiation)
9. [Implementation Priority](#9-implementation-priority)
10. [Technical Specifications](#10-technical-specifications)
11. [Success Metrics](#11-success-metrics)
12. [Risks & Mitigations](#12-risks--mitigations)

---

## 1. Core Value Proposition

### The Problem
When B2B buyers ask AI assistants "What's the best [solution] for [use case]?", brands without citable content are invisible. AI models cite based on:
- Training data presence
- Real-time search discoverability
- Content authority signals
- Direct relevance to the query

### The Solution
Context Memo reverse-engineers what prompts a brand SHOULD appear for, runs those prompts to establish a baseline, and identifies content opportunities based on who AI currently cites.

### Why This Matters
The current approach of extracting competitors from a brand's website is **fundamentally flawed**:
- Brands list *aspirational* competitors (who they want to compete with)
- Competitor pages are often outdated
- Brands don't know about emerging threats
- Self-reported data has inherent bias

**The AI's response IS the source of truth.** Whoever appears when you run non-branded, high-intent prompts—those are the real competitors in AI visibility.

### Core Loop (Correct Order)
1. **Extract** - Analyze brand site + external sources for context (products, markets, personas, pricing, offers)
2. **Reverse-Engineer** - Generate non-branded, high-intent prompts based on personas ("If this buyer didn't know the brand, what would they ask?")
3. **Baseline** - Run prompts through AI → Results reveal competitors organically
4. **Identify Gaps** - "You: 0/10, CompetitorA: 5/10" → Content opportunities
5. **Generate** - Create content optimized for AI citation
6. **Publish** - Push to HubSpot automatically
7. **Verify** - Confirm the content now gets cited (closes the loop)
8. **Cascade** - Optionally analyze top competitors to expand the prompt/competitor map

---

## 2. Target Customer

### Primary: B2B Marketing Leaders
- **Title:** VP Marketing, Director of Content, Growth Lead
- **Company Size:** 50-500 employees (mid-market)
- **Pain:** Can't prove AI visibility matters; can't scale AI-optimized content
- **Budget:** $200-500/month for tools that prove ROI

### What They Care About (in order)
1. **Pipeline attribution** - Does AI traffic convert to revenue?
2. **Competitive share of voice** - Am I winning vs. competitors?
3. **Content efficiency** - Create smarter content, not more content
4. **Executive reporting** - Show the board that AI visibility matters

### Jobs to Be Done
- "Help me understand if AI is driving pipeline"
- "Show me where competitors beat me in AI search"
- "Create content that AI will actually cite"
- "Prove ROI to my leadership"

---

## 3. What to Keep

### 3.1 Inngest Job Queue Architecture ✅
**Why Keep:** Event-driven, observable, handles long-running tasks. The right tool for background automation.

**Files:**
- `lib/inngest/client.ts`
- `lib/inngest/functions/*.ts`
- `app/api/inngest/route.ts`

### 3.2 Per-Prompt Tracking System ✅
**Why Keep:** This is the atomic unit users care about. Not "we scanned 100 queries" but "you won/lost THIS specific prompt."

**Key Fields (queries table):**
- `scan_count`, `citation_streak`, `longest_streak`
- `first_cited_at` (celebrate wins)
- `citation_lost_at` (alert on losses)
- `current_status`: never_scanned | gap | cited | lost_citation

**Files:**
- `lib/inngest/functions/scan-run.ts` (tracking logic)
- `lib/feed/emit.ts` (per-prompt events)

### 3.3 Brand Context Extraction ✅
**Why Keep:** Foundation for matching brand tone in generated content.

**Files:**
- `lib/inngest/functions/context-extract.ts`
- `lib/ai/prompts/context-extraction.ts`
- Uses Jina Reader for web crawling

### 3.4 Citation Verification Loop ✅ (CRITICAL MOAT)
**Why Keep:** This PROVES the content worked. Re-runs prompts 24-72 hours after publish to verify citation. B2B marketers need this for ROI justification.

**Metrics Tracked:**
- Time to citation (hours from publish to first citation)
- Citation rate (% of models now citing)
- Per-model success

**Files:**
- `lib/inngest/functions/citation-verify.ts`

### 3.5 Revenue Attribution ✅ (CRITICAL MOAT)
**Why Keep:** Connects AI traffic → HubSpot contacts → deals → closed won. This is the "prove ROI" feature.

**Funnel:**
```
AI Traffic Event → Contact Created → Deal Created → Closed Won
```

**Files:**
- `lib/inngest/functions/revenue-attribution.ts`
- `components/dashboard/attribution-dashboard.tsx`

### 3.6 Feed Events System (V2) ✅
**Why Keep:** Unified UX for "what happened and what to do about it."

**Files:**
- `lib/feed/types.ts`
- `lib/feed/emit.ts`
- `app/api/v2/feed/route.ts`
- `components/v2/feed/*.tsx`

### 3.7 HubSpot Integration ✅
**Why Keep:** Primary content destination. Native integration is the value prop.

**Files:**
- `lib/hubspot/oauth.ts`
- `app/api/auth/hubspot/*`
- `app/api/brands/[brandId]/memos/[memoId]/hubspot/route.ts`

---

## 4. What to Remove (Prototype Exclusions)

### 4.1 Dual Alert Systems ❌
**Current State:** Both `alerts` (legacy) and `feed_events` (v2) tables exist. Every Inngest function populates both.

**Action:** Migrate fully to `feed_events`, deprecate `alerts` table.

**Files to Update:**
- `lib/inngest/functions/scan-run.ts` - Remove alerts inserts
- `lib/inngest/functions/memo-generate.ts` - Remove alerts inserts
- `lib/inngest/functions/citation-verify.ts` - Remove alerts inserts
- `components/dashboard/alerts-list.tsx` - Replace with feed

**Savings:** ~200 lines of duplicate code, simpler data model.

### 4.2 Excess AI Models (9 → 3) ❌
**Current State:** Scans GPT-4o Mini, Claude, Gemini, Llama, Mistral, Perplexity, DeepSeek, Qwen, Grok.

**Reality:** Most B2B buyers use ChatGPT or Perplexity. Others add cost without signal.

**Action:** Keep 3 core models:
- **GPT-4o Mini** (market leader, cost-effective)
- **Perplexity Sonar** (growing rapidly, citation-native)
- **Claude 3.5 Haiku** (enterprise adoption)

Make additional models a premium add-on.

**Files to Update:**
- `lib/inngest/functions/scan-run.ts` - Reduce SCAN_MODELS array

**Savings:** ~60% reduction in API costs per scan.

### 4.3 Discovery Scan ❌
**Current State:** `discovery-scan.ts` generates 50-75 exploratory queries weekly to "find brand mentions."

**Reality:** Core value is turning KNOWN gaps into content, not exploration. This runs weekly, finds little value, costs money.

**Action:** Remove entirely OR make it a one-time onboarding step.

**Files to Remove:**
- `lib/inngest/functions/discovery-scan.ts`

**Savings:** ~$2-5 per brand per week in API costs.

### 4.4 Pre-Scan Competitor Discovery ❌ (CRITICAL CHANGE)
**Current State:** Competitors discovered in 3 places:
- `competitor-discover.ts` (AI extraction from brand context) ← **WRONG APPROACH**
- `scan-run.ts` lines 698-840 (auto-discovery from citations) ← **CORRECT**
- `prompt-enrich.ts` lines 258-326 (discovery from scan responses) ← **CORRECT**

**Why This Is Wrong:**
Extracting competitors from the brand's website is fundamentally flawed:
- Brands list aspirational competitors (who they *want* to compete with)
- Competitor pages are outdated
- Brands don't know about emerging threats
- Self-reported data has bias

**Correct Approach:**
Competitors should ONLY be discovered from AI scan results. When you run a non-branded prompt like "What's the best temperature monitoring solution?" through AI, whoever appears in the response IS the competitor. The AI's response is the source of truth.

**Action:** 
- DELETE `competitor-discover.ts` entirely
- Keep competitor auto-discovery in `scan-run.ts` (this is correct)
- Remove competitor extraction from `context-extract.ts`

**Files to Remove:**
- `lib/inngest/functions/competitor-discover.ts`

**Files to Update:**
- `lib/inngest/functions/context-extract.ts` - Remove competitor extraction
- `lib/ai/prompts/context-extraction.ts` - Remove competitor-related prompts

### 4.5 Google Search Console / Bing Webmaster ❌
**Current State:** OAuth integrations for GSC and Bing Webmaster APIs.

**Reality:** Orthogonal to core loop. Adds OAuth complexity, maintenance burden, rarely used.

**Action:** Remove or defer to V3.

**Files to Remove/Defer:**
- `lib/inngest/functions/google-search-console-sync.ts`
- `lib/inngest/functions/bing-sync.ts`
- `app/api/auth/google-search-console/*`
- `components/dashboard/search-console-view.tsx`

### 4.6 Public Memo Hosting ❌ (CONTROVERSIAL)
**Current State:** Memos published to `[subdomain].contextmemo.com` with SEO optimization.

**Tension:** 
- PRO: Creates web presence for AI discoverability
- CON: Distraction from HubSpot-first strategy; maintenance burden

**Recommendation:** Keep for now but evaluate. If HubSpot content gets cited reliably, remove public hosting.

**Files (keep but monitor):**
- `app/memo/[subdomain]/[[...slug]]/page.tsx`
- `app/sitemap.ts`
- `public/robots.txt`

### 4.7 Competitor Content Intelligence ❌
**Current State:** Scans competitor RSS feeds, classifies content, generates response content.

**Reality:** Feature creep. Not part of core loop. Adds complexity.

**Action:** Remove entirely.

**Files to Remove:**
- `lib/inngest/functions/competitor-content.ts`
- `components/dashboard/competitor-content-feed.tsx`
- `competitor_feeds` table
- `competitor_content` table

### 4.8 Prompt Intelligence Feed ❌
**Current State:** AI-powered analysis of trending prompts and competitor wins.

**Reality:** Nice-to-have signal, but not actionable. Users want to act on specific gaps, not "insights."

**Action:** Remove or simplify to basic trending data.

**Files to Remove:**
- `lib/inngest/functions/prompt-intelligence.ts`
- `components/dashboard/prompt-intelligence-feed.tsx`

### 4.9 Model Insights Panel ❌
**Current State:** Per-model citation analysis with recommendations.

**Reality:** Too granular. Users don't optimize for "Grok" vs "Claude."

**Action:** Remove.

**Files to Remove:**
- `lib/inngest/functions/model-insights.ts`
- `components/dashboard/model-insights-panel.tsx`

---

## 5. What to Change

### 5.1 Rewrite Core Pipeline (CRITICAL)

**Current (WRONG):**
```
brand/created → context/extract → competitor/discover → query/generate → scan/run → prompt/enrich → memo/generate
                                        ↑
                                   WRONG: Competitors come
                                   from brand's website
```

**Proposed (CORRECT):**
```
STEP 1: BRAND INTELLIGENCE (one-time)
  brand/created → context/extract
  
  Extract from brand site + external sources:
    - Products/Services
    - Markets/Industries  
    - Pricing/Packaging
    - Offers/Value Props
    - Target Personas
    
  NO competitors at this stage. We don't know who they are yet.

STEP 2: PROMPT REVERSE-ENGINEERING (one-time)
  context/extract → query/generate
  
  For each persona, ask:
  "If this persona needed this solution but didn't know 
   the brand existed, what would they ask an AI assistant?"
   
  Generate 5-10 HIGH-INTENT, NON-BRANDED prompts.
  These are conversational, not keyword-based.
  
  Example:
    Persona: Restaurant Operations Manager
    Prompt: "What's the best way to automate temperature 
             monitoring for food safety compliance?"

STEP 3: BASELINE SCAN (first scan)
  query/generate → scan/run
  
  Run those 5-10 prompts through AI models.
  See what comes back.
  
  RESULTS DETERMINE COMPETITORS (not the brand's website!)
  
  Output:
    - Brand cited: 0/10 prompts
    - CompetitorA: 5/10 prompts ← Discovered organically
    - CompetitorB: 3/10 prompts ← Discovered organically
    - CompetitorC: 2/10 prompts ← Discovered organically

STEP 4: DAILY MONITORING
  daily/run → scan/run per brand
  
  Continue tracking the prompts.
  Discover new competitors as they appear.
  Emit feed events per prompt.

STEP 5: CONTENT GENERATION (user-triggered)
  User clicks "Generate Content" on a gap
  → memo/generate
  → HubSpot sync
  → Verification scheduled

STEP 6: CASCADE (optional, user-triggered)
  User wants to expand the competitive map.
  
  Take CompetitorA (winning 5/10):
    → Analyze their site (same as Step 1)
    → Generate THEIR persona-based prompts
    → Run those prompts
    → See if YOUR brand shows up for THEIR prompts
    → Discover even MORE competitors
    
  This cascades outward, mapping the entire competitive
  landscape in AI visibility.
```

**Key Changes:**
1. Competitors are NEVER extracted from brand's website
2. Competitors emerge organically from scan results
3. Query generation is purely persona-based (no competitor analysis needed upfront)
4. Add cascade capability for expanding the map

### 5.2 Rewrite Query Generation (CRITICAL)

**Current (WRONG):** 4 methods (category, intent, persona, gap-based)
- Category-based pulls from predefined categories
- Intent-based crawls competitor homepages ← Requires knowing competitors first
- Persona-based is correct approach
- Gap-based runs after scans

**Proposed (CORRECT):** Pure persona-based reverse engineering

**Logic:**
1. Extract brand context (products, markets, personas)
2. For EACH persona, generate prompts using this framework:

```
Given this persona:
  - Role: [e.g., Restaurant Operations Manager]
  - Goals: [e.g., Ensure food safety compliance, reduce manual work]
  - Pain points: [e.g., Temperature logging is tedious, audits are stressful]

Generate 5-10 conversational prompts this persona would ask 
an AI assistant if they were looking for a solution but 
did NOT know the brand existed.

Requirements:
  - Non-branded (no company names)
  - High-intent (ready to evaluate solutions)
  - Conversational (how people actually talk to AI)
  - Specific to the persona's context

Example outputs:
  - "What's the best way to automate temperature monitoring for food safety?"
  - "How do restaurants stay compliant with HACCP regulations?"
  - "What tools help with FDA food safety audits?"
```

3. Deduplicate and rank by intent strength
4. Cap at 10-15 prompts per brand initially

### 5.3 Split `scan-run.ts` (1,065 lines)
**Current:** One file handles scanning, tracking, competitor discovery, gap analysis, memo triggering, feed emission.

**Proposed Split:**
```
lib/inngest/functions/
  scan/
    execute.ts      # Just run queries through models
    analyze.ts      # Compute gaps, track citations, deltas
    discover.ts     # Extract competitors from responses (ONLY place)
    emit-results.ts # Emit feed events
```

### 5.4 Add Cascade Capability (NEW)

**Purpose:** Allow users to expand their competitive intelligence by analyzing competitors discovered from scans.

**Flow:**
```
User sees: "CompetitorA appeared in 5/10 of your prompts"
User clicks: "Analyze CompetitorA"

System runs:
  1. context/extract on CompetitorA's website
  2. query/generate for CompetitorA's personas
  3. scan/run with CompetitorA's prompts
  4. Results show:
     - Does YOUR brand appear for THEIR prompts?
     - Who else appears? (more competitors discovered)
     
This cascades outward, building a complete competitive map.
```

**Database Change:**
```sql
-- Track which entity a competitor was discovered from
competitors (
  ...
  discovered_from_brand_id uuid,  -- Which brand's scan revealed this
  discovered_from_query_id uuid,  -- Which specific prompt revealed this
  discovered_at timestamptz,
  mention_count int DEFAULT 1,    -- How many times they've appeared
  ...
)
```

### 5.4 Database Schema Simplification
**Tables to Keep:**
- `tenants`
- `brands`
- `queries`
- `scan_results` (simplified - latest scan only per query)
- `feed_events`
- `memos`
- `competitors`
- `attribution_events`
- `usage_events`

**Tables to Remove:**
- `alerts` (migrate to feed_events)
- `competitor_feeds`
- `competitor_content`
- `search_console_stats`
- `visibility_history` (calculate from scan_results)
- `memo_versions` (YAGNI)

### 5.5 Cost Enforcement
**Current:** `usage_events` tracks costs but limits aren't enforced.

**Action:** Implement actual enforcement before scale.

---

## 6. Simplified Architecture

### 6.1 System Diagram (Corrected Workflow)

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: BRAND INTELLIGENCE EXTRACTION                          │
│                                                                  │
│  User adds domain                                                │
│                                                                  │
│  context/extract crawls:                                         │
│    - Brand's website (via Jina Reader)                          │
│    - External sources (web searches about the brand)            │
│                                                                  │
│  Extracts:                                                       │
│    ✓ Products/Services                                          │
│    ✓ Markets/Industries                                         │
│    ✓ Pricing/Packaging                                          │
│    ✓ Offers/Value Props                                         │
│    ✓ Target Personas                                            │
│    ✓ Brand Tone/Voice                                           │
│                                                                  │
│  ✗ NO COMPETITORS - We don't know who they are yet             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: REVERSE-ENGINEER PROMPTS (Persona-Based)               │
│                                                                  │
│  query/generate creates prompts based on personas:              │
│                                                                  │
│  For each persona, ask:                                         │
│  "If this persona needed this solution but didn't know          │
│   the brand existed, what would they ask an AI assistant?"      │
│                                                                  │
│  Requirements:                                                   │
│    - Non-branded (no company names)                             │
│    - High-intent (ready to evaluate solutions)                  │
│    - Conversational (how people talk to AI)                     │
│    - Specific to persona's context                              │
│                                                                  │
│  Output: 5-10 prompts per brand                                 │
│                                                                  │
│  Example:                                                        │
│    Persona: Restaurant Operations Manager                        │
│    Prompt: "What's the best way to automate temperature         │
│             monitoring for food safety compliance?"             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: BASELINE SCAN → COMPETITORS DISCOVERED                 │
│                                                                  │
│  scan/run tests prompts against GPT-4o Mini + Perplexity        │
│                                                                  │
│  AI responses reveal:                                            │
│    - Is brand mentioned/cited?                                  │
│    - Who else is mentioned/cited? ← COMPETITORS DISCOVERED      │
│                                                                  │
│  Output (example):                                               │
│    ┌─────────────────────────────────────────────────────────┐  │
│    │  VISIBILITY REPORT                                      │  │
│    │                                                         │  │
│    │  Your Brand:    0/10 prompts (0% visibility)           │  │
│    │                                                         │  │
│    │  COMPETITORS (Direct Alternatives)                      │  │
│    │    SafetyCulture: 5/10 prompts                         │  │
│    │    Zenput: 3/10 prompts                                │  │
│    │                                                         │  │
│    │  RESOURCES (Industry Sites)                             │  │
│    │    FDA.gov: 4/10 prompts                               │  │
│    │    FoodSafetyMagazine: 2/10 prompts                    │  │
│    │                                                         │  │
│    │  AGGREGATORS (Review Sites)                             │  │
│    │    G2: 3/10 prompts                                    │  │
│    │                                                         │  │
│    │  OPPORTUNITY:                                           │  │
│    │    → Beat SafetyCulture on these 5 prompts             │  │
│    │    → Get cited BY FDA.gov (authority signal)           │  │
│    │    → Get listed on G2 (aggregator presence)            │  │
│    └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Entities saved to DB with:                                      │
│    - entity_type (competitor/partner/resource/aggregator/etc)   │
│    - discovered_from_query_id                                   │
│    - mention_count                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: DAILY MONITORING                                       │
│                                                                  │
│  Cron: 6 AM ET                                                   │
│                                                                  │
│  For each brand:                                                 │
│    - Re-run all prompts                                         │
│    - Track: streaks, first citation, lost citation              │
│    - Discover new entities as they appear                       │
│    - Classify entity types (competitor/resource/aggregator/etc) │
│    - Emit feed events per prompt                                │
│                                                                  │
│  Feed Events:                                                    │
│    - "Gap: [prompt] - SafetyCulture (competitor) cited"        │
│    - "Win: First citation on [prompt]!"                         │
│    - "Alert: Lost citation on [prompt]"                         │
│    - "New Entity: G2 (aggregator) appeared - get listed!"      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: USER ACTIONS                                           │
│                                                                  │
│  Dashboard shows per-prompt events with actions:                │
│                                                                  │
│  [Generate Content] → memo/generate                              │
│    - Creates article with brand tone                            │
│    - Syncs to HubSpot                                           │
│    - Schedules verification (24h, 48h, 72h)                     │
│                                                                  │
│  [Analyze Entity] → cascade/analyze (NEW)                        │
│    - Works for competitors, resources, aggregators              │
│    - Runs same workflow on the entity                           │
│    - Discovers their prompts                                    │
│    - Shows if YOUR brand appears for THEIR prompts              │
│    - Discovers more entities                                    │
│                                                                  │
│  [Reclassify] → Change entity type                               │
│    - User can correct AI classification                         │
│    - e.g., mark "partner" instead of "competitor"              │
│                                                                  │
│  [Dismiss] → marks event resolved                                │
│  [Exclude Prompt] → removes from monitoring                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: VERIFICATION LOOP                                      │
│                                                                  │
│  24h after content publish:                                      │
│    - Re-run original prompt through models                      │
│    - Check if brand now cited                                   │
│    - Track time-to-citation metric                              │
│    - If not cited, retry at 48h, 72h                           │
│                                                                  │
│  Success → "Verified! Content now cited" (PROVES IT WORKED)    │
│  Failure → "Not yet cited, may need optimization"               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 7: REVENUE ATTRIBUTION                                    │
│                                                                  │
│  Daily sync (if HubSpot connected):                             │
│    - Match AI traffic → HubSpot contacts (30-min window)       │
│    - Track contact → deal → closed won                         │
│    - Calculate attributed revenue                               │
│                                                                  │
│  Dashboard shows:                                                │
│    - AI traffic volume                                          │
│    - Contacts attributed                                        │
│    - Pipeline influenced                                        │
│    - Revenue closed                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 8: CASCADE (Optional - Expand the Visibility Map)         │
│                                                                  │
│  User clicks "Analyze Entity" on SafetyCulture (competitor):    │
│                                                                  │
│  cascade/analyze runs:                                           │
│    1. context/extract on SafetyCulture's website                │
│    2. query/generate for SafetyCulture's personas               │
│    3. scan/run with SafetyCulture's prompts                     │
│                                                                  │
│  Results show:                                                   │
│    - Does YOUR brand appear for THEIR prompts? (opportunity!)   │
│    - Who else appears? (more entities discovered)               │
│                                                                  │
│  This cascades outward to build a complete VISIBILITY MAP:      │
│                                                                  │
│    Your Brand                                                    │
│        │                                                         │
│        ├── Your prompts → Entities discovered                   │
│        │     • SafetyCulture (competitor)                       │
│        │     • FDA.gov (resource)                               │
│        │     • G2 (aggregator)                                  │
│        │                                                         │
│        ├── Analyze SafetyCulture                                │
│        │       │                                                 │
│        │       └── Their prompts → You appear? + more found     │
│        │                                                         │
│        └── Keep cascading to map entire competitive landscape   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Event Flow (Corrected)

```
brand/created
    └──> context/extract (NO entities extracted - we don't know them yet)
            └──> query/generate (persona-based only)
                    └──> scan/run (first scan)
                            └──> ENTITIES DISCOVERED FROM RESULTS
                            └──> AI classifies entity types
                            └──> feed events emitted

[Daily Cron]
    └──> daily-run
            └──> scan/run (per brand)
                    └──> New entities discovered
                    └──> Entity types classified
                    └──> feed events emitted

[User Action: Generate Content]
    └──> memo/generate
            └──> HubSpot sync
            └──> gap/verify (scheduled +24h)

[User Action: Analyze Entity]
    └──> cascade/analyze (NEW)
            └──> context/extract (entity's site)
            └──> query/generate (entity's prompts)
            └──> scan/run (see if brand appears)
            └──> More entities discovered

[User Action: Reclassify Entity]
    └──> Update entity_type
    └──> Set classification_source = 'user_set'

[User Action: Dismiss]
    └──> feed event marked resolved

[Scheduled: Attribution Sync]
    └──> attribution/sync
            └──> attribution/sync-deals
```

### 6.3 Key Differences from Current Implementation

| Aspect | Current (Wrong) | V2 (Correct) |
|--------|-----------------|--------------|
| Terminology | "Competitors" only | "Entities" with types |
| When entities known | Before first scan | After first scan |
| Entity source | Brand's website | AI scan results |
| Classification | All are "competitors" | competitor/partner/resource/aggregator/publisher |
| Query generation | Uses competitor data | Uses persona data only |
| Entity discovery | One-time extraction | Continuous from scans |
| Cascade capability | None | Analyze any entity |
| User correction | None | Can reclassify entity types |

---

## 7. Database Schema (Simplified)

### Core Tables

```sql
-- Users/accounts
tenants (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  name text,
  stripe_customer_id text,
  plan text DEFAULT 'free',
  created_at timestamptz
)

-- Brand profiles
brands (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants,
  name text,
  domain text,
  subdomain text UNIQUE,
  context jsonb,  -- {description, products, markets, personas, tone}
  created_at timestamptz
)

-- Prompts to monitor
queries (
  id uuid PRIMARY KEY,
  brand_id uuid REFERENCES brands,
  query_text text,
  category text,
  -- Tracking fields
  scan_count int DEFAULT 0,
  citation_streak int DEFAULT 0,
  longest_streak int DEFAULT 0,
  current_status text, -- 'never_scanned' | 'gap' | 'cited' | 'lost_citation'
  first_cited_at timestamptz,
  last_cited_at timestamptz,
  citation_lost_at timestamptz,
  last_scanned_at timestamptz,
  -- Management
  excluded_at timestamptz,
  excluded_reason text,
  created_at timestamptz
)

-- Latest scan result per query (not historical)
scan_results (
  id uuid PRIMARY KEY,
  query_id uuid REFERENCES queries,
  brand_id uuid REFERENCES brands,
  model text,
  brand_mentioned boolean,
  brand_cited boolean,
  competitors_mentioned text[],
  position int,
  citations jsonb,
  response_text text,
  -- Delta tracking
  is_first_citation boolean,
  citation_status_changed boolean,
  previous_cited boolean,
  scanned_at timestamptz
)

-- Generated content
memos (
  id uuid PRIMARY KEY,
  brand_id uuid REFERENCES brands,
  query_id uuid REFERENCES queries,
  title text,
  slug text,
  content text,
  memo_type text, -- 'comparison' | 'how-to' | 'alternative' | 'industry'
  schema_json jsonb,
  hubspot_post_id text,
  status text, -- 'draft' | 'published'
  published_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz
)

-- Unified feed
feed_events (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants,
  brand_id uuid REFERENCES brands,
  workflow text, -- 'core_discovery' | 'verification' | 'attribution'
  event_type text,
  severity text, -- 'action_required' | 'success' | 'warning' | 'info'
  title text,
  message text,
  data jsonb,
  action_available text,
  query_id uuid,
  memo_id uuid,
  competitor_id uuid,
  is_read boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz
)

-- Entities (DISCOVERED FROM SCAN RESULTS - includes competitors, partners, resources, etc.)
-- Renamed from "competitors" to reflect that AI cites many types of sources
entities (
  id uuid PRIMARY KEY,
  brand_id uuid REFERENCES brands,
  name text,
  domain text,
  
  -- Entity classification
  entity_type text,                     -- 'competitor' | 'partner' | 'resource' | 'aggregator' | 'publisher'
  classification_source text,           -- 'ai_detected' | 'user_set'
  classification_confidence float,      -- 0.0-1.0 if AI-detected
  
  -- Discovery tracking (critical for correct workflow)
  discovered_from_query_id uuid REFERENCES queries,  -- Which prompt revealed them
  discovered_at timestamptz,
  mention_count int DEFAULT 1,          -- How many times they've appeared across scans
  last_mentioned_at timestamptz,
  
  -- Optional: context if user runs cascade analysis
  context jsonb,                        -- Extracted if user analyzes this entity
  context_extracted_at timestamptz,
  
  -- Management
  is_active boolean DEFAULT true,
  created_at timestamptz
)

-- Entity type descriptions:
-- competitor: Direct alternative selling similar product/service
-- partner: Complementary solution, integration partner
-- resource: Industry publication, government site, association
-- aggregator: Review site, comparison site (G2, Capterra, TrustRadius)
-- publisher: Blog, news outlet, content site covering the space

-- Revenue attribution
attribution_events (
  id uuid PRIMARY KEY,
  brand_id uuid REFERENCES brands,
  event_type text, -- 'traffic' | 'contact' | 'deal' | 'closed_won'
  ai_source text,
  memo_id uuid,
  hubspot_contact_id text,
  hubspot_deal_id text,
  deal_value numeric,
  metadata jsonb,
  created_at timestamptz
)

-- Usage/billing
usage_events (
  id uuid PRIMARY KEY,
  tenant_id uuid REFERENCES tenants,
  brand_id uuid,
  event_type text,
  credits_used int,
  metadata jsonb,
  created_at timestamptz
)
```

### Tables to DROP
```sql
DROP TABLE IF EXISTS alerts;           -- Replaced by feed_events
DROP TABLE IF EXISTS competitor_feeds; -- Feature removed
DROP TABLE IF EXISTS competitor_content; -- Feature removed
DROP TABLE IF EXISTS search_console_stats; -- Feature removed
DROP TABLE IF EXISTS visibility_history; -- Calculate from scan_results
DROP TABLE IF EXISTS memo_versions;    -- YAGNI
DROP TABLE IF EXISTS content_gaps;     -- Replaced by query.current_status
```

---

## 8. MOAT Analysis & Differentiation

### 8.1 Sustainable Moats (Priority Order)

| Moat | Score | Description | How to Strengthen |
|------|-------|-------------|-------------------|
| **Closed-Loop Verification** | 95/100 | Only tool that PROVES content worked by re-scanning | Patent the verification methodology; track "time to citation" as key metric |
| **Organic Entity Discovery** | 92/100 | Entities (competitors, resources, aggregators) revealed by AI responses | This is the TRUTH about who has visibility - not self-reported |
| **Entity Classification** | 91/100 | Distinguish competitors vs partners vs resources vs aggregators | Different strategies for each type; no other tool does this |
| **Revenue Attribution** | 90/100 | Connect AI traffic → HubSpot CRM → Revenue | First-party data advantage; more usage = better matching |
| **Cascade Analysis** | 88/100 | Analyze any entity to expand the visibility map | Unique capability to "follow the thread" through entire landscape |
| **HubSpot Marketplace Position** | 85/100 | First AI citation tool in marketplace | Submit listing ASAP; lock in category ownership |
| **Per-Prompt Intelligence** | 80/100 | Track individual prompt performance over time | Accumulate historical data; build benchmarks |
| **Brand Tone Matching** | 70/100 | Content matches brand voice automatically | Improve extraction quality; add style learning |

### 8.2 Why These Are Defensible

**1. Closed-Loop Verification**
- Competitors can monitor, but proving content worked requires the full loop
- "Time to citation" becomes a benchmark only we can provide
- Builds trust: "Your content is verified to be working"

**2. Revenue Attribution**
- Requires HubSpot integration + AI traffic tracking + contact matching
- Data compounds: more history = better attribution accuracy
- CFO-friendly: "AI drove $X in closed deals"

**3. HubSpot Marketplace**
- First-mover in "AI Citation" category
- Marketplace reviews create trust barrier
- Distribution moat: 200K+ HubSpot users discover us organically

**4. Per-Prompt Intelligence**
- Historical data is impossible to recreate
- "Your brand has been cited on this prompt for 47 days straight"
- Switching cost: lose your history

### 8.3 What Competitors Can Copy (Non-Moats)

| Feature | Copyability | Mitigation |
|---------|-------------|------------|
| AI scanning | Easy | Focus on what to do with scan data |
| Content generation | Easy | Quality + tone matching matters more |
| Multi-model support | Easy | Reduce model count; focus on actionability |
| Dashboard UI | Medium | UX is a weak moat |

### 8.4 Differentiation Strategy for B2B Marketers

**Positioning:** "The only AI visibility tool that closes the loop and proves ROI"

**Key Messages:**
1. "We don't just monitor—we verify your content actually works"
2. "See exactly which AI citations drove revenue"
3. "Native HubSpot integration: scan → generate → publish → verify in one workflow"

**Competitive Comparison:**

| Feature | Context Memo | Semrush AI Visibility | Otterly.ai | DIY |
|---------|--------------|----------------------|------------|-----|
| AI Monitoring | ✅ | ✅ | ✅ | ⚠️ Manual |
| Content Generation | ✅ Auto | ❌ | ❌ | ⚠️ Manual |
| HubSpot Publish | ✅ Native | ❌ | ❌ | ❌ |
| Citation Verification | ✅ Unique | ❌ | ❌ | ❌ |
| Revenue Attribution | ✅ Unique | ❌ | ❌ | ❌ |

---

## 9. Implementation Priority

### Phase 0: Fix Core Workflow (CRITICAL - Week 1)
| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| **DELETE `competitor-discover.ts`** | Low | 95/100 | Backend |
| **Rename `competitors` table to `entities`** | Low | 95/100 | Backend |
| Add `entity_type` column (competitor/partner/resource/aggregator/publisher) | Low | 91/100 | Backend |
| Remove competitor extraction from `context-extract.ts` | Low | 95/100 | Backend |
| Update `query-generate.ts` to be purely persona-based | Medium | 90/100 | Backend |
| Update `scan-run.ts` to discover entities + classify types | Medium | 90/100 | Backend |
| Add `discovered_from_query_id` and `mention_count` to entities table | Low | 85/100 | Backend |
| Update onboarding flow to NOT show entities until first scan | Low | 80/100 | Frontend |
| Add entity reclassification UI (user can correct AI classification) | Low | 75/100 | Frontend |

### Phase 1: Core Simplification (Week 2)
| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Remove `alerts` table, migrate to `feed_events` | Medium | 65/100 | Backend |
| Reduce AI models to 3 (GPT-4o Mini, Perplexity, Claude) | Low | 70/100 | Backend |
| Remove `discovery-scan.ts` | Low | 55/100 | Backend |
| Remove competitor content intelligence | Low | 50/100 | Backend |

### Phase 2: Architecture Cleanup (Week 3-4)
| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Split `scan-run.ts` into modules (execute, analyze, discover, emit) | Medium | 60/100 | Backend |
| Remove GSC/Bing integrations | Low | 45/100 | Backend |
| Simplify query generation (single persona-based method) | Medium | 70/100 | Backend |
| Add "Baseline Report" view after first scan | Medium | 75/100 | Frontend |

### Phase 3: Cascade Feature (Week 5)
| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Build `cascade/analyze` Inngest function | Medium | 88/100 | Backend |
| Add "Analyze Competitor" button in dashboard | Low | 85/100 | Frontend |
| Show cascade results (your brand on their prompts, new competitors) | Medium | 80/100 | Full-stack |
| Track cascade depth and relationships in DB | Low | 70/100 | Backend |

### Phase 4: MOAT Features (Week 6-7)
| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Polish citation verification UX | Medium | 85/100 | Full-stack |
| Build revenue attribution dashboard | Medium | 90/100 | Full-stack |
| Submit HubSpot Marketplace listing | Medium | 85/100 | Product |
| Add "time to citation" metrics | Low | 75/100 | Backend |

### Phase 5: Billing & Scale (Week 8)
| Task | Effort | Impact | Owner |
|------|--------|--------|-------|
| Implement usage enforcement | Medium | 80/100 | Backend |
| Complete Stripe setup (env vars, products) | Low | 95/100 | Backend |
| Add rate limiting per tenant | Medium | 60/100 | Backend |
| Performance optimization for 100+ brands | High | 70/100 | Backend |

---

## 10. Technical Specifications

### 10.1 API Models (Final List)

```typescript
const SCAN_MODELS = [
  { 
    id: 'gpt-4o-mini', 
    displayName: 'GPT-4o Mini', 
    provider: 'openrouter', 
    modelId: 'openai/gpt-4o-mini:online',
    enabled: true,
  },
  { 
    id: 'perplexity-sonar', 
    displayName: 'Perplexity Sonar', 
    provider: 'perplexity-direct', 
    modelId: 'sonar',
    enabled: true,
  },
  { 
    id: 'claude-3-5-haiku', 
    displayName: 'Claude 3.5 Haiku', 
    provider: 'openrouter', 
    modelId: 'anthropic/claude-3.5-haiku:online',
    enabled: true,
  },
]
```

### 10.2 Feed Event Types (Simplified)

```typescript
type FeedEventType =
  // Core monitoring
  | 'gap_identified'        // Competitor cited, brand not
  | 'first_citation'        // Brand cited for first time on prompt
  | 'citation_lost'         // Brand was cited, now isn't
  | 'streak_milestone'      // 7, 14, 30 day streaks
  
  // Content lifecycle
  | 'memo_generated'        // Content created
  | 'memo_published'        // Pushed to HubSpot
  | 'citation_verified'     // Content now gets cited
  | 'citation_unverified'   // Content not yet working
  
  // Attribution
  | 'contact_attributed'    // AI traffic → contact
  | 'deal_attributed'       // Contact → deal
  | 'revenue_attributed'    // Deal → closed won
```

### 10.3 Inngest Functions (Final List)

**Keep:**
- `context/extract` - Brand/competitor context extraction (NO competitor discovery)
- `query/generate` - Persona-based prompt generation (NO competitor input needed)
- `scan/run` - Daily scanning + competitor discovery from results
- `memo/generate` - Content generation
- `gap/verify` - Citation verification
- `attribution/sync` - Revenue attribution
- `daily/run` - Main scheduler

**Add (NEW):**
- `cascade/analyze` - Analyze a discovered competitor (run same workflow on them)

**Remove:**
- `competitor/discover` - **CRITICAL: DELETE THIS** (competitors come from scan results)
- `discovery/scan`
- `competitor/content-scan`
- `competitor/content-classify`
- `competitor/content-respond`
- `google-search-console/sync`
- `bing/sync`
- `prompt-intelligence/analyze`
- `model-insights/analyze`
- `prompt/enrich`

### 10.4 Environment Variables (Required)

```bash
# Core
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Providers (only 2 needed)
OPENROUTER_API_KEY=          # GPT-4o Mini + Claude via OpenRouter
PERPLEXITY_API_KEY=          # Direct Perplexity API

# Background Jobs
INNGEST_SIGNING_KEY=
INNGEST_EVENT_KEY=

# Integrations
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=

# Payments
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Content Submission
INDEXNOW_API_KEY=

# Web Scraping
JINA_API_KEY=

# Email (for notifications)
RESEND_API_KEY=
```

---

## 11. Success Metrics

### North Star Metric
**Verified Citations per Customer per Month**

A citation is "verified" when:
1. Brand was NOT cited on a prompt (gap)
2. Content was generated and published
3. Re-scan shows brand IS NOW cited

### Leading Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily Active Users | 40%+ | Login within 24h |
| Scans per Brand | 30+ queries | Auto-daily |
| Gaps Identified | 5-15 per brand | From scans |
| Content Generated | 2-5 per brand/month | User action |
| Verification Rate | 30%+ | Verified / content created |
| Time to Citation | <72 hours | Verification loop |

### Revenue Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| MRR Growth | 20% m/m | Early stage |
| Conversion (trial → paid) | 15%+ | After 14-day trial |
| Churn | <5% monthly | Stickiness |
| LTV:CAC | 3:1+ | Healthy unit economics |

### Attribution Metrics (for customers)

| Metric | Why It Matters |
|--------|----------------|
| AI Traffic Volume | Are AI platforms sending traffic? |
| Contacts Attributed | Did traffic turn into leads? |
| Pipeline Influenced | Did leads become opportunities? |
| Revenue Closed | Did opportunities close? |

---

## 12. Risks & Mitigations

### 12.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OpenRouter/Perplexity API changes | Medium | High | Abstract provider layer; monitor changelogs |
| HubSpot OAuth token expiration | Low | High | Already implemented refresh; add monitoring |
| Scan costs exceed revenue | Medium | High | Implement usage limits ASAP |
| scan-run.ts complexity causes bugs | High | Medium | Refactor into modules (Phase 2) |

### 12.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Competitor launches similar tool | High | Medium | Double down on verification + attribution moats |
| AI models stop providing citations | Low | Critical | Diversify models; monitor API changes |
| Content doesn't actually improve citations | Medium | High | Honest about verification results; iterate on content quality |
| HubSpot Marketplace rejection | Low | Medium | Follow guidelines exactly; prepare for feedback |

### 12.3 Market Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| "AI visibility" becomes commoditized | High | Medium | Focus on verification + attribution (harder to copy) |
| B2B buyers don't care about AI citations | Low | Critical | Revenue attribution proves ROI; case studies |
| Pricing too high for SMB | Medium | Medium | Tiered pricing; free tier for adoption |

---

## Appendix A: Files to Remove

```
lib/inngest/functions/
  - competitor-discover.ts    ← CRITICAL: This is the wrong approach
  - discovery-scan.ts
  - competitor-content.ts
  - google-search-console-sync.ts
  - bing-sync.ts
  - prompt-intelligence.ts
  - model-insights.ts
  - prompt-enrich.ts

components/dashboard/
  - alerts-list.tsx (migrate functionality to feed)
  - search-console-view.tsx
  - competitor-content-feed.tsx
  - prompt-intelligence-feed.tsx
  - model-insights-panel.tsx

app/api/
  - auth/google-search-console/* (entire directory)
```

## Appendix B: Files to Add

```
lib/inngest/functions/
  - cascade/
    - analyze.ts              ← Analyze a competitor (same workflow)
  - scan/
    - execute.ts              ← Just run queries through models
    - analyze.ts              ← Compute gaps, track citations
    - discover.ts             ← Extract competitors from responses
    - emit-results.ts         ← Emit feed events
```

## Appendix C: Migration Checklist

### Phase 0: Fix Core Workflow (CRITICAL)
- [ ] **DELETE `competitor-discover.ts`** ← Do this first
- [ ] Remove competitor extraction from `context-extract.ts`
- [ ] Remove competitor-related prompts from `context-extraction.ts`
- [ ] Update `query-generate.ts` to be purely persona-based
- [ ] Add migration: `discovered_from_query_id`, `mention_count` to competitors table
- [ ] Update `scan-run.ts` to save competitors with discovery source
- [ ] Update onboarding UI to not show competitors until first scan complete
- [ ] Add "Baseline Report" view showing discovered competitors

### Phase 1: Core Simplification
- [ ] Create `feed_events` entries for all existing `alerts`
- [ ] Update all UI components to use feed API
- [ ] Remove `alerts` table inserts from Inngest functions
- [ ] Drop `alerts` table
- [ ] Update scan-run to only use 3 models
- [ ] Remove competitor content functions
- [ ] Remove GSC/Bing functions

### Phase 2: Architecture Cleanup
- [ ] Split scan-run.ts into modules
- [ ] Update daily-run to simplified flow
- [ ] Simplify query generation to single method

### Phase 3: Cascade Feature
- [ ] Build `cascade/analyze` function
- [ ] Add "Analyze Competitor" button
- [ ] Build cascade results view
- [ ] Track cascade relationships

### Phase 4+: MOAT & Scale
- [ ] Polish verification UX
- [ ] Build attribution dashboard
- [ ] Submit HubSpot Marketplace listing
- [ ] Implement usage limits
- [ ] Complete Stripe setup

---

## Appendix D: Key Insight Summary

**The fundamental changes in V2:**

### 1. Entity Discovery (Not "Competitor" Extraction)

| Concept | V1 (Wrong) | V2 (Correct) |
|---------|------------|--------------|
| Terminology | "Competitors" only | "Entities" with types |
| Source | Brand's website | AI scan results |
| When known | Before first scan | After first scan |
| Classification | All treated same | competitor/partner/resource/aggregator/publisher |
| Query generation | Uses competitor data | Uses persona data only |
| Truth source | Self-reported | AI's actual response |
| List | Static | Continuously discovered |
| Expansion | None | Cascade analysis |

### 2. Entity Types & Strategy

| Entity Type | What It Is | Strategic Goal |
|-------------|------------|----------------|
| **Competitor** | Direct alternative | Beat them on prompts |
| **Partner** | Complementary solution | Be featured alongside |
| **Resource** | Industry site, gov, association | Get cited BY them |
| **Aggregator** | Review site (G2, Capterra) | Get listed/ranked |
| **Publisher** | Blog, news outlet | Get featured in their content |

### 3. One-Sentence Summary

**Entities are whoever AI cites when you run non-branded prompts. They're not all competitors - some are resources to leverage, aggregators to list on, or partners to align with.**

---

**Document End**

*Version 2.2 - Updated February 4, 2026 with Entity Taxonomy*
*For questions: Review with product and engineering leads before implementation.*
