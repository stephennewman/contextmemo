# Context Memo - Project Documentation

> **Last Updated:** February 1, 2026  
> **Version:** 0.8.0  
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
| AI Providers | OpenAI, Anthropic, OpenRouter | GPT-4o, Claude, Gemini, Llama, Mistral, Perplexity |
| Web Scraping | Jina Reader API | - |
| Hosting | Vercel | Connected to GitHub main |
| Payments | Stripe | ⏳ Planned |

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
- **6 AI models scanned**: GPT-4o, Claude, Gemini 2.0 Flash, Llama 3.1 70B, Mistral Large, Perplexity Sonar
- Visibility score tracking over time
- Win/tie/loss analysis vs competitors

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
| `competitor/content-scan` | Daily scan of competitor blogs/RSS |
| `competitor/content-classify` | AI classifies and filters content |
| `competitor/content-respond` | Generates response content |
| `google-search-console/sync` | Syncs GSC data weekly |
| `bing/sync` | Syncs Bing Webmaster data weekly |
| `daily/run` | Main scheduler (6 AM ET) |

### Automation Schedule

| Task | Frequency | Trigger |
|------|-----------|---------|
| Context refresh | Weekly | Context older than 7 days |
| Competitor discovery | Weekly | No new competitors in 7 days |
| Query generation | Weekly | No new queries in 7 days |
| Visibility scan | Daily | No scan in 24 hours |
| Memo generation | On-demand | Gaps detected in scans |
| Competitor content scan | Daily | Part of daily run |
| Search console sync | Weekly | Sundays 9 AM UTC |

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/inngest` | Inngest webhook endpoint |
| `/api/brands/[brandId]/actions` | Trigger background jobs |
| `/api/auth/google-search-console/*` | GSC OAuth flow |
| `/auth/callback` | Email verification links |

### Database Schema

| Table | Description |
|-------|-------------|
| `tenants` | User accounts |
| `brands` | Brand profiles with context |
| `competitors` | Discovered competitors |
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
- [x] Multi-model AI scanning (6 models)
- [x] Automated memo generation
- [x] Competitive intelligence dashboard
- [x] Search console integrations (Bing + Google)
- [x] Competitor content intelligence
- [x] Persona-based targeting
- [x] Daily automation pipeline
- [x] Vercel deployment

### In Progress 🔄
- [ ] Production environment variables setup
- [ ] Custom domain configuration (contextmemo.com)

### Planned 📋
- [ ] Stripe billing integration
- [ ] Email notifications for visibility changes
- [ ] Additional memo templates (best-of, what-is)
- [ ] Team/organization features

---

## Problems & Opportunities

### Active Issues

| Issue | Priority | Status |
|-------|----------|--------|
| Stripe not configured | High | Blocks monetization |
| Production Inngest keys needed | High | For production jobs |
| Service role key needed | High | For background jobs |

### Opportunities (Scored 0-100)

| Opportunity | Score | Impact |
|-------------|-------|--------|
| Stripe billing | 95 | Revenue enablement |
| Email notifications | 70 | User engagement |
| Team features | 65 | Enterprise expansion |
| More memo types | 60 | Content depth |
| API access for brands | 55 | Developer market |

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

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history and deployment notes.

---

## Contributing

1. Create feature branch from `main`
2. Make changes
3. Test locally with `npm run dev`
4. Test Inngest jobs with `npm run dev:inngest`
5. Deploy: `git add . && git commit -m "message" && git push`
6. Vercel auto-deploys from main branch
