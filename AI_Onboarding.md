# Context Memo - Project Documentation

> **Last Updated:** February 2, 2026  
> **Version:** 0.13.0  
> **Status:** MVP Complete + Active Development

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

### February 3, 2026

**Experiment: 10X AI Citations Strategy for Checkit**

**Analysis & Fix: Checkit competitor/query configuration**
- Discovered root cause: Checkit had wrong competitors (Asana, Monday.com, Trello) instead of temperature monitoring competitors
- Fixed competitor list: ComplianceMate, SafetyCulture, Zenput, Monnit, Dickson, Therma, Controlant
- Added 33 relevant queries for temperature monitoring, food safety, HACCP compliance
- Key finding: Even with correct queries, 0% mention rate - problem is content discovery not query targeting

**Add: AI discoverability infrastructure**
- Created `public/robots.txt` with explicit AI crawler permissions (GPTBot, ClaudeBot, PerplexityBot)
- Created `public/llms.txt` - AI instruction file explaining Context Memo's purpose
- Created `app/sitemap.xml/route.ts` - Dynamic sitemap for all published memos
- Created `docs/10X_CITATIONS_STRATEGY.md` - Strategic analysis document

**Files changed:**
- `public/robots.txt` - AI crawler permissions
- `public/llms.txt` - AI assistant instructions
- `app/sitemap.xml/route.ts` - Dynamic XML sitemap
- `docs/10X_CITATIONS_STRATEGY.md` - Strategic analysis

**Database changes (Checkit brand):**
- Deactivated 7 wrong competitors (project management tools)
- Added 7 correct competitors (temperature monitoring/compliance)
- Deactivated 72 wrong queries
- Added 33 relevant queries

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
