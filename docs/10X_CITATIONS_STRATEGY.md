# 10X AI Citations Strategy for Checkit

**Date:** February 3, 2026  
**Baseline:** 0% mentions, 0% citations across 312 scans  
**Goal:** 10x AI citations/mentions

---

## Problem Analysis

### What We Found

1. **Wrong competitors/queries (Fixed)**
   - Original config had project management tools (Asana, Monday, Trello) as competitors
   - Queries were about task management, not temperature monitoring
   - **Status:** Fixed - now have 33 relevant queries + 7 correct competitors

2. **Even with correct queries, 0% mentions**
   - Discovery scan tested 58 temperature monitoring queries
   - Result: 0 mentions across all AI models
   - This tells us the problem isn't query targeting

3. **Root Cause: AI models don't know Checkit exists**
   - 6 memos exist and are published
   - But AI models (GPT-4o, Claude, Perplexity, etc.) don't cite them
   - The content exists but isn't being discovered/indexed

### The Citation Funnel

```
Content Created → Indexed by Search → Found by AI → Mentioned/Cited
     ✅              ❓                    ❌           ❌
```

The bottleneck is between **Indexed** and **Found by AI**.

---

## Why AI Models Cite Brands

AI models cite brands when:

1. **Training Data** - Brand appears in training corpus (Wikipedia, news, major publications)
2. **Real-time Search** - For search-enabled models, brand appears in search results
3. **Authority Signals** - Multiple authoritative sources mention the brand
4. **Direct Relevance** - Content directly answers the query with structured facts

### Checkit's Current State

| Signal | Status | Issue |
|--------|--------|-------|
| Training Data | Weak | Small B2B brand, limited public coverage |
| Search Presence | Unknown | Need to verify memo indexing |
| Authority | Weak | Few backlinks to memo pages |
| Content Quality | Good | Memos have structured facts |

---

## Strategy: Working Backwards from 10X

### What "10X" Means

- Current: 0% citation rate
- Target: Meaningful citations (even 10% would be technically infinite improvement)
- Realistic target: 15-25% citation rate on relevant queries

### The Three Levers

#### Lever 1: Content Discovery (Highest Impact)

**Problem:** Memos exist but aren't found by AI search
**Solution:** Ensure AI crawlers can access and index content

Actions:
- [ ] Verify memo pages are indexed by Google (site:checkit.contextmemo.com)
- [ ] Check robots.txt allows AI crawlers (GPTBot, ClaudeBot, etc.)
- [ ] Add sitemap.xml for memo pages
- [ ] Submit to Google Search Console
- [ ] Verify structured data (JSON-LD) is valid

#### Lever 2: Authority Building (Medium Impact)

**Problem:** Even if indexed, low authority means low ranking
**Solution:** Build authority signals

Actions:
- [ ] Cross-link memos to each other (internal linking - already exists)
- [ ] Link memos from Checkit's main website
- [ ] Create llms.txt for AI model instructions
- [ ] Add content to Checkit's blog with links to memos
- [ ] Consider PR/earned media for key topics

#### Lever 3: Query Targeting (Already Done)

**Problem:** Wrong queries being tested
**Solution:** Test queries people actually ask about temperature monitoring

Actions:
- [x] Fix competitor list (ComplianceMate, SafetyCulture, Zenput, etc.)
- [x] Add temperature monitoring queries
- [x] Add food safety compliance queries
- [x] Add competitor comparison queries

---

## Immediate Next Steps

### 1. Verify Content Discovery

```bash
# Check if memos are indexed
site:checkit.contextmemo.com

# Check robots.txt
curl https://contextmemo.com/robots.txt

# Check for sitemap
curl https://contextmemo.com/sitemap.xml
```

### 2. Optimize for AI Crawlers

Create/update `public/robots.txt`:
```
User-agent: GPTBot
Allow: /memo/

User-agent: ClaudeBot  
Allow: /memo/

User-agent: Perplexity-Bot
Allow: /memo/
```

Create `public/llms.txt` (AI instructions file):
```
# Context Memo - Brand Reference Content
This site contains factual reference content about B2B brands.
Content under /memo/ is intended to be cited by AI assistants.
All content is verified and kept up to date.
```

### 3. Add AI-Optimized Metadata

For each memo page, ensure:
- Clear `<title>` with brand name
- `<meta name="description">` with key facts
- JSON-LD structured data
- `<article>` semantic HTML
- Canonical URLs

### 4. Build Authority

- Add link from checkit.net to checkit.contextmemo.com
- Cross-reference in any owned content (blog posts, docs)
- Consider creating a "Source for AI" page on main website

---

## Measurement Plan

### Metrics to Track

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Mention Rate | 0% | 15% | Scan results |
| Citation Rate | 0% | 10% | Brand in citations field |
| Index Coverage | ? | 100% | Google Search Console |
| AI Traffic | ? | 50/month | ai_traffic table |

### Timeline

| Week | Focus | Expected Outcome |
|------|-------|------------------|
| 1 | Discovery fixes | Memos indexed |
| 2 | Authority building | Backlinks live |
| 3 | Fresh scans | Measure improvement |
| 4 | Iterate | Optimize based on data |

---

## Platform Improvements Needed

### For Context Memo Product

1. **Auto-generate sitemap** for all published memos
2. **Add AI crawler robots.txt** rules by default
3. **Track indexing status** per memo (Google Index API)
4. **Add "AI readiness" score** showing discovery likelihood
5. **Auto-submit new memos** to IndexNow/Google
6. **llms.txt generator** for each brand subdomain

### For Monetization

This problem → solution path is the core value prop:
- "Your brand isn't being cited because AI can't find your content"
- "We create discoverable, authoritative content that AI will cite"
- "Track your AI visibility and improve over time"

---

## Summary

The fix wasn't just about queries. The real problem is content discovery.

**Completed:**
- Fixed competitor list
- Fixed query list

**Next:**
- Verify/fix content indexing
- Add AI crawler optimizations
- Build authority signals
- Re-scan and measure

**Expected Impact:**
- From 0% to 15-25% mention rate within 2-4 weeks
- Establishes repeatable playbook for all brands
