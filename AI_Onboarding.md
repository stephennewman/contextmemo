# Context Memo - Project Documentation

> **Last Updated:** February 5, 2026  
> **Version:** 0.19.0  
> **Status:** MVP Complete + V2 Feed UI + Usage Tracking & Billing + Corporate Positioning Framework + Public Content Routes

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

### API Routes

| Route | Purpose |
|-------|---------|
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

### February 5, 2026

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
