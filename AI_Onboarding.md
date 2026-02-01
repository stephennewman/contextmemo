# Context Memo - AI Onboarding Document

## Project Overview

**Product:** Context Memo - A platform that creates factual reference memos about brands, ensuring AI search engines have accurate, citable information to recommend them.

**Tagline:** "The facts AI needs to recommend you"

**Status:** MVP Complete - Ready for testing

---

## Tech Stack

| Component | Technology | Status |
|-----------|------------|--------|
| Frontend | Next.js 16.1.6 + React 19 + Tailwind CSS 4 | ✅ Complete |
| UI Components | shadcn/ui | ✅ Complete |
| Database | Supabase (Postgres) - Project ID: ncrclfpiremxmqpvmavx | ✅ Complete |
| Auth | Supabase Auth with email verification + domain verification | ✅ Complete |
| Job Queue | Inngest | ✅ Complete |
| AI Providers | OpenAI + Anthropic + OpenRouter (Gemini, Llama, Mistral, Perplexity) | ✅ Complete |
| Web Scraping | Jina Reader API | ✅ Complete |
| Hosting | Vercel | ✅ Pushed to GitHub (awaiting Vercel connection) |
| Payments | Stripe | ⏳ Not configured (post-MVP) |

---

## Current State

### Completed Features
- Landing page with product explanation and pricing
- User authentication (signup/login with work email + email verification)
- Email verification flow with confirmation emails
- Brand creation with email domain verification
- Dashboard with visibility scores
- Brand detail page with stats and tabs
- Settings page for brand management

### Background Jobs (Inngest)

**Core Workflow:**
- `context/extract` - Crawls website, extracts brand context using Jina + GPT-4 (now stores raw homepage content)
- `competitor/discover` - Identifies competitors using AI
- `query/generate` - Generates search queries (high-intent buyer queries + intent-based queries from homepage)
- `scan/run` - Queries OpenAI and Anthropic to check brand mentions (supports `autoGenerateMemos` flag)
- `memo/generate` - Creates factual memos (comparison, industry, how-to, alternative) → auto-triggers backlinking
- `discovery/scan` - Tests 50+ query variations to find WHERE the brand IS being mentioned (baseline discovery)

**Backlinking Automation:**
- `memo/backlink` - Injects contextual internal links into a single memo + adds "Related Reading" section
- `memo/batch-backlink` - Updates all memos for a brand (triggered after new memo creation)
- `dailyBacklinkRefresh` - Runs at 7 AM UTC, refreshes backlinks for brands with new content in last 24 hours

**Competitor Content Intelligence (NEW):**
- `competitor/content-scan` - Daily scan of competitor blogs/RSS for new content
- `competitor/content-classify` - AI classifies content type and filters (skips press releases, feature announcements, company news)
- `competitor/content-respond` - Generates response content with brand's tone/context and auto-publishes

**Daily Automation (runs at 6 AM ET):**
- `daily/run` - **Main scheduler** - Analyzes all brands and triggers appropriate workflows:
  - **Full Refresh** (weekly): Brands with stale context → context/extract → competitor/discover → query/generate → scan/run
  - **Update** (weekly): Brands needing new competitors/queries → competitor/discover → query/generate → scan/run  
  - **Scan Only** (daily): Up-to-date brands → scan/run with auto memo generation
  - **Content Intelligence** (daily): Scans competitor sites → classifies → auto-generates response articles
- `daily/brand-full-refresh` - Complete re-extraction and discovery pipeline
- `daily/brand-update` - Weekly competitor/query refresh
- `daily/brand-scan` - Daily visibility scan + auto memo generation

**Automation Schedule:**
| Task | Frequency | Trigger Condition |
|------|-----------|-------------------|
| Context refresh | Weekly | Context older than 7 days |
| Competitor discovery | Weekly | No new competitors in 7 days |
| Query generation | Weekly | No new queries in 7 days |
| Visibility scan | Daily | No scan in 24 hours |
| Memo generation | On-demand | Gaps detected in scans |
| Competitor content scan | Daily | Part of daily run |
| Response content generation | Daily | New educational/industry content from competitors |

### API Routes
- `/api/inngest` - Inngest webhook endpoint
- `/api/brands/[brandId]/actions` - Trigger background jobs
- `/auth/callback` - Handle email verification links from Supabase

### Public Memo Pages
- `/memo/[subdomain]/` - Brand memo index
- `/memo/[subdomain]/[...slug]` - Individual memo pages

---

## Database Schema

Tables created in Supabase:
- `tenants` - User accounts
- `brands` - Brand profiles with context
- `competitors` - Discovered competitors
- `competitor_content` - Tracked competitor articles (NEW)
- `queries` - Search queries to monitor
- `scan_results` - AI scan results
- `memos` - Generated context memos (now includes `source_competitor_content_id` for response memos)
- `memo_versions` - Version history
- `alerts` - User notifications

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=https://ncrclfpiremxmqpvmavx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[set]
SUPABASE_SERVICE_ROLE_KEY=[required for background jobs]
OPENAI_API_KEY=[required]
ANTHROPIC_API_KEY=[required]
INNGEST_SIGNING_KEY=[required for production]
INNGEST_EVENT_KEY=[required for production]
```

---

## Activity Log

| Date | Activity | Details |
|------|----------|---------|
| Feb 1, 2026 | **Bing Webmaster Integration** | Search console integration showing which Bing queries drive traffic to memos. New settings panel for API key, Inngest sync function (`bing/sync`, `bing-weekly-sync`), Search tab on brand page with query correlation and opportunities. New table: `search_console_stats`. |
| Feb 1, 2026 | **Competitive Intelligence Dashboard** | New share-of-voice analysis showing which competitors win queries vs brand. Tracks wins/ties/losses across all scans. Shows "queries to improve" where competitors beat brand. Visual progress bars for share of voice. |
| Feb 1, 2026 | **Competitor Content Intelligence** | Daily scan of competitor blogs/content, AI classification (filters press releases, feature announcements), auto-generates response articles with brand's tone, auto-publishes to resources page. New `competitor_content` table, `memo_type: 'response'`. |
| Feb 1, 2026 | **Persona-based prompt system** | Renamed queries → prompts throughout UI. Added 6 persona types (B2B Marketer, Developer, Product Leader, Enterprise Buyer, SMB Owner, Student). **Personas now extracted from brand website analysis** - context extraction identifies target personas based on signals (API docs = developer, SOC 2 = enterprise, etc.). Prompts generated only for brand's relevant personas. |
| Feb 1, 2026 | **OpenRouter multi-model scanning** | Expanded AI model coverage via OpenRouter: GPT-4o, Claude, Gemini 2.0 Flash, Llama 3.1 70B, Mistral Large, Perplexity Sonar. Visibility chart updated to show all 6 models. |
| Feb 1, 2026 | **External credibility signals** | Added `/about/editorial` guidelines page, `/ai.txt` for AI crawler permissions, enhanced Schema.org with `sameAs` links to LinkedIn/Crunchbase/Wikipedia, social_links support in BrandContext. |
| Feb 1, 2026 | **Automated backlinking system** | New continuous backlinking: auto-runs after memo generation, daily refresh at 7 AM UTC, injects contextual links + "Related Reading" section. Functions: `memo/backlink`, `memo/batch-backlink`, `dailyBacklinkRefresh`. |
| Jan 31, 2026 | **High-intent query generation + Discovery scan** | Added intent-based query generation from homepage content, filtering for buyer signals. New Discovery Scan feature tests 50+ query variations to find where brand IS being mentioned. |
| Jan 31, 2026 | **Subdomain link fix** | Fixed link generation to use relative paths on subdomain access, preventing double-rewrite 404 errors |
| Jan 31, 2026 | **Subdomain routing fix** | Improved middleware to check x-forwarded-host for Vercel, better subdomain detection. Requires Vercel wildcard domain config (`*.contextmemo.com`) |
| Jan 31, 2026 | **Deployed to GitHub** | Complete MVP with daily automation pushed to production |
| Jan 31, 2026 | **Comprehensive Daily Automation** | Smart scheduling: weekly context refresh, competitor discovery, query generation; daily scans; auto memo generation for gaps; visibility trend tracking |
| Jan 31, 2026 | Brand Tone feature added | Comprehensive brand tone system for memo generation - personality, formality, technical level, audience type, writing style, jargon usage, custom notes |
| Jan 31, 2026 | Project initialized | Fresh Next.js 16 + React 19 + Tailwind CSS 4 setup |
| Jan 31, 2026 | Supabase project created | Project ID: ncrclfpiremxmqpvmavx, Region: us-east-1 |
| Jan 31, 2026 | Database schema applied | Created all tables with RLS policies |
| Jan 31, 2026 | Auth system built | Signup/login with work email domain verification |
| Jan 31, 2026 | Dashboard created | Brand cards with visibility scores, stats |
| Jan 31, 2026 | Inngest jobs implemented | Context extraction, competitor discovery, query generation, scanning, memo generation |
| Jan 31, 2026 | Public memo pages | Subdomain-based routing with markdown rendering |
| Jan 31, 2026 | Landing page | Modern landing page with pricing and features |
| Jan 31, 2026 | MVP build successful | All TypeScript compiles, ready for deployment |
| Jan 31, 2026 | Email verification implemented | Added email confirmation flow: auth callback, verify-email page, middleware enforcement |

---

## Problems & Opportunities

### Current Problems (Post-MVP)
| Problem | Score | Description |
|---------|-------|-------------|
| No Stripe integration | 75 | Cannot collect payments - needed before public launch |
| ~~DB migration: search_console_stats~~ | ~~75~~ | ✅ APPLIED - Table created with indexes |
| ~~DB migration needed: persona column~~ | ~~70~~ | ✅ APPLIED - `persona TEXT` column added to queries table |
| Missing SUPABASE_SERVICE_ROLE_KEY | 70 | Background jobs need this key for admin access |
| No Inngest production keys | 65 | Need to configure Inngest for production |
| ~~No email confirmation~~ | ~~50~~ | ✅ RESOLVED - Email verification now required |

**search_console_stats table migration (run in Supabase SQL editor):**
```sql
create table search_console_stats (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid references brands(id) on delete cascade,
  provider text not null,
  query text not null,
  page_url text,
  impressions integer default 0,
  clicks integer default 0,
  position decimal,
  ctr decimal,
  date date not null,
  synced_at timestamptz default now(),
  unique(brand_id, provider, query, date)
);

create index idx_search_stats_brand on search_console_stats(brand_id, date desc);
create index idx_search_stats_query on search_console_stats(query);
```

### High-Value Opportunities
| Opportunity | Score | Description |
|-------------|-------|-------------|
| **Search Console Integrations** | 90 | Upstream signal for AI visibility. Bing (ChatGPT) + Google (AI Overviews). See API docs below. |
| Vercel deployment | 90 | Deploy to production with custom domain |
| Add Google Gemini scanning | 75 | Third AI model for more comprehensive coverage |
| ~~Scheduled scans~~ | ~~70~~ | ✅ IMPLEMENTED - Daily automation at 6 AM ET |
| Email notifications | 65 | Alert users when visibility changes |
| Memo templates | 60 | More memo types (best-of, what-is) |

### Search Console API Integrations (Documented Feb 1, 2026)

**Why it matters:** 
- ChatGPT uses **Bing** for real-time RAG → Bing Webmaster data shows discoverability
- Google AI Overviews uses **Google** → GSC data shows discoverability
- Both show which queries a brand's memo pages appear for in search - the **upstream signal** for AI visibility

---

#### Bing Webmaster API

**Endpoint:**
```
POST https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?siteUrl=URL&apikey=KEY
```

**Response:** Query, Impressions, Clicks, AvgImpressionPosition, Date

**Authentication:** Simple API key from Bing Webmaster Tools > Settings > API Access

**Limitations:**
- No date range filtering (returns all data every time)
- Weekly buckets only (Saturdays)
- One API key per user (works for all verified sites)

---

#### Google Search Console API

**Endpoint:**
```
POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query

Body: {
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "dimensions": ["query", "page", "date"],
  "rowLimit": 1000
}
```

**Response:** For each row: keys[], clicks, impressions, ctr, position

**Authentication:** OAuth 2.0 (more complex)
- Requires Google Cloud project
- OAuth consent screen setup
- Service account or user authorization flow
- Scopes: `webmasters.readonly` or `webmasters`

**Advantages over Bing:**
- Date range filtering
- More granular dimensions (country, device, searchAppearance)
- Larger data limits (25k rows per request)
- Filter by specific pages (memo URLs)

---

#### Combined Implementation Plan

**Database:**
```sql
create table search_console_stats (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid references brands(id),
  provider text not null,  -- 'bing' or 'google'
  query text not null,
  page_url text,
  impressions integer,
  clicks integer,
  position decimal,
  ctr decimal,
  date date not null,
  synced_at timestamptz default now()
);

create index idx_search_stats_brand on search_console_stats(brand_id, date desc);
```

**Brand Settings Extension:**
```typescript
interface SearchConsoleConfig {
  bing?: {
    api_key: string
    enabled: boolean
  }
  google?: {
    refresh_token: string  // From OAuth flow
    enabled: boolean
  }
}
```

**Inngest Functions:**
1. `search-console/sync-bing` - Weekly sync from Bing
2. `search-console/sync-google` - Weekly sync from GSC
3. `search-console/correlate` - Map search queries to generated prompts

**Dashboard Display:**
- Show "Search Visibility" alongside "AI Visibility"
- Correlation: "Queries where you rank in search but aren't mentioned by AI" = opportunities
- Correlation: "Queries where AI mentions you but you don't rank" = memos working

**Priority:** Bing first (simpler auth), Google second (richer data)

---

## Next Steps

1. Add SUPABASE_SERVICE_ROLE_KEY to .env.local
2. Add OPENAI_API_KEY and ANTHROPIC_API_KEY
3. Set up Inngest production account
4. Deploy to Vercel
5. Configure custom domain (contextmemo.com)
6. Add Stripe billing (Phase 2)
