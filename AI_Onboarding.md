# Context Memo - Project Documentation

> **Last Updated:** February 14, 2026  
> **Version:** 0.27.0  
> **Status:** MVP Complete + V2 Feed UI + Usage Tracking & Billing + Corporate Positioning Framework + Memo-First Branding + Daily Digest Email + Content Coverage Audit + Premium Invite-Only Positioning + Custom Domain Support + Reverse Proxy Embedding + AI Search Mastery Course + Course Email Nurture System + AI Visibility Audit + Research Tab (Market Intelligence)

---

## What is Context Memo?

**Context Memo** is a B2B SaaS platform that helps brands become visible in AI-powered search engines (ChatGPT, Claude, Perplexity, Gemini). It automatically creates factual, citable reference content about brands that AI models can use when answering user queries.

### The Problem We Solve

When B2B buyers ask AI assistants "What's the best CRM for small teams?" or "How do I automate marketing workflows?", AI models generate answers based on their training data and available web content. Brands that aren't represented with clear, factual content get overlooked.

### How It Works

1. **Brand Context Extraction** - AI scans your website to extract verified facts
2. **Competitor Discovery** - Identifies who you compete with
3. **Query Generation** - Creates high-intent prompts your buyers actually ask
4. **AI Visibility Scanning** - Tests if AI models mention you for those queries
5. **Memo Generation** - Creates factual content filling the gaps
6. **Continuous Monitoring** - Daily automation keeps everything current

### Target Audience

- **B2B Marketers** managing brand visibility
- **Product Marketers** positioning against competitors
- **Content Teams** scaling AI-optimized content
- **Growth Teams** tracking AI as a discovery channel

---

## Tech Stack

| Component | Technology | Version/Details |
|-----------|------------|-----------------|
| Frontend | Next.js + React + Tailwind CSS | 16.1.6 / 19.2.3 / 4.x |
| UI Components | shadcn/ui | Latest |
| Database | Supabase (Postgres) | Project: ncrclfpiremxmqpvmavx |
| Auth | Supabase Auth | Email verification + domain verification |
| Job Queue | Inngest | v3.50.0 |
| AI Providers | OpenAI, Anthropic, OpenRouter | GPT-4o, Claude, Gemini, Llama, Mistral, Perplexity, DeepSeek, Qwen, Grok |
| Web Scraping | Jina Reader API | - |
| Hosting | Vercel | Connected to GitHub main |
| Payments | Stripe | Foundation built |
| Search API | SerpAPI | Google AI Overviews |

---

## Key Features

### Core Platform
- Landing page with early adopter pricing model
- User authentication (work email + email verification)
- Brand creation with email domain verification
- Dashboard with visibility scores and trends
- Brand detail page with stats, prompts, memos, and settings
- Public memo pages (`[subdomain].contextmemo.com`)

### AI Visibility Monitoring
- **9 AI models scanned**: GPT-4o, Claude, Gemini 2.0 Flash, Llama 3.1 70B, Mistral Large, Perplexity Sonar, DeepSeek V3, Qwen 2.5 72B, Grok 2
- **Google AI Overviews**: SerpAPI integration checks brand mentions in Google's AI summaries
- Visibility score tracking over time
- Win/tie/loss analysis vs competitors
- AI traffic attribution (track visits from ChatGPT, Perplexity, Claude, etc.)

### Competitive Intelligence
- Auto-discovered competitors
- Share-of-voice analysis across all scans
- "Queries to improve" recommendations
- Competitor content monitoring (blogs/articles)
- Auto-generated response content

### Search Console Integrations
- **Bing Webmaster API**: Shows ChatGPT's discovery pathway
- **Google Search Console**: Shows Google AI Overviews pathway
- Query correlation with AI prompts
- Opportunity detection

### Content Automation
- **Memo Types**: Comparison, industry guide, how-to, alternative, response
- Persona-based targeting (B2B Marketer, Developer, Product Leader, Enterprise Buyer, SMB Owner, Student)
- Brand tone customization
- Automated internal backlinking
- Daily refresh cycles

---

## Architecture

### Background Jobs (Inngest)

| Function | Description |
|----------|-------------|
| `context/extract` | Crawls website, extracts brand context using Jina + GPT-4 |
| `competitor/discover` | Identifies competitors using AI |
| `query/generate` | Generates high-intent buyer queries from homepage content |
| `scan/run` | Queries 6 AI models to check brand mentions |
| `memo/generate` | Creates factual memos → auto-triggers backlinking |
| `discovery/scan` | Tests 50+ query variations for baseline discovery |
| `memo/backlink` | Injects contextual internal links into memos |
| `memo/batch-backlink` | Updates all memos for a brand |
| `competitor/content-scan` | Daily scan of competitor RSS feeds |
| `competitor/content-classify` | AI classifies and filters content |
| `competitor/content-respond` | Generates unique response content |
| `competitor/content-backfill` | One-time import of historical content |
| `google-search-console/sync` | Syncs GSC data weekly |
| `bing/sync` | Syncs Bing Webmaster data weekly |
| `ai-overview/scan` | Checks Google AI Overviews via SerpAPI |
| `daily/run` | Main scheduler (6 AM ET) |
| `uptime-check` | Health check every 5 min → email alerts on failure/recovery |

### Automation Schedule

| Task | Frequency | Trigger |
|------|-----------|---------|
| Context refresh | Weekly | Context older than 7 days |
| Competitor discovery | Weekly | No new competitors in 7 days |
| Query generation | Weekly | No new queries in 7 days |
| Visibility scan | Daily | No scan in 24 hours |
| Google AI Overview scan | Mon + Thu | If SERPAPI_KEY set |
| Memo generation | On-demand | Gaps detected in scans |
| Competitor content scan | Daily | Part of daily run |
| Search console sync | Weekly | Sundays 9 AM UTC |
| Uptime health check | Every 5 min | Inngest cron → emails admins on failure |

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/health` | Uptime health check (Supabase + Redis status) |
| `/api/inngest` | Inngest webhook endpoint |
| `/api/brands/[brandId]/actions` | Trigger background jobs |
| `/api/brands/[brandId]/export` | Export data (CSV/JSON) |
| `/api/auth/google-search-console/*` | GSC OAuth flow |
| `/api/billing/checkout` | Stripe checkout session |
| `/api/billing/portal` | Stripe customer portal |
| `/api/billing/webhook` | Stripe webhooks |
| `/api/track` | AI traffic attribution |
| `/api/organizations/*` | Team/org management |
| `/api/invites/[token]` | Invite acceptance |
| `/auth/callback` | Email verification links |

### Database Schema

| Table | Description |
|-------|-------------|
| `tenants` | User accounts |
| `brands` | Brand profiles with context |
| `competitors` | Discovered competitors |
| `competitor_feeds` | RSS/Atom feeds per competitor |
| `competitor_content` | Tracked competitor articles |
| `queries` | Search prompts to monitor |
| `scan_results` | AI scan results |
| `memos` | Generated context memos |
| `memo_versions` | Version history |
| `search_console_stats` | Bing/Google search data |
| `alerts` | User notifications |

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ncrclfpiremxmqpvmavx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[set]
SUPABASE_SERVICE_ROLE_KEY=[required for background jobs]

# AI Providers
OPENAI_API_KEY=[required]
ANTHROPIC_API_KEY=[required]
OPENROUTER_API_KEY=[required for multi-model]

# Inngest
INNGEST_SIGNING_KEY=[required for production]
INNGEST_EVENT_KEY=[required for production]

# Google Search Console (OAuth)
GOOGLE_CLIENT_ID=[for GSC integration]
GOOGLE_CLIENT_SECRET=[for GSC integration]

# SerpAPI (Google AI Overviews)
SERPAPI_KEY=[for AI Overview scans - 100 free/month]

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[from Stripe dashboard]
STRIPE_SECRET_KEY=[from Stripe dashboard]
STRIPE_WEBHOOK_SECRET=[from webhook config]
```

---

## File Structure

```
app/
├── (auth)/           # Login, signup, verify-email
├── (dashboard)/      # Protected dashboard routes
│   ├── dashboard/    # Main dashboard
│   └── brands/       # Brand management
├── api/              # API routes
├── memo/             # Public memo pages
└── mockups/          # Design mockups

components/
├── dashboard/        # Dashboard-specific components
└── ui/               # shadcn/ui components

lib/
├── ai/prompts/       # AI prompt templates
├── inngest/          # Background job functions
├── supabase/         # Database client & types
└── utils/            # Helper utilities
```

---

## Current Status

### Completed ✅
- [x] Core platform (auth, dashboard, brand management)
- [x] Multi-model AI scanning (9 models including DeepSeek, Qwen, Grok)
- [x] Google AI Overviews integration (SerpAPI)
- [x] AI traffic attribution (track visits from AI platforms)
- [x] Data export (CSV/JSON)
- [x] Automated memo generation
- [x] Competitive intelligence dashboard
- [x] Search console integrations (Bing + Google)
- [x] Competitor content intelligence
- [x] Persona-based targeting
- [x] Daily automation pipeline
- [x] Vercel deployment
- [x] Team/organization foundation (roles, invites)
- [x] Stripe billing foundation (checkout, portal, webhooks)

### In Progress 🔄
- [ ] Set Stripe environment variables
- [ ] Create Stripe products/prices in dashboard
- [ ] Configure Stripe webhook endpoint
- [ ] Production environment variables setup

### Planned 📋
- [ ] Usage enforcement (plan limits)
- [ ] Email notifications for visibility changes
- [ ] Additional memo templates (best-of, what-is)

---

## Problems & Opportunities

### Active Issues

| Issue | Priority | Status |
|-------|----------|--------|
| Stripe env vars not set | High | Blocks live billing |
| Stripe products/prices needed | High | Create in dashboard |
| Stripe webhook endpoint | High | Configure URL |
| Usage enforcement | Medium | Limits not enforced yet |

### Opportunities (Scored 0-100)

| Opportunity | Score | Impact |
|-------------|-------|--------|
| Complete Stripe setup | 95 | Revenue enablement |
| Email notifications | 75 | User engagement + retention |
| API access for brands | 65 | Developer market |
| More memo types | 55 | Content depth |
| White-label option | 50 | Agency market |

---

## Quick Reference

### Local Development

```bash
# Start dev server
npm run dev

# Start Inngest dev server (separate terminal)
npm run dev:inngest

# Build for production
npm run build
```

### Key URLs

| Environment | URL |
|-------------|-----|
| Local | http://localhost:3000 |
| Production | https://contextmemo.com |
| Inngest Dashboard | https://app.inngest.com |
| Supabase Dashboard | https://supabase.com/dashboard/project/ncrclfpiremxmqpvmavx |
| Vercel Dashboard | https://vercel.com |

### Useful Commands

```bash
# Trigger brand scan manually (via Inngest dev)
curl -X POST http://localhost:8288/e/context/scan/run \
  -d '{"data": {"brandId": "uuid-here"}}'

# Check recent git history
git log --oneline -10
```

---

## Changelog

The changelog is public-facing at [contextmemo.com/changelog](/changelog) and automatically renders from [CHANGELOG.md](./CHANGELOG.md).

### How to Update the Changelog

**On every deploy, update CHANGELOG.md with the following process:**

1. **During development**: Add changes to the `[Unreleased]` section as you work
2. **Before deploying**: Move unreleased items to a new version section
3. **After deploying**: Commit the changelog update with the deploy

#### Changelog Entry Format

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features (use **bold** for feature names)

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

### Removed
- Removed features
```

#### Version Numbering

- **Major (X.0.0)**: Breaking changes or major new capabilities
- **Minor (0.X.0)**: New features, backwards compatible
- **Patch (0.0.X)**: Bug fixes, small improvements

#### Example Workflow

```bash
# 1. Before starting work, add to [Unreleased]:
## [Unreleased]
### Added
- New email notification system

# 2. When ready to deploy, create new version:
## [0.9.0] - 2026-02-02
### Added
- New email notification system

# 3. Deploy with changelog update:
git add CHANGELOG.md [other files]
git commit -m "Add email notifications"
git push
```

#### Auto-Update Reminder

When the AI assistant deploys changes, it should:
1. Check what features/fixes are being deployed
2. Add appropriate entries to CHANGELOG.md
3. If significant changes, bump the version number
4. Include changelog update in the deploy commit

---

## Contributing

1. Create feature branch from `main`
2. Make changes
3. Test locally with `npm run dev`
4. Test Inngest jobs with `npm run dev:inngest`
5. **Update CHANGELOG.md** with your changes
6. Deploy: `git add . && git commit -m "message" && git push`
7. Vercel auto-deploys from main branch

---

## Deploy Log

_Most recent deploys first_

### February 14, 2026

**Research Tab: Market x Competitor Matrix with Buyer Awareness Scoring** (e9d5bbf)
- New RESEARCH tab in brand dashboard — market intelligence view for CMOs and founders
- Market x Competitor matrix: rows = industry verticals, columns = competitors ranked by AI share-of-voice
- Buyer awareness scoring per market (unaware / problem-aware / solution-aware / product-aware) derived from problem vs. solution query framing
- Summary cards: Markets Discovered, Entities Tracked, Queries Monitored, Scans Analyzed + insight cards for Strongest Market, Weakest Market, Biggest Opportunity
- Cell drill-down: click any cell to see detailed competitor metrics, SOV breakdown, market context, and strategic insight
- Database: added `vertical` (text) and `query_framing` (problem/solution) columns to `queries` table with indexes
- Modified query generation prompt to distribute queries across brand verticals with problem/solution framing
- Updated `query-generate.ts` to parse and store vertical + query_framing fields
- Created backfill API route (`/api/backfill-query-verticals`) for AI-based classification of existing queries
- Backfilled all 1,308 active queries across 14 brands with vertical + framing tags via SQL
- New files: `research-view.tsx`, `research-summary.tsx`, `market-matrix.tsx`, `/api/brands/[brandId]/research/route.ts`

**Wire TRAFFIC Tab to Real Data (bot_crawl_events)** (49ff01a)
- Rewired the TRAFFIC tab to use `bot_crawl_events` (1,428+ real server-side events) as the primary data source instead of `ai_traffic` (30 client-side test events).
- Database migration: added `ip_city`, `ip_region`, `ip_latitude`, `ip_longitude`, `ip_timezone` columns to `bot_crawl_events`.
- Updated `proxy.ts` middleware to capture full Vercel geo headers (city, region, lat/lng, timezone) on every bot crawl going forward.
- Updated `BotCrawlData` interface and `logBotCrawl()` in `lib/bot-detection.ts` to accept and insert new geo fields.
- Traffic page now fetches brand subdomain and queries `bot_crawl_events` filtered by it (same pattern as PERFORMANCE tab).
- Rewrote `AITrafficView` component with: AI funnel stats (Training/Search/Click), funnel bar chart, traffic by AI provider with category-colored stacked bars, top pages with per-category breakdowns, recent crawl events with bot name + category badge + geo location, full bot breakdown.
- Kept `ai_traffic` as supplementary "Human Visitor Traffic" section for organic/direct/JS-tracked visits.
- Updated `brand-tabs.tsx` to match new props interface.

**Visitor Intelligence Phase 1: Internal Traffic Exclusion + Geo Data Capture** (ef273b1)
- Added `cm_internal` cookie-based internal traffic exclusion — automatically set on authenticated dashboard users via middleware, checked both client-side (AITrafficTracker) and server-side (POST/GET track endpoints). Excludes your own browsing from analytics.
- Now capturing Vercel geo headers (city, region, lat/lng, timezone) on every tracked visit — previously only country was stored. These are free on every Vercel request.
- IP addresses are hashed (SHA-256, truncated to 16 chars) and stored as `ip_hash` for future company enrichment without storing raw PII.
- Database migration: added `ip_hash`, `city`, `region`, `latitude`, `longitude`, `timezone` columns to `ai_traffic` with geo and IP hash indexes.
- Analytics APIs (memo analytics, brand performance) now return city/region in recent visit responses.
- UI components (AITrafficView, MemoAnalyticsCard) display visitor location with MapPin icon alongside AI source labels (e.g., "from ChatGPT · Dallas, TX").
- Foundation for Phase 2 (IP-to-company enrichment via IPinfo.io) — `ip_hash` column enables cache-based lookup without redundant API calls.

### February 13, 2026

**AI Visibility Audit Page — Trojan Horse** (45bdc98)
- New public route `/audit/[slug]` for shareable AI visibility audit reports
- Sample report live at `/audit/benchprep-sample` with real BenchPrep scan data
- Components: radial score display, model breakdown cards, competitor bar chart, gap/strength cards, recommendations, CTA
- Created `brand_reports` Supabase table for storing frozen report snapshots
- TypeScript types in `lib/report/types.ts` for audit data structure
- Designed as SDR lead magnet — prospect receives link, forwards to marketing, marketing converts to Context Memo customer

**Synthesis Prompt Tuning — Longer Output + Anti-Fabrication** (06c8bfd)
- Raised word count targets to 3,000-4,000 (overshoot to land ~2,000 from GPT-4o)
- Added explicit per-section depth requirements (3-4 paragraphs each)
- Added "BEFORE YOU STOP WRITING" self-check block at end of prompt
- Added system message + maxTokens: 16000 + temperature: 0.5 in memo-synthesize.ts
- Tested end-to-end: output went from 1,167 → 1,972 words with zero fabricated data

**Multi-Source Synthesis Memo Generation** (a4c52f2)
- New memo type: `synthesis` — combines content from ALL competitor URLs cited for a single prompt into one definitive article
- Created `SYNTHESIS_MEMO_PROMPT` in `lib/ai/prompts/memo-generation.ts` with:
  - Anti-fabrication rules: comparison table cells left blank or "Contact vendor" rather than invented data
  - Explicit 2,000–3,500 word targets with mandatory 9-section article structure
  - Deeper structural requirements (6-8 FAQ entries, 5-6 row comparison tables)
- Created `lib/inngest/functions/memo-synthesize.ts` — Inngest function that fetches top 5 cited competitor URLs for a prompt, assembles brand context + voice insights, and generates a comprehensive synthesis memo via GPT-4o
- Added `synthesize_from_prompt` API action in `app/api/brands/[brandId]/actions/route.ts`
- Added "Synthesize N sources" button in `components/dashboard/citation-insights.tsx` for prompts with 2+ competitor citations, with a SynthesisModal for progress tracking
- Updated `lib/inngest/functions/scan-run.ts` auto-generation logic: prefers synthesis when 2+ unique cited URLs exist, falls back to single citation-respond for 1 URL, then standard memo generation

### February 12, 2026

**Course Email Nurture System** (c1c2fdc)
- Adaptive email nurture drip sequences for the AI Search Mastery course
- 3 segments based on baseline score: Beginner (0-39%), Developing (40-79%), Advanced (80%+)
- 28 email templates across time-based sequences and behavioral triggers
- Created `course_emails_sent` Supabase table (prevents duplicate sends via unique constraint)
- Created `lib/course/nurture.ts` — segment logic, sequence definitions, behavioral triggers (stall detection, completion nudges)
- Created `lib/course/emails.ts` — all email templates with shared wrapper matching existing Resend patterns
- Created `lib/inngest/functions/course-nurture.ts`:
  - **courseNurtureCheck** (cron every 6h) — processes all enrolled users, sends due sequence + behavioral emails
  - **courseNurtureSend** (event-triggered) — sends immediate emails on enrollment, baseline completion, final completion
- Added 4 course Inngest events: `course/enrolled`, `course/baseline-completed`, `course/module-completed`, `course/final-completed`
- Emits events from `enroll`, `assessment`, and `progress` API routes
- Behavioral triggers: `stall_no_start` (48h), `stall_halfway` (5+ modules, 5+ days idle), `nudge_final` (course done, no final for 3+ days)
- Post-final behavioral: `final_improved` (5+ pt gain), `final_same` (no improvement)
- Personalized with missed categories from assessment answers, score data, and module progress

**Prompts Page: Multi-Select & Bulk Actions**
- Added multi-select checkboxes to the V2 prompts page (`app/v2/brands/[brandId]/prompts/`)
- Floating action bar appears when prompts are selected with 5 bulk actions:
  - **Re-scan** — triggers Inngest `scan/run` for selected prompt IDs
  - **Exclude** — bulk disable with reason picker (irrelevant/duplicate/low_value/other)
  - **Delete** — permanent hard delete with confirmation dialog
  - **Generate New** — triggers Inngest `query/generate` for fresh prompts
  - **Re-enable** — bulk restore excluded prompts (in excluded section)
- Select All / Deselect All toggle in toolbar with live count
- Excluded prompts section also gets multi-select with bulk re-enable and delete
- New bulk API route: `POST /api/brands/[brandId]/prompts/bulk` with auth, ownership verification, and UUID validation
- Installed shadcn Checkbox component (`components/ui/checkbox.tsx`)

**Custom Domain Preferred Everywhere** (49ad9e1)
- When a brand has a verified custom domain (e.g. `ai.crezzo.com`), it is now used as the primary URL everywhere instead of `subdomain.contextmemo.com`
- Updated 25+ files across dashboard UI, memo feed, brand headers, brand switcher, memo editor, citation insights, content performance, IndexNow submissions, memo generation alerts, search console sync, Bing sync, activity logger, and admin tables
- Created shared utility `lib/utils/brand-url.ts` for consistent URL construction
- Updated `buildMemoUrl()` in indexnow.ts to accept optional custom domain params
- Schema JSON `mainEntityOfPage` in generated memos now uses custom domain
- All "View Live" links, URL previews in SEO editor, and alert messages respect custom domain

**Reverse Proxy Support for Path-Based Memo Embedding** (4877009)
- Added `assetPrefix` support via `NEXT_PUBLIC_ASSET_PREFIX` env var so assets load from contextmemo.com when pages are served through a reverse proxy on a customer's domain (avoids `/_next` asset conflicts)
- Updated CSP headers to allow `https://contextmemo.com` in script-src, style-src, font-src for cross-origin asset loading
- Added `proxy_base_path` column to brands table — when set, internal links use that prefix (e.g., `/memos/vs/okrs-vs-kpis`) instead of `/memo/{subdomain}/...`
- Moved brand fetch earlier in MemoPage to access `proxy_base_path` before computing `linkPrefix`
- Set `proxy_base_path = '/memos'` for Krezzo brand
- Added Vercel rewrites on outcomeview.com to proxy `/memos/*` → `contextmemo.com/memo/krezzo/*`
- Verified end-to-end: `outcomeview.com/memos/` renders Krezzo memos, deep links work, assets load cross-origin, existing outcomeview.com pages unaffected

**Files changed:**
- `next.config.ts` — assetPrefix + CSP update
- `app/memo/[subdomain]/[[...slug]]/page.tsx` — proxy_base_path link prefix support

**Database changes:**
- Migration: `add_proxy_base_path_to_brands` — added `proxy_base_path TEXT` column to brands table

**External changes:**
- Set `NEXT_PUBLIC_ASSET_PREFIX=https://contextmemo.com` on Vercel production env
- Deployed outcomeview Vercel project with rewrite rules in `vercel.json`

### February 11, 2026

**Add citation columns to admin brands table + batch citation responses** (78851e2)
- Added Cit. Memos, Comp. URLs, and Covered columns to /admin brands table
- Updated `get_admin_brand_performance` RPC with citation_memos, unique_cited_urls, covered_urls
- Batch-triggered 13 citation response memos for uncovered competitor URLs (Context Memo brand)
- Added 18 citation-mining queries designed to surface more competitor URLs
- Context Memo brand: 11 → 24 citation response memos, 61 → 79 active queries

**Landing page: remove redundant sections, tighten page** (c6173f6)
- Removed Platform Features 8-cell grid (redundant with Three Pillars)
- Removed Revenue Alignment Marketing/Sales/Product section (reframes existing info without adding value)
- Cleaned up unused LineChart import
- Page reduced by 151 lines — tighter narrative flow

**Landing page: full restructure — Problem → Solution → Pillars → Attribution → How It Works** (189e3cd)
- Reordered all sections per new information architecture
- Moved dashboard mockup from hero into dedicated Solution section with "CONTEXT MEMO GIVES YOU THE FULL PICTURE" heading
- Three Pillars and Revenue Attribution now appear before How It Works
- Revenue Alignment moved above Partnership
- Renamed Memo section to "ENSURE AI GETS THE MEMO" with blog vs memo explanation
- Adapted dark/light color alternation for new section order
- Removed duplicate Revenue Alignment section

**Files changed:**
- `app/page.tsx` — 293 insertions, 269 deletions

**Landing page: Memo concept intro + features grid + monitors expansion** (f5a59d8)
- Replaced "The Problem" section with "Not a Blog Post. A Memo." section introducing the Memo concept (structured for AI, verified & sourced, generated from gaps)
- Added 8-cell Platform Features grid: Multi-Model Scanning, Visibility Scoring, Competitor Intelligence, Memo Generation, Citation Verification, Revenue Attribution, Daily Automation, HubSpot Integration
- Changed hero subtitle from "4 AI models" to "multiple AI models"
- Added +MORE badge to monitors row (ChatGPT, Claude, Perplexity, Grok, +MORE)
- Updated dashboard mockup model count label to match
- Removed "What's the best project management tool..." copy

**Files changed:**
- `app/page.tsx` — 100 insertions, 23 deletions

**Homepage: dashboard mockup + copy corrections** (14fd302)
- Added code-based dashboard mockup to hero section — shows a realistic product preview with visibility score (72), citation rate (64%), memos published (18), AI revenue ($47K), and a scan results table with per-model citation badges (GPT/CLAUDE/PPLX/GROK)
- Removed all Google AI Overviews references from homepage
- Changed "daily scans" to "recurring scans" for scan frequency claims
- Kept "daily" for digest email and competitor RSS monitoring (those are genuinely daily)

**Homepage redesign: full closed-loop value proposition** (bbff400)
- Complete rewrite of `app/page.tsx` (451 insertions, 262 deletions)
- Reframed hero from "GET CITED IN AI SEARCH" to "MONITOR, WIN, AND PROVE ROI IN AI SEARCH"
- Expanded How It Works from 4 steps to 5-step closed loop: Scan → Discover → Generate → Verify → Attribute
- Added Revenue Attribution section with full pipeline flow (AI traffic → HubSpot contact → pipeline → closed-won revenue)
- Added Integrations section (HubSpot, Google Search Console, Bing Webmaster, IndexNow)
- Reorganized features from 6 equal cards into 3 pillars: Visibility Intelligence, Competitive Engine, Content That Gets Cited
- Added RevOps as 4th use case alongside Demand Gen, Product Marketing, Content
- Corrected model count from "6 AI models" to actual 4 (ChatGPT, Claude, Perplexity, Grok) + Google AI Overviews
- Removed unbuilt claims from Enterprise tier (SSO/SAML, API access) — replaced with Custom onboarding, Priority feature requests
- Added HubSpot integration and Revenue attribution to Growth tier
- Added closed-loop verification language to Trust section
- Updated tagline to "The full closed loop for AI visibility"

**Fix: gap_fill and product_deploy memo quality overhaul** (092cae1)
- Root cause analysis identified 3 structural problems causing poor/generic/redundant memos:
  1. Gap fill memos received only domain names as context (e.g., "competitor.com — cited 3x") while the citation-respond system fetches 50k chars of actual page content. Fixed: gap_fill now fetches top cited URL via Jina Reader for real competitive context.
  2. Product deploy memos shared the same GAP_FILL_MEMO_PROMPT — completely wrong framing for feature announcements. Fixed: created dedicated PRODUCT_DEPLOY_MEMO_PROMPT focused on what shipped, why it matters, and how it works.
  3. Deploy commit context was lost between deploy-analyze.ts and memo-generate.ts. Fixed: commit summaries now pass through so the AI has real feature details.
- Updated `regenerate_memos` action to handle both gap_fill and product_deploy memos with the improved flow
- Retroactively regenerated 40 impacted memos (16 gap_fill across 6 brands + 24 product_deploy for Context Memo) via Inngest events
- Cleaned up 2 slug-collision duplicates from regeneration
- 4 files changed: `lib/ai/prompts/memo-generation.ts`, `lib/inngest/functions/memo-generate.ts`, `lib/inngest/functions/deploy-analyze.ts`, `app/api/brands/[brandId]/actions/route.ts`

**Uptime monitoring: health endpoint + Inngest alert system**
- Created `/api/health` endpoint — checks Supabase (DB query) + Redis (ping) connectivity, returns structured JSON with status/latency per service
- Returns 200 when healthy, 503 when degraded/down — compatible with external uptime monitors
- Created Inngest `uptime-check` function — runs every 5 minutes, pings health endpoint, emails all ADMIN_EMAILS via Resend on failure
- Sends recovery notification when services come back online
- Alert rate-limiting: 1 email per service per hour to prevent inbox flooding
- **Limitation**: Cannot detect Vercel-level outages (runs on Vercel). Recommend BetterStack or UptimeRobot free tier for external monitoring.
- 3 files changed: `app/api/health/route.ts` (new), `lib/inngest/functions/uptime-check.ts` (new), `app/api/inngest/route.ts` (updated)

**AI search optimization: dynamic llms.txt, JSON-LD, semantic HTML** (a0cc789)
- Replaced static `public/llms.txt` with dynamic `app/llms.txt/route.ts` — queries brands + published memos from database, always current
- Created `app/llms-full.txt/route.ts` — full memo content inline for AI crawlers to ingest without following links
- Added Organization + WebSite JSON-LD structured data to landing page
- Added FAQPage JSON-LD to pricing page (5 FAQ items)
- Added `<main>` semantic wrapper to landing page and memos index
- Updated `robots.ts` to allow AI crawlers on `/llms-full.txt`
- 9 files changed, 307 insertions, 89 deletions

**Fix infinite redirect loop — site down** (26c2dfd)
- Root cause: Vercel domain config redirects `contextmemo.com` → `www.contextmemo.com` (307), but proxy middleware was redirecting `www` → non-www (301), creating an infinite loop
- Removed the www→non-www redirect from proxy middleware (let Vercel handle domain routing)
- Added `www` to subdomain exclusion list to prevent it being treated as a memo page
- Site restored: canonical domain is now `www.contextmemo.com` (set by Vercel)
- 1 file changed: `lib/supabase/middleware.ts`

**Fix Google Search Console indexing issues** (6542c63)
- Added 301 redirect: `www.contextmemo.com` → `contextmemo.com` (fixes 12 "duplicate without user-selected canonical" pages)
- Added 301 redirects for deleted pages: `/hubspot` → `/request-access`, `/signup` → `/request-access` (fixes 6 404s)
- Removed `/login` from sitemap (has noindex, wastes crawl budget)
- Added `/memos` index and content category pages (`/memos/compare`, `/memos/guides`, `/memos/how-to`, `/tools`, `/resources`) to sitemap
- 3 files changed: `lib/supabase/middleware.ts`, `next.config.ts`, `app/sitemap.ts`

**Send email notifications on new access requests** (d506431)
- Admin notification to stephen@krezzo.com with requester details (name, email, company, message)
- Confirmation email to requester: "We got your request" with next steps and link to explore memos
- Both emails sent via Resend in parallel, non-blocking
- Clean HTML email templates matching Context Memo branding

**Add SEO metadata across all public pages** (ec8a010)
- Root layout: Open Graph, Twitter Cards, canonical URL, `metadataBase`, title template (`%s | Context Memo`), stronger default title/description
- Added metadata layouts for `/pricing`, `/pricing/calculator`, `/request-access` (all client components)
- Auth pages (`/login`, `/signup`, `/verify-email`): titles + noindex/nofollow
- Enhanced existing metadata on `/changelog`, `/memos`, `/about/editorial` with OG tags and canonical URLs
- 10 files changed, 6 new layout files

**Premium polish: icons, white-glove section, footer, retire hubspot page** (7da453b)
- Replaced emoji icons (📊🎯✍️) in Use Cases section with proper Lucide icon boxes matching the feature grid style
- Added "White-Glove Onboarding" section: Dedicated Setup, Strategy Review, Ongoing Support — reinforces premium positioning
- Upgraded footer from 3-link bar to structured 4-column layout: Brand, Product, Resources, Account
- Deleted /hubspot marketing landing page (HubSpot integration API routes preserved)

**Premium positioning: invite-only access, no free signup** (4696d9d)
- Repositioned product as invite-only premium platform — no self-service signups
- Added invite code gate to signup form (validates against predefined codes: AMAZING2026, BRAVO2026, CUSTOMERS2026, DEALS2026, FUNNEL2026)
- Created `/request-access` page with lead capture form for early access requests
- Created `access_requests` table in Supabase for tracking inbound requests
- Added `/api/auth/validate-invite` route for invite code validation
- Added `/api/access-request` route for form submissions
- Redesigned pricing page: $499/$999/Custom tiers with "up to 90% off" early access messaging
- Three CTA options on pricing: Request Early Access, Request a Demo, Request a Discount
- Replaced all "START FREE" / "FREE TRIAL" CTAs site-wide with "REQUEST ACCESS" / "REQUEST EARLY ACCESS"
- Updated landing page pricing section from "FREE FOR LIFE" tranches to premium tier cards
- Replaced sticky pricing bar with invite-only + discount messaging
- Updated login page, changelog, calculator, all public memo pages, memo render header CTAs
- Updated sitemap: replaced /signup with /request-access
- 19 files changed across the codebase

**Admin: add Tenants table with last login, last activity, spend tracking** (ac98693)
- Created `get_admin_tenant_stats` RPC joining tenants with `auth.users` for real `last_sign_in_at` data
- New `SortableTenantsTable` component with sortable columns: tenant name/email, plan, brands, all-time spend, 7d spend, last login, last activity, signed up date
- Activity timestamps shown as relative time (e.g. "2h ago") with color coding: green (<24h active), neutral (1-7d), amber (>7d inactive)
- Hover over any time value to see exact date/time
- "Last Activity" computed as the most recent of: last login, last scan, last memo created, or last API usage
- Files changed: `app/admin/page.tsx`, `components/admin/sortable-tenants-table.tsx` (new)

### February 10, 2026

**Fix brand self-promotion + diversify images** (5fa1f0c)
- Updated `CITATION_RESPONSE_PROMPT` so the brand is featured prominently (near top of listicles) rather than buried as an afterthought — content published on the brand's platform should advocate for itself confidently
- Voice perspective changed from "neutral analyst" to "informed expert publishing on the brand's platform"
- Removed NASA/space imagery from fallback pool, flattened to one 30-image pool of business-appropriate photos
- Added FNV-1a hash + Fisher-Yates shuffle seeded by `sourceUrl + topic` so each article gets unique images
- Files changed: `lib/ai/prompts/memo-generation.ts`, `lib/utils/image-sourcer.ts`, `lib/inngest/functions/citation-respond.ts`

**Overhaul citations Covered/Gap logic** (86e05bb)
- Replaced fuzzy query-based and keyword-based "Covered" matching with exact `provenance.source_url` lookup — "Covered" now means a `citation_response` memo exists for that specific URL
- "Generate Memo" button now shows on ALL non-brand citations (removed top-10 limit)
- Added "Regenerate" button for already-covered URLs so content can be refreshed
- Removed unused `memosByQueryId` and `urlToRelatedMemos` fuzzy matching code
- Each generated memo uses the `citation_response` flow: fetches the cited content, creates a strategic variation with brand positioning, Unsplash imagery, and voice insights
- Files changed: `components/dashboard/citation-insights.tsx`

**Images in citation response memos** (5f4d8b5)
- New `lib/utils/image-sourcer.ts`: Unsplash API search (when `UNSPLASH_ACCESS_KEY` env var is set) with curated fallback pool categorized by topic (technology, business, analytics, AI, marketing, workspace)
- Extracts image alt-text concepts from source content to find topically relevant images
- Citation respond function now sources 4 images and passes them to the prompt with placement instructions
- Prompt tells AI to include 2-3 images between major sections using exact markdown syntax
- Added responsive image CSS to both standard and branded memo themes: full-width, rounded corners, shadow, border, centered
- To enable Unsplash API: add `UNSPLASH_ACCESS_KEY=your_key` to `.env.local` (free tier: 50 req/hr). Without it, curated pool images are used.
- Files changed: `lib/utils/image-sourcer.ts` (new), `lib/inngest/functions/citation-respond.ts`, `lib/ai/prompts/memo-generation.ts`, `lib/memo/render.tsx`

**Citation Response System — strategic variations of cited content** (9121a93)
- New `CITATION_RESPONSE_PROMPT` in `memo-generation.ts`: instead of generating generic content, it studies the actual cited page (structure, claims, data), then creates a variation that covers the same ground with the brand's positioning, tone, and expert insights
- New Inngest function `citation-respond.ts`: fetches cited URL via Jina reader, auto-detects which queries cite it from scan data, loads brand context/voice insights, generates content via GPT-4o, saves as `memo_type: 'citation_response'` with full provenance
- New API action `respond_to_citation`: accepts a URL and triggers the citation response pipeline
- Wired into scan-run auto-generation: when gaps are found with cited URLs, triggers `citation/respond` instead of generic `memo/generate` — content is now informed by what's actually winning
- Updated Citations page "Generate Memo" button: now calls `respond_to_citation` with the cited URL instead of generic `gap_fill`, updated progress messages to reflect the new flow
- Registered event type `citation/respond` in Inngest client, function in Inngest route
- Files changed: `lib/ai/prompts/memo-generation.ts`, `lib/inngest/functions/citation-respond.ts` (new), `lib/inngest/client.ts`, `app/api/inngest/route.ts`, `app/api/brands/[brandId]/actions/route.ts`, `lib/inngest/functions/scan-run.ts`, `components/dashboard/citation-insights.tsx`

**Merge chris branch — User deletion + Crawler Guide** (d4b4b21)
- Merged `chris` branch into `main`: brought in user deletion endpoint update and crawler detection user guide documentation
- Files changed: `app/api/privacy/delete/route.ts`, `docs/CRAWLER_DETECTION_USER_GUIDE.md`, `test/unit/privacy-delete.test.ts`

**Citations: Terminal-style memo generation modal** (c12e123)
- Replaced dead "Generate Memo" link (which just navigated to memos page) with inline button that triggers real memo generation
- Terminal-style modal popup shows: cited URL context (domain, citation count, triggering prompts), animated progress steps with blinking cursor, and completion state
- On success: shows memo title, **Edit Memo** button (links to memo editor), **View Memo** button (opens public page in new tab)
- Polls `memo-count` API every 3s until new memo is detected (2-minute timeout with fallback message)
- Updated `memo-count` API endpoint to optionally return latest memo details via `?include_latest=true` query param
- Uses ref-based completion tracking to prevent stale closure bugs in setTimeout/setInterval callbacks
- Files changed: `components/dashboard/citation-insights.tsx`, `app/api/brands/[brandId]/memo-count/route.ts`

**Citations Tab Overhaul — My Content, domain rank, content matching** (6fe7a2e)
- Citation count now displays in tab label (e.g. `CITATIONS (47)`) matching how PROMPTS and MEMOS show counts
- New **My Content** toggle (alongside URLs and Domains): shows which of your memos/URLs are being cited by AI models, how many times, and across which prompts. Also lists published memos that haven't been cited yet.
- **Brand domain rank callout** at top of Domains view: prominent display showing where your domain ranks among all cited domains (e.g. "#11 of 45 domains") with contextual guidance
- **Content match indicators** on URLs view: each cited URL shows "Covered" (green) badge if you have a related memo, or "Gap" (amber) badge for top-10 unmatched citations. Expanding a covered URL shows links to your related memos.
- **Generate Memo CTA** for top-10 cited URLs with no matching content — amber alert with one-click generate button pre-populated with the cited URL context
- Content matching uses two strategies: query-based matching (via `source_query_id`) and keyword fallback (URL path words matched against memo titles/slugs)
- Files changed: `app/(dashboard)/brands/[brandId]/citations/page.tsx`, `app/(dashboard)/brands/[brandId]/layout.tsx`, `components/dashboard/citation-insights.tsx`

**Memo Generation v3 — UX polish and prompt fixes** (1531995)
- Fixed hover underline bug: `hover:[&_a]:underline` was underlining ALL links when hovering the content container; changed to `[&_a:hover]:underline` so only the individual hovered link underlines (both standard and branded themes)
- Removed memo type label (e.g. "— gap fill") from Related Reading section in backlinks
- Conditional section heading: uses "The Short Answer" when memo title is a question, "Overview" when it's a statement
- Stopped self-sourcing: removed brand's own domain from Sources templates across all 5 prompt types + added post-generation filter to strip any self-referencing source lines
- Fixed non-clickable backlinks: relative paths like `(/slug)` replaced with proper route-prefixed paths via `getMemoUrl()` (e.g. `/tools/slug-name`)
- Added CTA from brand offers: new `formatOffersForPrompt()` injects a "Next Step" section before Sources using the brand's primary offer (demo, trial, etc.) — only appears if offers are configured

### February 9, 2026

**Corporate Positioning Enrichment — second-pass AI fills gaps** (eb22e94)
- Added `POSITIONING_ENRICHMENT_PROMPT` — a focused prompt that synthesizes strategic positioning fields (messaging pillars, elevator pitches, objection handling, competitive stance) from extracted company data
- New step 2b `enrich-positioning` in `context-extract.ts` runs automatically after initial extraction: checks all 16 positioning sub-fields for gaps, fills via single GPT-4o call (~$0.03)
- Skips enrichment if 3 or fewer fields missing (not worth the cost)
- Merges enriched fields back into existing data, appends differentiators rather than replacing
- "Fill Gaps with AI" button on Corporate Positioning card appears when completion <100%
- New `enrich_positioning` API action for existing brands — fills gaps without re-crawling the website
- Root cause: extraction prompt had contradictory instructions (leave empty vs. infer), causing GPT-4o to leave strategic/synthesis fields empty. These fields (pillars, pitches, objections) are never explicit on websites.
- Expected impact: positioning completion should jump from ~22% to 90%+ for brands like AlphaSense
- Files changed: `lib/ai/prompts/context-extraction.ts`, `lib/inngest/functions/context-extract.ts`, `components/dashboard/corporate-positioning.tsx`, `app/api/brands/[brandId]/actions/route.ts`

**Generate Memo now responds to top-cited competitor content** (74972f5)
- Rewrote `suggest_next_memo` to query `scan_results.citations`, aggregate by URL (excluding brand's own domain and social sites), and suggest a `gap_fill` memo responding to the most-cited competitor content
- Added `gap_fill` to `allowedMemoTypes` in the `generate_memo` API handler (was missing -- previous gap_fill attempts would silently fail with "Invalid memoType")
- Added `case 'gap_fill'` to the memo generation switch in `memo-generate.ts`, using `GAP_FILL_MEMO_PROMPT` with cited URLs and query context
- Updated `GenerateMemoDropdown` to pass `citedUrls` array and show citation context (domain + count) in the suggestion card
- Flow: user clicks "Generate Memo" → sees top-cited URL, domain, citation count → clicks "Generate" → creates a response article addressing that buyer question
- Files changed: `app/api/brands/[brandId]/actions/route.ts`, `lib/inngest/functions/memo-generate.ts`, `components/dashboard/brand-actions.tsx`

**Memo quality: Third-person authoritative voice, persona targeting, remove self-promotional UI** (88d9ad7)
- Rewrote all 5 memo prompts (comparison, industry, how_to, alternative, gap_fill) to use third-person authoritative voice instead of first-person "we/our"
- Added persona-targeting instructions — AI now identifies the buyer persona from brand context and writes for their concerns and vocabulary
- Added educate-first structure — content leads with the problem/context before vendor specifics
- Renamed prompt sections: "How We Compare" → "How Tools Compare", "Why It Matters" → "What to Consider When Choosing"
- Removed "Auto-generated from verified brand information" footer from all prompt templates
- Removed redundant meta description line from memo hero section (was repeating the title)
- Removed "About This Article" transparency/provenance block from public memo pages
- Removed "Source Attribution" card with self-referential platform text from public memo pages
- Added MEMO_TYPE_LABELS map so breadcrumb displays "Guides" instead of "gap fill"
- Added new section names (The Short Answer, Understanding the Problem, How Tools Compare, What to Consider) to markdown header pattern detection
- Files changed: `lib/ai/prompts/memo-generation.ts`, `lib/memo/render.tsx`, `app/memo/[subdomain]/[[...slug]]/page.tsx`

**UX: Post-onboarding lands on Memos tab, entities page cleanup, suggest next memo**
- After onboarding memo generation, "GO TO DASHBOARD" now redirects to `/brands/{brandId}/memos` instead of `/brands/{brandId}` (profile) — user immediately sees the memo they just generated
- Entities page: removed redundant CompetitiveIntelligence and CompetitorContentFeed sections (duplicate of data already in entity list); unified citation + mention query tracking into single count
- Added `suggest_next_memo` API action — recommends best next memo based on topic universe gaps or high-score uncited queries
- Cleaned up competitive-intelligence.tsx: removed Share of Voice and Competitive Threats cards (data moved to entity list), kept Prompt Battles
- Files changed: `components/dashboard/onboarding-flow.tsx`, `app/(dashboard)/brands/[brandId]/entities/page.tsx`, `app/api/brands/[brandId]/actions/route.ts`, `components/dashboard/brand-actions.tsx`, `components/dashboard/brand-tabs.tsx`, `components/dashboard/competitive-intelligence.tsx`

**Fix: React key prop warning in PersonaManager** (e7ba53a)
- Fixed console warning "Each child in a list should have a unique key prop" in `PersonaManager` component
- Moved `key` attribute to same line as opening `<div>` tag to resolve Turbopack transpiler key detection issue
- Files changed: `components/dashboard/persona-manager.tsx`

**Logging: Fix silent catch blocks, remove deprecated Sentry config** (a28b3f8)
- Added error logging to 10 previously silent catch blocks that were swallowing failures across the codebase
- Critical fixes: scan-run credit increment, activity/track data inserts, billing/security event logging, Redis connection checks
- Secondary fixes: admin dashboard queries, settings profile load, onboarding status polling
- Removed deprecated `disableLogger` option from Sentry config (build warning cleanup)
- Note: Sentry SDK and config files were already in place from prior session — DSN still needs to be populated in .env.local and Vercel env vars to activate error tracking
- Files changed: `lib/inngest/functions/scan-run.ts`, `app/api/activity/route.ts`, `app/api/track/route.ts`, `lib/stripe/billing-events.ts`, `lib/security/security-events.ts`, `lib/redis/client.ts`, `app/admin/page.tsx`, `app/(dashboard)/brands/[brandId]/settings/page.tsx`, `components/dashboard/onboarding-flow.tsx`, `next.config.ts`

**Fix: localeCompare crash on undefined persona fields** (e2a7b6b)
- Fixed client-side crash when clicking on brands (e.g., Benchprep) whose personas have missing `function` or `seniority` fields
- Root cause: `PersonaManager` sort called `.localeCompare()` on `persona.function` without null-checking — `undefined.localeCompare()` throws TypeError
- Added fallback empty strings to `localeCompare` calls in `persona-manager.tsx` and `settings/page.tsx`
- Also hardened `coverage-audit.tsx` category sort with the same pattern
- Files changed: `components/dashboard/persona-manager.tsx`, `app/(dashboard)/brands/[brandId]/settings/page.tsx`, `components/dashboard/coverage-audit.tsx`

### February 8, 2026 (v11)

**Memo Quality Overhaul: GPT-4o, first-person voice, comprehensive format, regeneration** (45968b3)
- Upgraded memo generation model from `gpt-4o-mini` → `gpt-4o` for significantly better writing quality
- Rewrote `GAP_FILL_MEMO_PROMPT`: AI now writes as "head of content" in first-person ("we built", "our approach") instead of third-person marketing copy
- Comprehensive format: 800-1200 words with 3-4 paragraph "Our Approach", competitor-by-competitor "How We Compare", detailed "Why It Matters"
- Banned 12+ marketing buzzwords ("seamless integration", "robust platform", "empowers organizations", etc.)
- Cited content now includes entity names + types (e.g. "Docebo — competitor, cited 10x")
- Onboarding generates 1 high-quality sample memo (highest-cited gap) instead of 5 generic ones
- Added "Regenerate All" button in Memos tab to re-run existing memos through improved prompt
- Trimmed terminal onboarding: ~50% fewer lines, 2 progress messages per step instead of 5-6
- Memo titles no longer truncate at 80 chars — full query text preserved
- Files changed: `lib/ai/prompts/memo-generation.ts`, `app/api/brands/[brandId]/actions/route.ts`, `components/dashboard/onboarding-flow.tsx`, `components/dashboard/memo-feed.tsx`, `components/dashboard/citation-insights.tsx`

### February 8, 2026 (v10)

**Onboarding: Perplexity citations, AI entity classification, fixed memo gen** (cd82cc4)
- Switched onboarding model from Grok to **Perplexity Sonar** — cleaner, more authoritative citations vs blog/Twitter noise.
- Entity auto-discovery now uses **GPT-4o-mini to classify entities** by type (competitor, publisher, analyst, marketplace, association) instead of treating all cited domains as generic competitors.
- Heuristic pre-classification via domain patterns (blog, news, .org) before AI call.
- Only `product_competitor` entities are auto-activated; publishers/analysts/etc start inactive.
- **Fixed memo generation**: gap queries now ranked by citation count (most reference material = best memos), uses discovered competitors for comparison/alternative memos, passes `topicTitle` for context.
- `check_status` API now returns `entityGroups` (entities by type) and `topCitedUrls` (most-cited content AI trusts).
- Onboarding step 4 (Entities) shows classified groups and most-cited URLs.
- Files changed: `lib/inngest/functions/scan-run.ts`, `app/api/brands/[brandId]/actions/route.ts`, `components/dashboard/onboarding-flow.tsx`, `components/dashboard/automations-grid.tsx`

### February 8, 2026 (v9)

**Onboarding: 6-step narrative reveal** (c47a739)
- Replaced 3-phase post-scan flow (scan results → memos → monitoring → tutorial) with a coherent 6-step progressive reveal:
  1. **Your Brand** — extracted context (products, personas, markets)
  2. **Your Prompts** — query count by funnel, sample prompts
  3. **Citations** — mention/citation rates, total citations, domains, visibility assessment
  4. **Entities** — top cited domains, competitors discovered
  5. **Content Gaps** — queries where AI doesn't mention you, top gap queries
  6. **Generate Memos** — explicit CTA to fill gaps with citable content
- Each step advances on user click (NEXT button), building a story from brand → gaps → action.
- Enhanced `check_status` API: now returns `brandDetails`, `promptSamples` (by funnel), `entities`, and `gapQueries`.
- Removed tutorial cards phase — the 6-step reveal IS the tutorial.
- Step indicator bar shows 6 dots with progress.
- Files changed: `components/dashboard/onboarding-flow.tsx`, `app/api/brands/[brandId]/actions/route.ts`

### February 8, 2026 (v8)

**Redesign: Guided terminal onboarding with scan results, memos, tutorial** (b0e20d6)
- Onboarding no longer redirects to dashboard after initial scan — now shows results in terminal.
- **Phase 1:** Extract + Queries + Scan with real-time progress (same as before).
- **Phase 2:** Scan results displayed in terminal (mention rate, citation rate, top cited domains, competitors discovered). Then "STEP 2: GENERATE MEMOS" button shows memo generation progress.
- **Phase 3:** "STEP 3: ACTIVATE MONITORING" confirms daily automation is active with checkmarks.
- **Phase 4:** Quick tutorial cards walking user through Prompts, Citations, Memos, Entities, Automations.
- **Terminal Widget:** Persistent floating button on brand pages. Expands to show brand status summary (prompts tracked, scans, memos, mention/citation rates).
- **Enhanced check_status API:** Now returns scan summary (mention rate, citation rate, top domains, gap estimate), memo count, competitor count/names.
- **Files changed:** `components/dashboard/onboarding-flow.tsx` (complete rewrite), `app/(dashboard)/brands/[brandId]/layout.tsx` (added TerminalWidget), `app/api/brands/[brandId]/actions/route.ts` (enhanced check_status)

### February 8, 2026 (v7)

**Optimization: Onboarding scan uses single model (Grok) for speed + cost** (f7c8b05)
- Onboarding scan now uses only Grok-4-fast instead of all 4 models (~75% cost reduction on first scan).
- Grok had best citation data across all metrics: 12.8 avg citations/scan, 45% mention rate, 31.5% citation rate.
- Added `onboarding` flag to each model config in `scan-run.ts` — flip to `true`/`false` to control which models run during onboarding.
- Daily scans still use all enabled models for cross-model comparison.
- Added read-only **Onboarding Scan** section to Automations page showing active onboarding model config with "Code-level config" badge.
- **Files changed:** `lib/inngest/functions/scan-run.ts`, `lib/inngest/functions/query-generate.ts`, `lib/inngest/client.ts`, `components/dashboard/automations-grid.tsx`

### February 8, 2026 (v6)

**Feature: Google Analytics (GA4) with per-brand custom dimensions** (5769006)
- Added GA4 tag (`G-4WM1HF6WMS`) to root layout using Next.js `<Script>` with `afterInteractive` strategy.
- Custom `memo_view` event fires on every memo page with `brand_name`, `brand_subdomain`, `memo_type`, `memo_title`, and `content_source` dimensions — allows filtering/segmenting GA4 reports by brand.
- `GtagBrandPageView` component added to: subdomain memo pages (`app/memo/`), standard memo pages (`render.tsx MemoPageContent`), and branded memo pages (`render.tsx BrandedMemoPageContent`).
- **To complete:** Create matching custom dimensions in GA4 Admin → Property → Custom definitions: `brand_name`, `brand_subdomain`, `memo_type`, `content_source` (all event-scoped).
- **Files created:** `components/tracking/google-analytics.tsx`
- **Files changed:** `app/layout.tsx`, `app/memo/[subdomain]/[[...slug]]/page.tsx`, `lib/memo/render.tsx`

### February 8, 2026 (v5)

**Feature: Content Performance Tab + AI Traffic Tracking Fix** (5eb73e1)
- New **PERFORMANCE** tab on brand dashboard showing content output stats (published, drafts, HubSpot synced, contextmemo-only), traffic by source (AI vs organic), per-memo view counts table, and recent traffic event log.
- **Fixed self-referral pollution:** `detectAISource()` now filters contextmemo.com→contextmemo.com navigation as internal (was being classified as "organic," inflating numbers with 13 false rows). Cleaned up the bad data.
- **Updated AI bot detection:** Added DeepSeek, Groq, and newer user-agent patterns: GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Anthropic-AI, Cohere-AI. Added x.com to organic referrer list.
- New `/api/brands/[brandId]/performance` endpoint aggregating content output + traffic data.
- Distribution card shows visual bar of content split between contextmemo.com, HubSpot, and drafts.
- Tracking note at bottom explains what's tracked where (contextmemo.com pages via AITrafficTracker, HubSpot via HubSpot analytics).
- **Files created:** `app/(dashboard)/brands/[brandId]/performance/page.tsx`, `app/(dashboard)/brands/[brandId]/performance/loading.tsx`, `app/api/brands/[brandId]/performance/route.ts`, `components/dashboard/content-performance.tsx`
- **Files changed:** `lib/supabase/types.ts` (detectAISource fix), `app/(dashboard)/brands/[brandId]/layout.tsx` (added tab)

### February 8, 2026 (v4)

**Feature: Brand Personality extraction + voice trait sliders on profile** (e21288a)
- New `BrandPersonality` type with voice traits (1-5 scale), Jungian archetype, worldview, audience stance, emotional register, and personality summary.
- Updated context extraction prompt with detailed instructions for evidence-based personality diagnosis — worldview, archetype, voice characteristics, audience relationship.
- Replaced "Key Themes" card on profile page with Brand Personality card featuring visual dot-scale indicators, worldview panel, archetype display, and emotional register badges.
- **Files changed:** `lib/supabase/types.ts`, `lib/ai/prompts/context-extraction.ts`, `components/dashboard/profile-section.tsx`

### February 8, 2026 (v3)

**Restructure: Prompt generation — 30 clean funnel-based prompts** (e579063)
- Replaced 4 overlapping prompt generation steps (category queries, intent extraction, intent queries, persona queries) with a single structured funnel-based approach.
- Now generates exactly 30 prompts: 10 TOF (educational/situational), 10 MOF (exploring solutions), 10 BOF (requirements/products).
- Single AI call instead of 4+ separate calls. Lower cost, cleaner output.
- Removed 360+ lines of dead prompt templates.
- **Files changed:** `lib/ai/prompts/context-extraction.ts`, `lib/inngest/functions/query-generate.ts`

### February 8, 2026 (v2)

**Redesign: Onboarding pipeline — remove competitor step, fix context detection, fix CSP** (d00a05b)
- **Onboarding pipeline redesign:** Removed competitor discovery from the onboarding chain. Context extract now chains directly to query generation. Competitors/entities are discovered later from scan results (cited entities), not guessed upfront.
- **New onboarding flow:** Brand Scan → Reverse-Engineer Prompts → AI Scan (3 steps, was 4).
- **Fixed "0 products, 0 personas" bug:** `hasContext` check was looking for any keys in brand context, but brand creation sets `search_console` config immediately — making `hasContext` true before extraction actually ran. Now checks for `company_name`, `description`, or `products` (actual extraction output).
- **CSP fix:** Added `font-src 'self' https://fonts.gstatic.com data:` and `https://fonts.googleapis.com` to `style-src`. Fixes blocked fonts/stylesheets on mockup and memo pages.
- **Query generation:** Now works gracefully without competitors (skips comparison queries when no competitors exist yet).
- **Files changed:** `next.config.ts`, `components/dashboard/onboarding-flow.tsx`, `app/(dashboard)/brands/[brandId]/layout.tsx`, `app/api/brands/[brandId]/actions/route.ts`, `lib/inngest/functions/context-extract.ts`, `lib/inngest/functions/query-generate.ts`

### February 8, 2026

**Fix: Brand creation broken — RLS policy + form validation UX** (81ea13a)
- **Root cause:** `brand_settings` table had RLS enabled but zero policies were ever applied to the live Supabase database. The migration SQL existed in `scripts/sql/` but was never run against production.
- **Compounding factor:** In Supabase v17, the `postgres` role is NOT a superuser, so the `SECURITY DEFINER` trigger function couldn't bypass RLS as intended.
- **Database fix:** Applied migration adding 5 RLS policies to `brand_settings`: postgres role full access (for triggers), service_role full access, and authenticated user SELECT/UPDATE/INSERT scoped to owned brands.
- **Form UX fix:** Removed aggressive inline domain regex validation that flashed red error alerts while user was still typing. Validation now runs on "Continue" button click instead.
- **Console cleanup:** Changed subdomain availability check from `.single()` to `.maybeSingle()` to eliminate 406 (Not Acceptable) console errors when no match exists.
- **Files changed:** `app/(dashboard)/brands/new/page.tsx`
- **Migration applied:** `add_brand_settings_rls_policies` on Supabase project `ncrclfpiremxmqpvmavx`

### February 7, 2026 (v5)

**Cleanup: Remove SCANS vanity metric from brand dashboard**
- Removed the "SCANS / 100 / last 90 days" hero card from the brand dashboard top row.
- Raw scan count is not actionable — already visible in the Prompts tab subtitle.
- Dashboard hero now shows 3 cards (was 4): Citation Score, Memos, Prompts. Grid changed from `md:grid-cols-4` to `md:grid-cols-3`.
- **Files changed:** `app/(dashboard)/brands/[brandId]/page.tsx`

### February 7, 2026 (v4)

**Feature: Prompt Score + Enhanced Prompt Analysis View**
- **Prompt Score (0-100):** New scoring system measuring how valuable each prompt is for potential buyers. Three components: Citation Richness (0-30), Buyer Intent (0-40, keyword detection for BOFU/MOFU patterns), Competitive Density (0-30). Score stored in DB and auto-updated on each scan.
- **Database:** Added `prompt_score` column to `queries` table with index. Backfilled all 1,000 existing prompts (194 high, 282 medium, 396 low, 128 minimal).
- **Cited entities per prompt:** New Globe row showing top domains AI models cite when answering each prompt (e.g., g2.com, capterra.com).
- **Relative scan timestamps:** Changed "Scanned Feb 7" to "Scanned 2 hours ago" with exact time tooltip.
- **Memo indicator:** Blue badge showing linked memo count per prompt via `source_query_id`.
- **Sort options expanded:** Default, Prompt Score, Mention Rate, Citation Count, Recently Scanned.
- **V2 Prompts page:** Prompt Score badge + sort by score/streak.
- **Backend:** scan-run.ts now calculates and stores prompt_score after every scan.
- **Files created:** `lib/utils/prompt-score.ts`, `app/api/backfill-prompt-score/route.ts`
- **Files changed:** `lib/supabase/types.ts`, `lib/inngest/functions/scan-run.ts`, `components/dashboard/scan-results-view.tsx`, `app/(dashboard)/brands/[brandId]/page.tsx`, `app/v2/brands/[brandId]/prompts/prompts-list-client.tsx`

### February 7, 2026 (v3)

**Feature: 100% Usage Tracking — All AI Calls Now Log to usage_events**
- **Problem:** Only 3 of 15 Inngest functions with AI calls (scan-run, prompt-enrich, discovery-scan) were logging costs to `usage_events`. The other 12 functions were invisible to budget guardrails, meaning monthly caps and spend alerts were undercounting by ~60%.
- **Solution:** Created `lib/utils/usage-logger.ts` with `logSingleUsage`/`logUsageEvents`/`normalizeModelId` helpers. Added per-call usage logging to all 12 untracked functions across both OpenRouter and direct OpenAI SDK calls. Added `gpt-4o` pricing to `lib/config/costs.ts` (was previously approximated as gpt-4o-mini).
- **Files changed:** `lib/utils/usage-logger.ts` (new), `lib/config/costs.ts`, plus 12 Inngest functions: `citation-loop.ts`, `citation-verify.ts`, `competitor-content.ts`, `gap-to-content.ts`, `topic-universe.ts`, `prompt-intelligence.ts`, `query-generate.ts`, `context-extract.ts`, `memo-generate.ts`, `competitor-discover.ts`, `competitor-enrich.ts`, `prompt-lab.ts`
- **Impact:** Budget guardrails (monthly caps, alerts, auto-pause) now enforce against 100% of actual AI spend per brand. Automations page spend display is now accurate.

### February 7, 2026

**Feature: Per-Brand Automation Controls — Toggle Jobs On/Off + Set Schedules**
- **Problem:** OpenRouter spend was not controllable per brand. All brands got the same jobs at the same frequency, and 6/9 inngest functions calling OpenRouter didn't log costs to `usage_events` (blind spots: citation-verify, citation-loop, gap-to-content, competitor-content, topic-universe, prompt-intelligence).
- **Solution:** New `/automations` dashboard page showing all brands in one grid with:
  - Per-job toggle switches (Daily Scan, Discovery Scan, Competitor Intel, Content Generation, Citation Verify, Prompt Enrichment, Prompt Intelligence)
  - Per-job schedule dropdowns (daily/every other day/2x week/weekly/biweekly/monthly)
  - Cost weight indicators ($/$$/$$$ per job)
  - 7-day tracked spend per brand
  - Master pause/play per brand
  - Scan cap selector (25/50/100/200 queries)
  - Auto-memo toggle + daily memo cap
- **Database:** Added schedule + toggle columns to existing `brand_settings` table (was empty/unused). Auto-create trigger ensures every brand gets default settings.
- **Backend wiring:** `daily-run.ts` now loads `brand_settings` for all brands before triggering any jobs. Each job respects its per-brand enabled/schedule setting. Individual inngest functions (`scan-run.ts`, `citation-verify.ts`, `competitor-content.ts`, `hourly-content.ts`) also check settings as a safety net.
- **New utility:** `lib/utils/brand-settings.ts` — `getBrandSettings()`, `getAllBrandSettings()`, `shouldRunOnSchedule()` shared across all functions.
- Files changed/created: `app/(dashboard)/automations/page.tsx`, `components/dashboard/automations-grid.tsx`, `app/api/brands/automations/route.ts`, `lib/utils/brand-settings.ts`, `lib/feed/types.ts`, `lib/inngest/functions/daily-run.ts`, `lib/inngest/functions/scan-run.ts`, `lib/inngest/functions/hourly-content.ts`, `lib/inngest/functions/citation-verify.ts`, `lib/inngest/functions/competitor-content.ts`, `components/dashboard/dashboard-header.tsx`

### February 6, 2026 (v2)

**Fix: Watch Tab Classifier — Recognize Industry Topics on Competitor Product Pages**
- **Problem:** The Watch tab classifier was marking competitor product pages (e.g., "Food Safety Temperature Monitoring", "HACCP Temperature", "Remote Temperature Monitoring") as `is_competitor_specific: true` + `content_type: promotional`, causing them to be auto-skipped with no Respond button. For Checkit, 135/144 items were skipped — most covering topics Checkit itself offers.
- **Root cause:** The classification prompt had no awareness of the brand's own capabilities. It treated all competitor product pages as competitor-specific, even when the underlying topic (temperature monitoring, food safety, HACCP compliance) is a universal industry capability.
- **Fix — Smarter classification prompt** (`lib/inngest/functions/competitor-content.ts`): Now includes brand capabilities (features, products, markets) as context. Distinguishes between truly competitor-specific content (funding, hires, internal product updates) and industry topic pages where the capability is universal and the brand could write authoritatively about the same topic.
- **Fix — Topic-driven respond logic**: Updated `shouldRespond` (backend) and `canRespond` (Watch UI) to be topic-driven: any content with a `universal_topic` that isn't competitor-specific is now respondable, regardless of `content_type`. Previously gated to only educational/industry/thought_leadership.
- **Data fix**: Reset 107 previously-skipped Checkit items back to `new` for reclassification with the updated prompt.
- Files changed: `lib/inngest/functions/competitor-content.ts`, `components/dashboard/competitor-watch.tsx`

### February 6, 2026

**Feature: Content Coverage Audit — Map Your Content Gaps**
- New COVERAGE tab on brand page: maps the complete content topic universe a brand needs for AI visibility
- **Site Content Inventory** (`lib/utils/site-inventory.ts`): fetches brand's sitemap.xml, batch-classifies all URLs by content type (blog, comparison, resource, product, industry, etc.), and deep-reads 10-15 key pages to assess content quality/word count
  - Handles sitemap index files recursively, falls back to Jina site search if no sitemap
  - Filters non-content URLs (privacy, terms, careers, login, etc.)
  - Caps at 500 URLs, one GPT-4o-mini call for classification (~$0.02)
- **Topic Universe Generator** (`lib/inngest/functions/topic-universe.ts`): generates 40-150 specific content topics per brand using GPT-4o with full brand context + competitor list + site inventory + existing memos
  - Categories: comparisons, alternatives, how-tos, industry guides, definitions, use cases
  - Each topic scored by priority (0-100) based on competitor density, content type citation potential, funnel stage
  - AI matches topics against existing site content during generation (no brittle fuzzy matching)
  - Topics marked as covered/partial/gap with references to matching pages/memos
- **Coverage Score UI** (`components/dashboard/coverage-audit.tsx`): circular progress ring with percentage, category breakdown cards with mini progress bars, top priority gaps section, full topic list with filter/sort
  - Empty state with "Run Coverage Audit" CTA for brands without topics
  - One-click "Generate" per gap topic, batch "Generate Top 10" button
  - Filter by status (all/gap/partial/covered), sort by priority/category/status
- **Continuous Monitoring**: when new competitors are auto-discovered from scan results, automatically adds comparison + alternative topics to the topic universe
- **Database**: `topic_universe` table with RLS policies, indexes on brand_id + status + priority
- **API**: `generate_topic_universe` and `batch_generate_memos` actions, `/api/brands/[brandId]/coverage` GET endpoint

**Files created:**
- `lib/utils/site-inventory.ts` — Sitemap fetch + URL classification + deep-read
- `lib/inngest/functions/topic-universe.ts` — Topic generation + refresh Inngest functions
- `components/dashboard/coverage-audit.tsx` — Coverage tab UI component
- `app/api/brands/[brandId]/coverage/route.ts` — Coverage data API

**Files modified:**
- `app/(dashboard)/brands/[brandId]/page.tsx` — Added COVERAGE tab + data fetch
- `app/api/brands/[brandId]/actions/route.ts` — Added generate_topic_universe + batch_generate_memos actions
- `app/api/inngest/route.ts` — Registered topicUniverseGenerate + topicUniverseRefresh
- `lib/inngest/client.ts` — Added topic/universe-generate + topic/universe-refresh event types
- `lib/inngest/functions/scan-run.ts` — Emit topic refresh when new competitors discovered
- `lib/supabase/types.ts` — Added TopicUniverse, SitePageEntry, CoverageScore types

---

**Add AI Search Mastery Course** (fdb56b9) — February 12, 2026
- Complete course platform at `/course` for marketers to learn AI search optimization
- 25-question timed assessment (20s per question, auto-advance to prevent cheating)
- 10 comprehensive modules: AI Search Fundamentals, Buyer Behavior Changes, AI vs SEO, AI vs PPC, Best Practices, Things to Avoid, Technical Components, Content Strategy, Future of AI Search, Measuring AI Search
- Baseline assessment flow: shows score only (no correct/wrong answers)
- Final assessment flow: unlocked after all modules complete, shows full breakdown with explanations and improvement delta
- Lightweight email enrollment with cookie-based session (no full Supabase auth needed)
- Module progress tracking with completion gating
- Supabase tables: course_enrollments, course_assessments, course_assessment_answers, course_module_progress

**Files changed:**
- `app/course/page.tsx` — Course landing page with enrollment form
- `app/course/layout.tsx` — Course layout with branded header
- `app/course/assessment/page.tsx` — Timed assessment with countdown timer and auto-advance
- `app/course/results/page.tsx` — Results page (score-only for baseline, full breakdown for final)
- `app/course/learn/page.tsx` — Module overview with progress tracking
- `app/course/learn/[moduleSlug]/page.tsx` — Individual module content pages
- `app/api/course/enroll/route.ts` — Enrollment API with returning user detection
- `app/api/course/assessment/route.ts` — Assessment lifecycle (start, answer, complete)
- `app/api/course/progress/route.ts` — Module completion tracking
- `lib/course/types.ts` — TypeScript types for course data
- `lib/course/questions.ts` — 25 assessment questions across all AI search topics
- `lib/course/modules.ts` — 10 course modules with comprehensive content

---

**Add Sentiment Analysis & Brand Position Tracking** (fd781cc)
- New lightweight sentiment classifier (`lib/utils/sentiment.ts`) — classifies brand mentions as positive/negative/neutral using pattern matching, zero extra API cost
- Added `brand_sentiment` and `sentiment_reason` columns to `scan_results` table via migration
- Integrated classification into scan-run for both Perplexity and OpenRouter paths — all future scans auto-classified
- Backfilled sentiment for all 86 existing brand mentions (45% positive, 54% neutral, 1% negative)
- Sources tab: new Sentiment score card, Avg Position card, sentiment breakdown bar, and per-funnel-stage sentiment/position data
- Query detail drawer: sentiment badge with reasoning per scan result
- One-time backfill API route at `/api/backfill-sentiment`

**Files changed:**
- `lib/utils/sentiment.ts` — New: pattern-based sentiment classifier
- `lib/inngest/functions/scan-run.ts` — Added sentiment classification to both scan providers
- `lib/supabase/types.ts` — Added `brand_sentiment`, `sentiment_reason` to scan_results types
- `components/dashboard/citation-insights.tsx` — Sentiment score card, breakdown bar, per-funnel sentiment/position
- `components/dashboard/query-detail.tsx` — Sentiment badge per scan in detail drawer
- `app/(dashboard)/brands/[brandId]/page.tsx` — Added `funnel_stage` to allQueries fetch
- `app/api/backfill-sentiment/route.ts` — New: one-time backfill endpoint

---

**Add Vercel Analytics** (4ea8dc4)
- Installed `@vercel/analytics` package
- Added `<Analytics />` component to root `app/layout.tsx`
- Tracks page views and visitors across all routes via Vercel dashboard

**Files changed:**
- `app/layout.tsx` - Added Analytics import and component
- `package.json` / `package-lock.json` - Added @vercel/analytics dependency

---

**Fix: Memo Sources — Real Clickable URLs Instead of AI-Generated Filler** (0427164)
- Sources section was showing hallucinated descriptions ("Perplexity AI documentation and behavior analysis") instead of actual links
- Root causes: `{{brand_domain}}` placeholder was never replaced in generation code, prompt templates used vague text instead of markdown links, HOW_TO included filler "Industry best practices and general knowledge"
- All 4 memo types (comparison, industry, how_to, alternative) now generate proper linked sources: `[Brand Name](https://brand.com) (accessed date)`
- Added `{{brand_domain}}` and `{{competitor_domain}}` replacements to all memo generation cases
- Fixed ALTERNATIVE prompt only replacing `{{competitor_name}}` once (now global)
- Database `sources` array now includes competitor domain for comparison/alternative memos

**Files changed:**
- `lib/ai/prompts/memo-generation.ts` - Updated Sources sections in all 4 prompt templates
- `lib/inngest/functions/memo-generate.ts` - Added domain replacements + competitor in sources array

---

**Feature: Daily Digest Email via Resend**
- New Inngest cron function `daily-digest` runs at 9 AM ET daily (2 PM UTC)
- Sends per-tenant email summarizing last 24 hours of AI visibility activity
- Per-brand stats: visibility score with delta, scan count, mention/citation rate
- Notable events: new citations won, citations lost, memos generated/published, competitor content detected
- Streak milestones for queries hitting 5+ day citation streaks
- Prompt coverage progress bar
- Top competitors by mention frequency
- Skips tenants with zero activity (no spam)
- Uses Resend API (raw fetch, no extra dependency)
- Responsive HTML email with dark header, stat cards, progress bars

**Files created:**
- `lib/inngest/functions/daily-digest.ts` - Inngest cron function + email template

**Files modified:**
- `app/api/inngest/route.ts` - Registered dailyDigest function

---

**Rebrand 'Content' to 'Memos' Across Product UI** (486850d)

Memo-first branding — everything Context Memo produces is a "memo", not generic "content."

Landing page changes:
- "CONTENT INTELLIGENCE" → "COMPETITIVE WATCH"
- "AUTO-GENERATE CONTENT" → "GENERATE MEMOS"
- "POPULAR CONTENT" → "FEATURED MEMOS"
- "VIEW ALL CONTENT" → "VIEW ALL MEMOS"
- "Content intelligence" (pricing) → "Competitive watch"
- Trust section: "THE AUTHENTICITY PRINCIPLE" → "NOT ANOTHER BLOG POST"
- New positioning copy: memos structured for people, AI, and search; cross-referenced with brand data; transparent about AI generation
- Feature descriptions updated to memo-first language

Dashboard changes:
- Settings: "Content Settings" → "Memo Settings" (nav + heading + all descriptions)
- Memo edit: "Content" card → "Memo", helper text updated
- Activity detail: all explanatory text uses "memos" for our output
- Competitor/entity list: "content monitoring" → "memo generation" / "visibility scans"
- Brand actions: "Educational content" → "Step-by-step memo", "Content pipeline" → "Memo pipeline"

Public pages:
- /memos index: meta description + hero copy updated to memo-first language

Left untouched: "competitor content" references (legitimately about their blog posts/articles)

**Files changed (8):**
- `app/page.tsx` - Landing page rebrand
- `app/(dashboard)/brands/[brandId]/settings/page.tsx` - Memo Settings
- `app/(dashboard)/brands/[brandId]/memos/[memoId]/page.tsx` - Memo edit copy
- `app/(public)/memos/page.tsx` - Public memos meta/hero
- `components/dashboard/activity-detail.tsx` - Activity explanations
- `components/dashboard/brand-actions.tsx` - Action descriptions
- `components/dashboard/competitor-list.tsx` - Competitor dialogs
- `components/dashboard/entity-list.tsx` - Entity dialogs

---

**Add Popular Content Section to Homepage** (3e00a73)
- New "Popular Content" section on homepage showcasing curated memos
- Database: Added `featured` boolean and `sort_order` integer columns to memos table
- Displays up to 6 featured memos with:
  - Memo type badge (guide, how_to, comparison)
  - Title and meta description
  - "Read more" hover effect
  - Links to public memo pages
- "View All Content" button links to /memos index
- 5 GEO/AI visibility memos marked as featured for launch:
  - What is GEO (Generative Engine Optimization)? The Complete Guide
  - How to Get Your Brand Mentioned by ChatGPT
  - Best AI Visibility Tools 2026
  - GEO vs SEO: What Marketers Need to Know
  - How to Optimize Content for Perplexity AI

**Files changed:**
- `app/page.tsx` - Added popular content section with featured memos query
- `lib/supabase/types.ts` - Added `featured` and `sort_order` to memos types

---

### February 12, 2026

**Feature: Custom Domain Support for Brand White-Labeling** (16f57da)
- Added Vercel domains API utility (`lib/utils/vercel-domains.ts`) for programmatic domain management
- Updated middleware to resolve custom domains (e.g., `ai.krezzo.com` → Krezzo brand) before subdomain routing
- Updated memo page `isSubdomainAccess()` to detect custom domain access for correct internal link generation
- Created full CRUD API for custom domain management (`/api/brands/[brandId]/custom-domain/`)
- Applied RLS policy for public custom domain resolution in middleware (anon role access for verified domains)
- Moved `ai.krezzo.com` from old Vercel project to contextmemo project, SSL provisioned and verified

**Database changes:**
- `brands.custom_domain` (TEXT UNIQUE) and `brands.domain_verified` (BOOLEAN) columns added
- RLS policy "Public custom domain lookup" added for anonymous domain resolution
- Krezzo brand configured: `custom_domain = 'ai.krezzo.com'`, `domain_verified = true`

**OKR Memo Content Generation (Krezzo brand):**
- Generated 16 OKR-focused memos across 4 types:
  - **Comparison (4):** OKRs vs KPIs, OKRs vs SMART Goals, OKRs vs MBOs, OKRs vs Balanced Scorecard
  - **How-to (4):** Write OKRs, Run OKR Check-ins, Score OKRs, Cascade OKRs
  - **Industry (4):** OKRs for Startups, Engineering Teams, Sales Teams, Remote Teams
  - **Gap fill (4):** What Are OKRs, What Are Key Results, OKR Examples, OKR Best Practices
- All 16 memos published and verified live at `ai.krezzo.com`
- Total Krezzo memos: 20 (4 existing + 16 new)

**Files created/modified:**
- `lib/utils/vercel-domains.ts` (NEW) — Vercel API utility
- `lib/supabase/middleware.ts` — Custom domain resolution
- `app/memo/[subdomain]/[[...slug]]/page.tsx` — Custom domain detection
- `app/api/brands/[brandId]/custom-domain/route.ts` (NEW) — CRUD API

**Verification:**
- `ai.krezzo.com` → HTTP 200, all 20 memos rendering correctly
- `krezzo.contextmemo.com` → continues working as before
- Internal links use custom domain when accessed via `ai.krezzo.com`

---

### February 5, 2026

**Sunset Unused Features + Enhance Entities with Mention Tracking** (16ce1c3)

Phase 1 cleanup - removed 7 unused tabs from UI:
- SEARCH (0 rows in search_console_stats)
- AI TRAFFIC (0 rows in ai_traffic)
- INTELLIGENCE (0 rows in attribution_events, prompt_intelligence)
- QFO (experimental, low usage)
- MAP (experimental, ReactFlow overhead)
- LAB (only 2 runs ever)
- STRATEGY (marketing fluff, cost calculator)

Kept core tabs: Profile, Activity, Scans, Memos, Prompts, Entities, Watch, Alerts

Entities tab improvements:
- Moved EntityList to top of tab (primary view)
- Added mention tracking: count unique prompts where each entity is mentioned
- New sort options: Mentions (default), Citations, A-Z
- Show "X prompts" badge with amber styling for high-mention entities
- Competitors_mentioned data now aggregated from scan_results

**Files changed:**
- `app/(dashboard)/brands/[brandId]/page.tsx` - Removed unused tabs, added mention aggregation
- `components/dashboard/entity-list.tsx` - Added mention counts, new sort options

**Net reduction:** 128 lines added, 276 lines removed (148 lines net reduction)

---

**Rename COMPETITORS to ENTITIES Tab with V2 Features** 
- Renamed "COMPETITORS" tab to "ENTITIES" to better reflect that it tracks competitors, publishers, analysts, marketplaces, and other entity types
- Created new `EntityList` component adapted from v2 with:
  - Filter pills for entity types (All, Competitors, Partners, Publisher, Analyst, Marketplace, etc.)
  - Color-coded entity type badges with icons
  - Citations count per entity with expandable URL list
  - Sorting options (Most Cited, A-Z)
  - Tracked vs Discovered sections (discovered is collapsible)
  - Search for discovered entities when >10 items
- Added citation data aggregation from scan_results to show which entities get cited most
- Kept existing CompetitiveIntelligence and CompetitorContentFeed components in the tab

**Files changed:**
- `app/(dashboard)/brands/[brandId]/page.tsx` - Renamed tab, added citation data fetching, use EntityList
- `components/dashboard/entity-list.tsx` - New component with filtering, entity types, citations

---

**Add /resources Route with Branded Context Memo Styling** (11c1e8a)
- Created `/resources/[[...slug]]` route for Context Memo's own memos on main domain
- Added `BrandedMemoPageContent` component with "Bold Electric" theme (dark navy, electric blue accents, sharp corners)
- Added `BrandedMemoListCard` for branded index pages
- Mapped 'resource' memo type to /resources route
- Memos now accessible at `contextmemo.com/resources/...` instead of subdomain

**Files changed:**
- `app/(public)/resources/[[...slug]]/page.tsx` - New route for resources
- `lib/memo/render.tsx` - Added branded components and resource type mapping

---

**Filter Blocked Terms from Competitor Mentions in UI** (7c86ccb)
- Fixed issue where generic words like "blog", "customer", "seo", etc. were appearing as competitors in Share of Voice and Competitive Threats views
- Added filtering using the existing competitor blocklist across all display components
- Affected components: competitive-intelligence.tsx, scan-results-view.tsx, query-detail.tsx, feed-detail-drawer.tsx
- The blocklist already existed in `lib/config/competitor-blocklist.ts` - now applied consistently in UI

---

**QA Fixes: Settings UI, Activity Feed Links, 404 Errors** (7cc3af0)
- Removed Domain/Subdomain display fields from Settings (not editable, cluttered UI)
- Fixed placeholder text for Founded/Headquarters fields (was showing misleading defaults like "2020", "San Francisco, CA")
- Changed "Competitor Auto-Discovered" to "Entity Auto-Discovered" for non-competitor entities (G2, publishers, etc.)
- Made activity feed links open in new tab (prevents navigation state issues)
- Fixed personas race condition - now updates local state immediately after API response (no more lag)
- Added sticky save bar at bottom of Settings page (appears only when unsaved changes exist)
- Fixed 404 errors on scan/analytics/citations links (routes didn't exist, now point to valid pages)
- Removed Prompt Themes section from Settings (unused feature)

**Files changed:**
- `app/(dashboard)/brands/[brandId]/settings/page.tsx` - UI cleanup, sticky save bar, remove themes
- `app/api/activity/route.ts` - Fix broken link URLs
- `components/dashboard/activity-feed.tsx` - Links open in new tab
- `components/v2/feed/feed-item.tsx` - Links open in new tab
- `lib/feed/emit.ts` - Entity type support in feed events
- `lib/utils/activity-logger.ts` - Entity type support, fix link URLs

---

**Fix: HubSpot Images - Use Unsplash URLs Directly** (b1a6977)
- Reverted `files` OAuth scope (requires HubSpot developer portal config change)
- Now using Unsplash URLs directly for featured images - HubSpot accepts external URLs
- Removed `uploadImageToHubSpot` function from both API route and memo-generate
- This should work without any reconnection required

---

**Fix: HubSpot Sync - Auto-Publish, Images, and Author** (09d58ca)
- HubSpot button now respects brand's `auto_publish` setting from Settings
- Added `files` OAuth scope for image uploads (user needs to reconnect HubSpot)
- Added detailed logging to debug image upload failures
- Passed `hubspotAutoPublish` prop through component tree

**Files changed:**
- `app/api/auth/hubspot/authorize/route.ts` - Added `files` scope
- `app/api/brands/[brandId]/memos/[memoId]/hubspot/route.ts` - Better logging
- `components/dashboard/brand-actions.tsx` - Use `hubspotAutoPublish` prop
- `components/dashboard/brand-tabs.tsx` - Pass `hubspotAutoPublish`
- `app/(dashboard)/brands/[brandId]/page.tsx` - Extract and pass `hubspotAutoPublish`

---

**Feature: HubSpot Auto-Publish Toggle + Image Upload Fix** (411523c)
- Added auto-publish setting to HubSpot integration - toggle in Settings under Integrations
- When enabled, synced content publishes immediately; when disabled, creates as drafts
- Fixed image handling in auto-sync: now uploads images to HubSpot file manager first (HubSpot requires images on their platform)
- Previously auto-sync was passing Unsplash URLs directly, which HubSpot silently ignored
- Default `auto_publish: false` on new HubSpot connections for safety

**Files changed:**
- `app/(dashboard)/brands/[brandId]/settings/page.tsx` - Added auto-publish toggle (shows when auto-sync enabled)
- `lib/inngest/functions/memo-generate.ts` - Added `uploadImageToHubSpot()` function, updated auto-sync to upload images
- `app/api/auth/hubspot/callback/route.ts` - Added `auto_publish: false` default

---

**Feature: HubSpot Author Attribution + User Profile Settings**
- HubSpot integration now properly sets blog post authors using `blogAuthorId` (not just `authorName` text field)
- Added `getOrCreateHubSpotAuthor()` function that finds existing authors by name/email or creates new ones
- Added user profile API endpoint (`GET/PATCH /api/user/profile`) for updating display name
- Added Account settings dialog in header dropdown - users can set their display name
- Display name is used as HubSpot author when publishing content
- Fallback: parses email into nice name (e.g., `stephen.newman@checkit.net` → "Stephen Newman")

**Files changed:**
- `app/api/brands/[brandId]/memos/[memoId]/hubspot/route.ts` - Added author management, use `blogAuthorId`
- `app/api/user/profile/route.ts` - New API for user profile GET/PATCH
- `components/dashboard/dashboard-header.tsx` - Added Account menu item and settings dialog

---

**Fix: tenants.user_id Bug in Multiple API Routes**
- Fixed 404 error on `/api/usage` and other usage endpoints
- Root cause: Code was querying `tenants.user_id` but the tenants table uses `id` as the user ID (same as `auth.uid()`)
- Fixed same bug in 5 API routes: `/api/usage`, `/api/usage/by-brand`, `/api/usage/breakdown`, `/api/usage/summary`, `/api/jobs`
- Also fixed brand deletion failing due to foreign key constraints (usage_events, active_jobs now CASCADE on delete)

**Files changed:**
- `app/api/usage/route.ts` - Changed `.eq('user_id', ...)` to `.eq('id', ...)`
- `app/api/usage/by-brand/route.ts` - Same fix
- `app/api/usage/breakdown/route.ts` - Same fix
- `app/api/usage/summary/route.ts` - Same fix
- `app/api/jobs/route.ts` - Same fix
- Applied database migration to fix foreign key constraints

---

**Fix: Brand Context Extraction Failures + RLS Policy Error**
- Fixed issue where context extraction would silently fail and return minimal data even when website content was successfully crawled
- Root cause: GPT-4o JSON parsing would fail on some websites, triggering fallback that returned only domain name as company_name
- Added retry logic with simplified prompt if first extraction attempt fails
- Added content cleanup to remove image markdown and excessive whitespace before sending to GPT-4o
- Added better logging to track extraction success/failure
- Fixed RLS policy error flooding logs: `column tenants.user_id does not exist`
  - Root cause: `usage_credits` table had broken RLS policy referencing `tenants.user_id` instead of `tenants.id`
  - The tenants table uses `id` as the user ID (same as `auth.uid()`)

**Files changed:**
- `lib/inngest/functions/context-extract.ts` - Added retry logic, content cleanup, better error handling
- `scripts/sql/migrations/20250205_brand_billing.sql` - Fixed RLS policy source
- Applied database migration to fix RLS policy

---

**Fix: Subdomain Memo Pages 404**
- Fixed critical bug where all memo pages on brand subdomains (e.g., `checkitnet.contextmemo.com/how/...`) returned 404
- Root cause: Supabase query in `/app/memo/[subdomain]/[[...slug]]/page.tsx` had an invalid relational join `reviewed_by:reviewed_by(email, raw_user_meta_data)` that failed with error: "Could not find a relationship between 'memos' and 'reviewed_by' in the schema cache"
- Also fixed metadata query missing `brand_id` filter, which could return wrong memo metadata
- Impact: All brand subdomain memo URLs now work correctly

**Files changed:**
- `app/memo/[subdomain]/[[...slug]]/page.tsx` - Removed invalid join, added brand_id filter to metadata query

---

**Fix: HubSpot Featured Images Not Showing** (8668e6b)
- HubSpot requires images to be hosted on their platform (`hubfs/`)
- External Unsplash URLs were being silently ignored
- Now downloads image from Unsplash → uploads to HubSpot file manager → uses HubSpot URL
- Images stored in `/contextmemo-featured-images/` folder in HubSpot
- Falls back gracefully to no featured image if upload fails

---

**Fix: Memo Delete + Table View (v1 + v2)** (f376b4b)
- Applied table view to v1 dashboard memos tab (the one you're using)
- Columns: Title (with slug), Type, Status, Created, Actions
- Moved "Generate Memo" dropdown to card header (cleaner layout)
- Shows counts in header: total, published, drafts
- Actions appear on row hover (view live, hubspot sync, edit)

---

**Fix: Memo Delete + Table View** (7ee8501)
- Fixed memo delete not working - was using client-side Supabase delete (failing due to RLS), now uses server-side API action
- Fixed redirect after delete - was going to profile page, now correctly goes to `/v2/brands/{brandId}/memos`
- Converted memos list from card view to table view with columns:
  - Title (with slug preview)
  - Type (formatted memo type)
  - Status (Published/Draft badge)
  - Created date
  - Updated date
  - Actions (edit, view live)
- Added new `components/ui/table.tsx` component
- Header now shows counts: total, published, drafts

---

**Fix: Competitor Discovery Quality - Blocklist System**
- Added competitor blocklist to prevent generic/incorrect entries from being discovered
- **Retroactive cleanup**: 55 entries deactivated across all brands
- Fixed problematic entries: Customer, HubSpot, Salesforce, Seamless, SEO
- Fixed entity types: Gartner, G2, Capterra now correctly typed as analyst/marketplace
- Created reusable blocklist config for future filtering

**Blocked categories:**
- Generic terms: Customer, SEO, Seamless, Analytics, Marketing, Sales, etc.
- Common tools brands USE but don't compete with: HubSpot, Salesforce, Zendesk, Zapier, etc.
- Project management tools: Monday.com, Asana, Trello, Notion, etc.
- Auto-corrects entity types: G2/Capterra → marketplace, Gartner/Forrester → analyst

**Files created:**
- `lib/config/competitor-blocklist.ts` - Blocklist configuration and validation functions

**Files modified:**
- `lib/inngest/functions/competitor-discover.ts` - Added blocklist filtering
- `lib/ai/prompts/context-extraction.ts` - Added explicit blocklist instructions to AI prompt

**Database changes:**
- Deactivated 55 blocked competitor entries across all brands
- Fixed entity_type for 18 marketplace/analyst entries

---

**Improve: Navigation UX and Loading Performance** (11e9fb1)
- Renamed main `/dashboard` page from "DASHBOARD" to "BRANDS"
- Individual brand pages now show "DASHBOARD" as header with brand name as subtitle
- Added "DASHBOARD" nav link in header when viewing a brand page (links back to that brand)
- Fixed 404 on "view live" link by using path-based URL (`/memo/subdomain`) instead of subdomain URL
- Added loading skeletons for instant page load feedback:
  - `/dashboard` shows skeleton brand cards while data loads
  - `/brands/[brandId]` shows skeleton stats and tabs while data loads

**Files changed:**
- `app/(dashboard)/dashboard/page.tsx` - Renamed header to "BRANDS"
- `app/(dashboard)/dashboard/loading.tsx` - Added skeleton loading UI
- `app/(dashboard)/brands/[brandId]/page.tsx` - New header layout with "DASHBOARD" title
- `app/(dashboard)/brands/[brandId]/loading.tsx` - Added skeleton loading UI  
- `components/dashboard/dashboard-header.tsx` - Added contextual DASHBOARD link

---

**Feature: Strategy Playbook with Interactive Cost Calculator**
- New STRATEGY tab on brand page with comprehensive AI visibility roadmap
- 4-phase methodology: Discovery (Weeks 1-4) → Foundation (Weeks 5-8) → Optimization (Months 3-4) → Scale (Month 5+)
- **Interactive Cost Calculator with sliding scale pricing:**
  - Prompts tracked (10-200)
  - AI models (1-4: GPT, Claude, Grok, Perplexity)
  - Scan frequency (weekly, 2x/week, 3x/week, daily)
  - Memos per month (0-50)
  - Competitors monitored (0-50)
- **Built-in 3x margin** on actual API costs
- **Tier presets:** Starter (~$15/mo), Growth (~$49/mo), Pro (~$99/mo), Scale (~$299/mo)
- Real-time cost breakdown by category (scanning, content, competitors, discovery)
- ROI comparison to traditional content costs
- Files created:
  - `components/dashboard/strategy-playbook.tsx` - Full playbook UI with cost calculator
  - `app/api/brands/[brandId]/strategy/route.ts` - Strategy metrics API

**Fix: Year instructions in AI-generated content**
- All AI-generated content (memos, competitor responses) now explicitly receives current year (2026)
- Fixed issue where AI was generating content referencing outdated years (2023)
- Updated 4 memo generation prompts: COMPARISON_MEMO_PROMPT, INDUSTRY_MEMO_PROMPT, HOW_TO_MEMO_PROMPT, ALTERNATIVE_MEMO_PROMPT
- Updated competitor content response generation prompt with current_date and current_year placeholders
- Files changed:
  - `lib/ai/prompts/memo-generation.ts` - Added CURRENT DATE instructions to all 4 prompts
  - `lib/inngest/functions/competitor-content.ts` - Added dynamic date injection to content generation

**Fix: Activity feed filtering & external links** (earlier)
- Added JUNK_TITLE_PATTERNS and JUNK_URL_PATTERNS to filter irrelevant competitor content
- External links now open in new tabs
- Disabled Google AI Overview scans by default

**Add prompt history tracking with mention vs citation trends** (earlier)
- New API: `/api/brands/[brandId]/prompts/[promptId]/history`
- Activity detail now shows daily prompt trends, citation vs mention breakdown
- Interactive date expansion to see per-model results

---

**Usage Tracking & Billing Infrastructure + Activity CTA Fixes** (a7b5a9d)
- Added usage tracking to `discovery-scan.ts` and `prompt-enrich.ts` functions
- Created Stripe metered billing integration for per-brand billing
- New usage visibility APIs: `/api/usage/breakdown`, `/api/usage/by-brand`, `/api/usage/summary`, `/api/usage/openrouter`
- New per-brand billing management: `/api/brands/[brandId]/billing` (GET/POST/DELETE)
- New per-brand usage API: `/api/brands/[brandId]/usage`
- Fixed activity feed CTAs to be contextual instead of generic "View Brand":
  - `content_generated` → "View Resources"
  - `scan_complete` → "View Scan Results"
  - `discovery_complete` → "View Queries"
  - `ai_traffic_detected` → "View Analytics"
  - Default → "View Dashboard"
- Database migration for brand billing columns (stripe_subscription_id, billing_enabled, etc.)

**Files changed:**
- `app/api/activity/route.ts` - Contextual CTA logic
- `lib/utils/activity-logger.ts` - Updated aiTrafficDetected CTA
- `lib/inngest/functions/discovery-scan.ts` - Usage tracking
- `lib/inngest/functions/prompt-enrich.ts` - Usage tracking
- `lib/inngest/functions/scan-run.ts` - Stripe billing integration
- `lib/stripe/usage.ts` (new) - Stripe metered billing helpers
- `app/api/brands/[brandId]/billing/route.ts` (new)
- `app/api/brands/[brandId]/usage/route.ts` (new)
- `app/api/usage/*` (new) - Usage visibility APIs

---

### February 4, 2026

**UX: Compact Tabs + Entity Map Spread** (6e3a87a)
- Compact single-row tabs: smaller padding (px-4 py-2) and font (text-xs)
- Entity map: fixed overlapping nodes with ring-based layout
- Entity map: increased base radius (280px), 4 entities per ring, 120px between rings
- Entity map: dynamic angle spread, supports up to 12 entities per type

**Feature: QFO (Query Fan-Out) Tab** (1a57f17)
- New **QFO** tab for analyzing how LLMs expand prompts into sub-queries
- Based on the "Query Fan Out" SEO strategy article for AI visibility
- Enter any prompt → AI generates 6-8 fan-out sub-queries
- Scan each sub-query with Perplexity to check brand coverage
- Visual coverage summary: cited, mentioned, gaps, competitor wins
- One-click "Generate Cluster" to create memos for all gap queries
- Explains the concept with collapsible info card

**Feature: MAP (Entity Discovery) Tab** (1a57f17)
- New **MAP** tab with ReactFlow interactive visualization
- Radial graph layout with your brand at center
- Entities auto-discovered from scan_results (competitors_mentioned + citations)
- Color-coded by type: Competitor (red), Resource (green), Aggregator (amber), Publisher (purple)
- Node size reflects mention frequency
- Animated red edges show "competitor wins" (they're cited, you're not)
- Click any entity for detail panel with stats and actions
- Mini-map for navigation, zoom controls
- Stats row: Total entities, Competitors, Resources, Aggregators, Total wins
- "Top Threat" card highlights biggest competitor threat

**Files created:**
- `components/dashboard/query-fan-out.tsx` - QFO UI component
- `components/dashboard/entity-map.tsx` - ReactFlow visualization
- `app/api/brands/[brandId]/qfo/route.ts` - Fan-out generation & scanning
- `app/api/brands/[brandId]/entities/route.ts` - Entity extraction from scans

**Dependencies added:**
- `@xyflow/react` - ReactFlow v12 for graph visualization

---

**Feature: Competitor WATCH Tab - Monitor New Content** 
- New **WATCH** tab on brand page for monitoring competitor content activity
- Filter views: Today, Yesterday, Respondable, All Recent
- Shows content that competitors posted in the last 24-48 hours
- Highlights "universal topics" that are good candidates for response
- Manual "Respond" button to generate differentiated content for specific items
- Manual "Skip" button to dismiss content you don't want to respond to
- Badge on tab shows count of new content detected today
- Clean stats cards showing Today/Yesterday/To Respond/Responded counts
- Increased competitor content query limit from 50 to 100 items

**Files created:**
- `components/dashboard/competitor-watch.tsx` - New watch tab component

**Files modified:**
- `app/(dashboard)/brands/[brandId]/page.tsx` - Added WATCH tab and CompetitorWatch component
- `app/api/brands/[brandId]/actions/route.ts` - Added `generate-response` and `skip-content` actions

---

**Feature: Prompt Lab - Citation Research UI** (bf18f40)
- Added prompt visibility in Lab UI - now shows all generated prompts with citation stats
- Added summary stats card showing total scans, citations, mentions, and overall citation rate
- "Prompts That Get Citations" section ranks prompts by citation success
- Per-prompt stats: runs, citations, mentions, citation rate
- API returns topPrompts aggregated by prompt text with performance metrics

**Files modified:**
- `app/api/brands/[brandId]/lab/route.ts` - Added topPrompts and summary stats to GET response
- `components/dashboard/prompt-lab.tsx` - Added summary card and prompts list UI

**Feature: Prompt Lab - High-Volume Citation Research System** (previous commits)
- New "LAB" tab on brand page for running high-volume conversational prompts
- Multi-model scanning: GPT-4o Mini, Claude 3.5 Haiku, Grok 4 Fast, Perplexity Sonar
- Configurable duration (1-60 min) and budget limits ($1-$50)
- 20 conversational prompt templates for long-tail, natural-language queries
- AI-generated prompts based on brand context and buyer intent
- Live model comparison chart showing citation rates per model
- Top entities discovery - who gets cited for similar content
- Cost tracking with real-time budget monitoring
- Stop/resume functionality via Inngest

**Files created:**
- `lib/inngest/functions/prompt-lab.ts` - Core lab runner with multi-model execution
- `scripts/sql/prompt_lab.sql` - Database schema (prompt_lab_runs, lab_scan_results)
- `app/api/brands/[brandId]/lab/route.ts` - Lab API endpoint
- `components/dashboard/prompt-lab.tsx` - Lab UI component

**Files modified:**
- `app/api/inngest/route.ts` - Registered promptLabRun and promptLabStop functions
- `app/(dashboard)/brands/[brandId]/page.tsx` - Added LAB tab

---

**Improve: HubSpot Content Sync Quality** (51dcbf9)
- Added featured images from Unsplash based on memo topic/content type
- Fixed duplicate title issue - title now removed from body (HubSpot displays it separately)
- Added inline styles for better spacing, tables, and typography in HubSpot
- Created `lib/hubspot/image-selector.ts` utility for topic-based image selection
- Applied same improvements to both manual sync and auto-sync flows
- Added `postSummary` and `htmlTitle` for better HubSpot blog listings

**Files created:**
- `lib/hubspot/image-selector.ts` - Topic detection and Unsplash image selection

**Files modified:**
- `lib/hubspot/content-sanitizer.ts` - Title removal, HTML formatting with inline styles
- `app/api/brands/[brandId]/memos/[memoId]/hubspot/route.ts` - Featured image, formatting
- `lib/inngest/functions/memo-generate.ts` - Auto-sync now uses same improvements

---

**Feature: Usage/Cost Tracking Badge**
- Added usage badge in header showing monthly cost (`$X.XX this month`)
- Created `/api/usage` endpoint to fetch tenant usage stats
- Real-time cost display updates every 30 seconds
- Tracks credits used vs limit, shows warning when usage > 80%

**Fix: Scan Progress Modal Improvements**
- Fixed model spinners not completing after scan finished
- Modal now fetches actual query count from API (was showing wrong count)
- Model status lines update to show checkmarks on completion
- Accurate model count display (only 1 model enabled currently: GPT-4o Mini)
- Removed unused `queryCount` prop from `ScanButton`
- Updated dashboard to show "1 AI model (GPT-4o Mini)" instead of "6 AI models"

**Feature: Terminal-Style Scan Progress Modal**
- New `ScanProgressModal` component with real-time progress feed
- Shows scan status across all AI models (GPT-4o, Claude, Gemini, Llama, Perplexity, DeepSeek)
- Displays live stats: scans completed, mentions found, citations
- Terminal-style UI matching the onboarding flow aesthetic
- Replaces toast-only feedback with engaging visual experience

**Fix: Onboarding Infinite Loop**
- Fixed bug where onboarding would loop forever if context extraction/competitor discovery failed
- Now properly checks if data was actually created before redirecting to dashboard
- Shows "Setup Incomplete" state with retry button if Inngest jobs fail or timeout
- Prevents redirect unless context, competitors, AND queries are all present

**Fix: Email Verification Localhost URLs**
- Fixed issue where verification emails used localhost instead of production URL
- Changed `window.location.origin` to use `NEXT_PUBLIC_SITE_URL` env var (defaults to contextmemo.com)
- Updated `app/(auth)/signup/page.tsx` and `app/(auth)/verify-email/page.tsx`
- Added `NEXT_PUBLIC_SITE_URL` to `.env.local`
- Note: Also requires setting Site URL in Supabase Dashboard Auth settings + adding env var to Vercel

**Feature: Prompt-Centric Feed System**
- Transformed feed from scan-level summaries to per-prompt events
- Each prompt scan now emits its own feed event with full context
- Added tracking fields to queries table:
  - `scan_count`, `last_scanned_at`, `citation_streak`, `longest_streak`
  - `first_cited_at` (BIG WIN tracker), `last_cited_at`, `citation_lost_at` (OH NO tracker)
  - `current_status` (never_scanned, gap, cited, lost_citation)
  - `source_type` (original, expanded, competitor_inspired, greenspace, manual, auto)
  - `excluded_at`, `excluded_reason` for tracking excluded prompts
- Added delta tracking to scan_results table:
  - `is_first_citation`, `citation_status_changed`, `previous_cited`
  - `new_competitors_found`, `position_change`
- New prompt event types: `prompt_scanned`, `first_citation`, `citation_lost`, `streak_milestone`, `position_improved`, `new_competitor_found`, `prompt_excluded`
- Enhanced feed-item.tsx with prompt-specific rendering:
  - Streak badge (fire icon for 3+)
  - Status change indicators (position improved/declined)
  - First citation celebration badge
  - Lost citation warning badge
  - Quick exclude button
- Enhanced feed-detail-drawer.tsx with prompt journey view answering 10 key questions:
  1. Origin (source_type)
  2. Cited/mentioned status
  3. Competitors on this prompt
  4. Scan count
  5. Streak
  6. New findings this scan
  7. First citation celebration
  8. Lost citation warning
  9. Related memos
  10. Persona
- Enhanced prompts list page with:
  - Stats summary (cited, gaps, on streaks, lost citations)
  - Tracking columns (scan count, streak, source type, last scanned)
  - Quick exclude dropdown with reasons
  - Collapsed excluded prompts section with re-enable
- Added API endpoints for prompt management:
  - POST /api/brands/[brandId]/prompts/[promptId]/exclude
  - POST /api/brands/[brandId]/prompts/[promptId]/reenable
- Created backfill script for historical tracking data

**Files created:**
- `scripts/sql/prompt_tracking.sql` - Database schema migration
- `app/v2/brands/[brandId]/prompts/prompts-list-client.tsx` - Interactive prompts list
- `app/api/brands/[brandId]/prompts/[promptId]/exclude/route.ts` - Exclude API
- `app/api/brands/[brandId]/prompts/[promptId]/reenable/route.ts` - Re-enable API
- `scripts/backfill-prompt-tracking.ts` - Backfill script

**Files modified:**
- `lib/supabase/types.ts` - Added tracking field types
- `lib/feed/types.ts` - Added prompt event types and data structure
- `lib/feed/emit.ts` - Added emitPromptScanned and emitPromptExcluded
- `lib/inngest/functions/scan-run.ts` - Per-prompt tracking and feed emission
- `components/v2/feed/feed-item.tsx` - Prompt-specific rendering
- `components/v2/feed/feed-detail-drawer.tsx` - Prompt journey view
- `app/api/v2/feed/route.ts` - exclude_prompt and reenable_prompt actions
- `app/v2/brands/[brandId]/prompts/page.tsx` - Enhanced with tracking stats

---

### February 3, 2026

**Remove: Verification Badge from Memos List** (b57c88a)
- Removed "Indexing" spinner badge from memos - not needed

**Files changed:**
- `app/(dashboard)/brands/[brandId]/page.tsx` - Removed VerificationBadge
- `components/dashboard/brand-tabs.tsx` - Removed VerificationBadge (also committed this new file)

---

**Fix: HubSpot Sync Token Refresh & Deleted Post Recovery** (8d89b20)
- Fixed 401 errors by using `getHubSpotToken()` for automatic token refresh
- Fixed 404 errors when syncing memos previously deleted in HubSpot - now gracefully creates new posts
- Updated error messages to be more helpful for users

**Files changed:**
- `app/api/brands/[brandId]/memos/[memoId]/hubspot/route.ts` - Token refresh + 404 fallback

---

**UI Cleanup: Tab-Contextual Action Buttons** (f6a8167)
- Moved "Critical Prompt Themes" from Profile tab to Prompts tab (at bottom)
- Fixed "Add Prompt" button - now has working input form with API action
- Changed "Run Scan" button label to just "Scan"
- Removed persistent Export/Scan buttons from global header area
- Added contextual action buttons to Scans tab (Export + Scan)
- Each tab now has its own relevant action button instead of all in header

**Files changed:**
- `app/(dashboard)/brands/[brandId]/page.tsx` - Removed header buttons, added to scans tab, passed themes to prompts
- `app/api/brands/[brandId]/actions/route.ts` - Added `add_prompt` action for custom prompts
- `components/dashboard/scan-results-view.tsx` - Added PromptThemesSection and working Add Prompt input
- `components/dashboard/profile-section.tsx` - Removed prompt themes section (moved to prompts tab)
- `components/dashboard/brand-actions.tsx` - Changed "Run Scan" to "Scan"

---

**Improve: Settings Page Reorganization** 
- Completely redesigned brand settings page with side navigation
- Added scroll-to-section behavior when clicking nav items
- Organized settings into 8 logical sections:
  1. **General** - Brand name, domain, subdomain
  2. **Brand Context** - Company info, products, markets, customers
  3. **Brand Voice** - Personality, formality, technical level, writing style
  4. **Content Settings** - Auto-publish toggle
  5. **Target Personas** - Buyer profiles with seniority/function (moved from profile page)
  6. **Prompt Themes** - Critical keyword clusters (moved from profile page)
  7. **Integrations** - HubSpot, Bing Webmaster, Google Search Console
  8. **Danger Zone** - Delete brand
- Sticky side nav with active section highlighting
- IntersectionObserver-based scroll spy for section tracking
- Save button always visible in sidebar for quick access
- Personas and Prompt Themes now manageable directly in settings (previously only on brand profile)

**Files changed:**
- `app/(dashboard)/brands/[brandId]/settings/page.tsx` - Complete rewrite with new layout

---

**Improve: Memo Generation Quality & Display** 
- Fixed duplicate title issue - prompts no longer generate `# Title` since page renders it separately
- Added visible author byline ("Context Memo - Automated brand intelligence") in memo hero section
- Improved spacing between headings, paragraphs, tables, and lists in CSS
- Enhanced table styling with better borders, backgrounds, and rounded corners
- Updated all memo prompts (comparison, industry, how-to, alternative) with:
  - More conversational, verbose tone (600-900 words vs 400-600)
  - Explicit formatting instructions for blank lines between sections
  - AI-readability best practices (topic sentences, specific claims, takeaways)
  - Full paragraph requirements (3-5 sentences) instead of terse bullet points
- Updated gap-to-content prompt with same formatting improvements
- Changed default tone from terse/professional to "conversational, easy to read"

**Files changed:**
- `lib/ai/prompts/memo-generation.ts` - All 4 memo prompts rewritten
- `lib/inngest/functions/gap-to-content.ts` - Content gap prompt improved
- `app/memo/[subdomain]/[[...slug]]/page.tsx` - Author byline + improved CSS

---

**Add: HubSpot Landing Page** (330b138)
- New `/hubspot` landing page with focused value proposition for HubSpot users
- Hero: "Fill the gaps in your content strategy" messaging
- 4-step workflow: Understand → Find the Gaps → Generate & Publish → Monitor & Improve
- "See It In Action" section with 8 product screenshots organized by step
- Consumption-based pricing calculator with interactive sliders
- Beta signup with 50% discount messaging and email capture
- Removed tiered pricing confusion, prominent auth links
- Clean, self-contained page for marketing to HubSpot users

**Improve: HubSpot Content Generation Quality** (0e37800)
- Enhanced content generation prompt for richer articles (1800-2500 words vs ~500)
- Require naming real competitors (SafetyCulture, Monnit, Zenput, etc.) instead of "Tool A"
- Mandate 8-10 statistics with sources (FDA, WHO, industry data)
- Add detailed comparison tables with 8+ features
- Include 5-7 specific FAQs for AI citation
- Add regulatory references (FDA FSMA, HACCP, ISO 22000)
- Fixed multiple TypeScript errors with Supabase type inference (cast through `any` for query relations)
- Regenerated all 14 Checkit content gap articles with improved quality

**Add: Competitive Differentiation Features**

Built 5 major differentiation features to set Context Memo apart from competitors:

1. **Closed-Loop Citation Verification** (`lib/inngest/functions/citation-verify.ts`)
   - Re-runs prompts 24h after content publish to verify brand now gets cited
   - Tracks "time to citation" metric (hours from publish to first citation)
   - Auto-retries up to 3 times over 72 hours if not verified
   - Updates memo with verification metrics

2. **Revenue Attribution** (`lib/inngest/functions/revenue-attribution.ts`)
   - Connects AI traffic to HubSpot contacts and deals
   - Tracks full funnel: traffic → contact → deal → closed won
   - Calculates ROI metrics and attributed revenue
   - Daily sync job to match AI visitors to CRM records

3. **Per-Model Optimization** (`lib/inngest/functions/model-insights.ts`)
   - Analyzes which AI models cite the brand most
   - Identifies content preferences per model (FAQ, comparison, etc.)
   - Generates model-specific recommendations
   - Weekly analysis job

4. **Prompt Intelligence Feed** (`lib/inngest/functions/prompt-intelligence.ts`)
   - Tracks trending prompts and competitor wins
   - Identifies emerging query patterns to target
   - AI-powered insights generation
   - Weekly intelligence analysis

5. **HubSpot Marketplace Preparation** (`docs/HUBSPOT_MARKETPLACE.md`)
   - Complete listing guide with categories, descriptions, assets
   - Technical requirements and OAuth scope documentation
   - Pricing strategy and competitive positioning
   - Launch strategy and action items

**New SQL Tables:**
- `scripts/sql/attribution_events.sql` - Revenue attribution tracking
- `scripts/sql/prompt_intelligence.sql` - Prompt intelligence data

**Backend Files:**
- `lib/inngest/functions/citation-verify.ts` - NEW
- `lib/inngest/functions/revenue-attribution.ts` - NEW
- `lib/inngest/functions/model-insights.ts` - NEW
- `lib/inngest/functions/prompt-intelligence.ts` - NEW
- `lib/inngest/functions/gap-to-content.ts` - Added verification scheduling
- `lib/inngest/functions/daily-run.ts` - Added verification step
- `app/api/inngest/route.ts` - Registered new functions
- `docs/HUBSPOT_MARKETPLACE.md` - NEW

**UI Components:**
- `components/dashboard/verification-badge.tsx` - NEW: Shows citation verification status on memos
- `components/dashboard/attribution-dashboard.tsx` - NEW: Revenue funnel from AI traffic
- `components/dashboard/prompt-intelligence-feed.tsx` - NEW: Trending prompts and competitor wins
- `components/dashboard/model-insights-panel.tsx` - NEW: Per-model citation analysis
- `components/ui/tooltip.tsx` - NEW: Tooltip component for verification badges
- `app/(dashboard)/brands/[brandId]/page.tsx` - Added new INTELLIGENCE tab with all components

---

**Experiment: 10X AI Citations Strategy for Checkit**

**Analysis & Fix: Checkit competitor/query configuration**
- Discovered root cause: Checkit had wrong competitors (Asana, Monday.com, Trello) instead of temperature monitoring competitors
- Fixed competitor list: ComplianceMate, SafetyCulture, Zenput, Monnit, Dickson, Therma, Controlant
- Added 33 relevant queries for temperature monitoring, food safety, HACCP compliance
- Key finding: Even with correct queries, 0% mention rate - problem is content discovery not query targeting

**Add: AI discoverability infrastructure** (ff4c88c)
- Updated `app/robots.ts` with explicit AI crawler permissions (GPTBot, ClaudeBot, PerplexityBot, etc.)
- Created `public/llms.txt` - AI instruction file explaining Context Memo's purpose
- Updated `app/sitemap.ts` - Dynamic sitemap including all published memos
- Created `docs/10X_CITATIONS_STRATEGY.md` - Strategic analysis document

**Verified live:**
- https://contextmemo.com/robots.txt - AI crawlers explicitly allowed to /memo/
- https://contextmemo.com/sitemap.xml - Includes all 6 Checkit memos
- https://contextmemo.com/llms.txt - AI assistant instructions

**Files changed:**
- `app/robots.ts` - AI crawler permissions
- `app/sitemap.ts` - Dynamic sitemap with memo pages
- `public/llms.txt` - AI assistant instructions
- `docs/10X_CITATIONS_STRATEGY.md` - Strategic analysis

**Database changes (Checkit brand):**
- Deactivated 7 wrong competitors (project management tools)
- Added 7 correct competitors (temperature monitoring/compliance)
- Deactivated 72 wrong queries
- Added 33 relevant queries

---

### February 5, 2026

**Fix: Build failure - TypeScript and Next.js 16 migration** (d478d74)
- Added missing `details` property to `PromptHistoryEntry` interface in activity-detail.tsx
- Migrated from deprecated `middleware.ts` to `proxy.ts` for Next.js 16 compatibility
- Renamed export function from `middleware()` to `proxy()`

**Files changed:**
- `components/dashboard/activity-detail.tsx` - Added details property to interface
- `middleware.ts` → `proxy.ts` - Renamed file and export function

---

### February 3, 2026

**Build: V2 Feed-Based UI Overhaul**
- Created entirely new `/v2` routes with feed-based dashboard
- Implemented real-time feed system with Supabase Realtime subscriptions
- 5 workflow classifications: Core Discovery, Network Expansion, Competitive Response, Verification, Greenspace
- New dark sidebar with brand switcher and workflow filtering
- Usage bar with credits consumption tracking and visual progress
- Feed items with actions, severity levels, and cost badges
- Brand-specific settings page for workflow automation controls
- Historical data backfill from existing alerts/scans/memos

**Database migrations applied:**
- `feed_events` table with workflow/event type classification, realtime enabled
- `brand_settings` table for per-brand workflow toggles
- `usage_events` expanded with workflow and credits_used columns

**Files created/modified:**
- `app/v2/layout.tsx` - V2 layout with sidebar and usage bar
- `app/v2/page.tsx` - Unified dashboard with cross-brand feed
- `app/v2/brands/[brandId]/page.tsx` - Brand-specific feed
- `app/v2/brands/[brandId]/settings/page.tsx` - Workflow settings
- `app/api/v2/feed/route.ts` - Feed API with pagination and filtering
- `app/api/v2/usage/route.ts` - Usage summary API
- `components/v2/layout/*` - UsageBar, BrandSwitcher, V2Sidebar
- `components/v2/feed/*` - FeedContainer, FeedItem, FeedFilters, FeedEmpty
- `components/v2/actions/cost-badge.tsx` - Credit cost indicator
- `lib/feed/types.ts` - All TypeScript types for feed system
- `lib/feed/emit.ts` - Helper functions for Inngest to emit feed events
- Updated Inngest functions: scan-run, memo-generate, citation-verify, competitor-content

**New UI components added:**
- `components/ui/switch.tsx`
- `components/ui/select.tsx`
- `components/ui/command.tsx`
- `components/ui/popover.tsx`

**Feed data populated:**
- 167 feed events backfilled from existing data
- All 4 brands have settings configured
- Realtime enabled for live feed updates

---

### February 2, 2026

**Fix: Inngest step.run type serialization** (15601b1)
- Cast validatedCompetitors to restore type info lost during Inngest JSON serialization

**Fix: Remove unsupported maxTokens from generateText** (cce4ce7)
- Vercel AI SDK with OpenRouter doesn't support maxTokens in CallSettings

**Fix: rss-parser types with proper generics** (a4c89c0)
- Defined `CustomFeed` and `CustomItem` types for Parser generic parameters
- Properly typed all custom RSS fields (contentEncoded, creator, author, etc.)
- Root cause fix replacing previous workarounds

**Fix: TypeScript build error in analytics route** (16876b7)
- Fixed `Object.entries()` type assertion in memo analytics API
- Cast entries result to preserve value types, resolving spread type error

**Improve: Competitor discovery accuracy and context** (c962a82)
- Enhanced AI prompt with more context (domain, features, homepage mentions)
- Added confidence scoring (high/medium) and competition type (direct/partial)
- System now learns from user corrections - won't re-suggest deleted competitors
- Domain validation to filter invalid suggestions
- UI shows confidence indicators and reasoning for each competitor

**Files changed:**
- `lib/ai/prompts/context-extraction.ts` - Completely rewritten competitor discovery prompt
- `lib/inngest/functions/competitor-discover.ts` - Added validation, learning, metadata
- `components/dashboard/competitor-list.tsx` - Added confidence indicators and descriptions

---

**Fix: Activity feed brand filter and competitor management** (fc29713)
- Activity feed now auto-filters to current brand when viewing a brand page
- Added delete functionality for competitors (to remove incorrect ones)
- Added "Re-discover" button to re-run AI competitor discovery
- Updated activity feed description text to show which brand is being filtered

**Files changed:**
- `components/dashboard/activity-feed.tsx` - Added URL-based brand detection and auto-filtering
- `components/dashboard/competitor-list.tsx` - Added delete and re-discover functionality
