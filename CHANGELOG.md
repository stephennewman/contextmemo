# Changelog

All notable changes to Context Memo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Email notifications for visibility changes
- Additional memo templates (best-of, what-is)

---

## [0.11.0] - 2026-02-01

### Added
- **Activity Feed**: Collapsible sidebar showing all platform activity in real-time
  - Aggregates activity from scans, memos, competitor discoveries, queries, AI traffic
  - Timestamped entries with links to relevant pages
  - Filter by category (Scans, Content, Discovery, Traffic, System)
  - Filter by brand (for multi-brand users)
  - Saved views - save filter combinations for quick access
  - Activity icon button in header to open feed
- **Activity Detail View**: Click any activity to see full context
  - "What This Means" explanations for each activity type
  - "Why It Matters" business context
  - "Next Steps" action guidance
  - Shows actual data: generated prompts, scan results, memo content
  - Explains prompt types: persona-based, intent-based, category-based
- New API endpoints: `/api/activity`, `/api/activity/views`, `/api/activity/detail`
- Activity types and utility logging functions for future Inngest integration
- SQL migration for `activity_log` and `activity_saved_views` tables

### Changed
- Refactored dashboard header into client component for activity feed integration

### Fixed
- **Failed memo detection**: Memos now validate AI responses and reject error messages
- **Regenerate button**: Added to memo edit page to fix broken memos
- **Warning banner**: Shows when memo content looks like an AI error with action buttons

---

## [0.10.1] - 2026-02-01

### Fixed
- TypeScript type errors for AI providers in scan-run.ts (OpenAIProvider vs LanguageModelV3)
- Stripe client proxy type casting for strict TypeScript checking

---

## [0.10.0] - 2026-02-01

### Added
- **Google AI Overviews Integration**: Check brand visibility in Google's AI-generated summaries
  - Manual trigger button in dashboard header
  - Automated weekly scans (Mon + Thu) via SerpAPI
  - Detects brand mentions, organic rankings, and source citations
- **AI Traffic Attribution**: Track visits from AI platforms (ChatGPT, Perplexity, Claude, Gemini, etc.)
  - Auto-tracking on memo pages
  - Dashboard view with source breakdown and top pages
  - Embed code for external website tracking
- **Data Export**: CSV and JSON exports for scans, prompts, memos, competitors, visibility history
- **Multi-seat Teams Foundation**: Organizations with roles (owner, admin, member, viewer)
  - Invite flow with email tokens
  - Team management UI
- **Stripe Billing Foundation**: Checkout, customer portal, webhooks, plan definitions
  - Starter, Growth, Enterprise tiers
  - Usage tracking foundation
- **3 New AI Models**: DeepSeek V3, Qwen 2.5 72B, Grok 2 (9 total models now)

### Changed
- Upgraded to 9-model AI scanning coverage
- Weekly automation now includes AI Overview scans (quota-conscious: Mon + Thu only)

---

## [0.9.0] - 2026-02-01

### Added
- **Terminal-style onboarding experience**: New brands see an engaging step-by-step setup with live terminal output
  - Real-time progress messages showing what's happening ("Connecting to Jina Reader API...", "Analyzing products...", etc.)
  - Dark terminal UI with timestamps and blinking cursor
  - Polls backend for actual completion, shows summary when done
  - Auto-refreshes to proceed to next step
- **Cleaner onboarding flow**: Step-by-step card with progress indicators instead of confusing multiple buttons
- **Status check API**: New `check_status` action for polling onboarding progress

### Changed
- **Removed confusing buttons**: Simplified header by removing "Discovery Scan" button during onboarding
- **Metrics only show after scans**: No more fake 0% visibility scores for new brands
- **"Ready to scan" prompt**: After onboarding completes, shows clear prompt to run first scan instead of empty metrics

### Fixed
- New brands no longer see meaningless metrics before any scans have run

---

## [0.8.0] - 2026-02-01

### Added
- **Google Search Console Integration**: Full OAuth 2.0 flow for connecting GSC accounts
  - Connect button in brand settings
  - Automatic token refresh handling
  - Weekly auto-sync (Sundays 9 AM UTC)
  - Shows Google AI Overviews pathway data
- **Loading skeleton UIs**: Layout-matching skeleton loaders for all dashboard pages
- **Instant click feedback**: Button press animation (`active:scale-[0.97]`)

### Changed
- Improved loading states across dashboard, brand page, settings, and auth pages

---

## [0.7.0] - 2026-02-01

### Added
- **Bing Webmaster Integration**: Search console showing which Bing queries drive traffic
  - Settings panel for API key configuration
  - Weekly auto-sync (Sundays 9 AM UTC)
  - Query correlation with AI prompts
  - "Opportunities" section for queries to target
- New `search_console_stats` database table

---

## [0.6.0] - 2026-02-01

### Added
- **Competitive Intelligence Dashboard**
  - Share-of-voice analysis across all scans
  - Win/tie/loss tracking vs competitors per query
  - "Queries to improve" section (where competitors beat brand)
  - Visual progress bars for share of voice metrics

---

## [0.5.0] - 2026-02-01

### Added
- **Competitor Content Intelligence**
  - Daily scan of competitor blogs/content
  - AI classification (filters press releases, feature announcements)
  - Auto-generates response articles with brand's tone
  - Auto-publishes to resources page
- New `competitor_content` table
- New memo type: `response`

---

## [0.4.0] - 2026-02-01

### Added
- **Persona-based Prompt System**
  - 6 persona types: B2B Marketer, Developer, Product Leader, Enterprise Buyer, SMB Owner, Student
  - Personas auto-extracted from brand website analysis
  - Prompts generated only for brand's relevant personas
- **OpenRouter Multi-model Scanning**
  - GPT-4o, Claude, Gemini 2.0 Flash, Llama 3.1 70B, Mistral Large, Perplexity Sonar
  - Visibility chart updated to show all 6 models

### Changed
- Renamed "queries" to "prompts" throughout UI

---

## [0.3.0] - 2026-02-01

### Added
- **External Credibility Signals**
  - `/about/editorial` guidelines page
  - `/ai.txt` for AI crawler permissions
  - Enhanced Schema.org with `sameAs` links (LinkedIn, Crunchbase, Wikipedia)
  - Social links support in BrandContext
- **Automated Backlinking System**
  - Auto-runs after memo generation
  - Daily refresh at 7 AM UTC
  - Injects contextual links + "Related Reading" section

---

## [0.2.0] - 2026-01-31

### Added
- **High-intent Query Generation**: Intent-based queries from homepage content with buyer signal filtering
- **Discovery Scan**: Tests 50+ query variations to find where brand IS being mentioned
- **Brand Tone System**: Comprehensive tone controls for memo generation
  - Personality, formality, technical level
  - Audience type, writing style, jargon usage

### Fixed
- Subdomain link generation (relative paths for subdomain access)
- Subdomain routing for Vercel production (x-forwarded-host support)

---

## [0.1.0] - 2026-01-31

### Added
- **Initial MVP Release**
- Landing page with product explanation and early adopter pricing
- User authentication (signup/login with work email + email verification)
- Email verification flow with confirmation emails
- Brand creation with email domain verification
- Dashboard with visibility scores
- Brand detail page with stats and tabs
- Settings page for brand management

### Background Jobs
- `context/extract` - Crawls website, extracts brand context
- `competitor/discover` - Identifies competitors using AI
- `query/generate` - Generates search queries
- `scan/run` - Queries AI models to check brand mentions
- `memo/generate` - Creates factual memos (comparison, industry, how-to, alternative)
- `discovery/scan` - Tests query variations for baseline discovery
- `daily/run` - Main scheduler for all automation

### Public Pages
- `/memo/[subdomain]/` - Brand memo index
- `/memo/[subdomain]/[...slug]` - Individual memo pages

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 0.11.0 | Feb 1, 2026 | Activity feed with filters and saved views |
| 0.10.0 | Feb 1, 2026 | Google AI Overviews, AI traffic attribution, exports, teams, billing foundation |
| 0.9.0 | Feb 1, 2026 | Terminal-style onboarding |
| 0.8.0 | Feb 1, 2026 | Google Search Console, loading UIs |
| 0.7.0 | Feb 1, 2026 | Bing Webmaster integration |
| 0.6.0 | Feb 1, 2026 | Competitive intelligence dashboard |
| 0.5.0 | Feb 1, 2026 | Competitor content intelligence |
| 0.4.0 | Feb 1, 2026 | Persona system, multi-model scanning |
| 0.3.0 | Feb 1, 2026 | Credibility signals, auto-backlinking |
| 0.2.0 | Jan 31, 2026 | Discovery scan, brand tone |
| 0.1.0 | Jan 31, 2026 | Initial MVP |

---

## Deployment Notes

- **Hosting**: Vercel (connected to GitHub main branch)
- **Database**: Supabase (us-east-1)
- **Job Queue**: Inngest
- **Domain**: contextmemo.com (with wildcard *.contextmemo.com for subdomains)
