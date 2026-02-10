# Changelog

All notable changes to Context Memo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Citations Tab Overhaul** - Major upgrade to the Citations page
  - Citation count now shows in the tab label (e.g., `CITATIONS (47)`)
  - New **My Content** view showing which of your memos are being cited by AI models, citation counts, and which prompts cite them
  - Brand domain rank callout in Domains view (e.g., "You rank #11 of 45 domains")
  - Content match indicators: "Covered" and "Gap" badges on cited URLs
  - Generate Memo CTA for top cited URLs with no matching content

### Planned
- Additional memo templates (best-of, what-is)

---

## [0.20.0] - 2026-02-06

### Added
- **Content Coverage Audit** - New COVERAGE tab on brand page that maps the complete content topic universe
  - Crawls brand's sitemap.xml to build a full inventory of existing website content
  - AI generates 40-150 specific content topics the brand needs (comparisons, alternatives, how-tos, industry guides, definitions, use cases)
  - Each topic is scored by priority (0-100) based on competitor density, content type, and funnel stage
  - Topics are matched against existing content (website pages + memos) and marked as covered/partial/gap
  - Coverage score with circular progress indicator and category breakdown
  - "Top Priority Gaps" section with stack-ranked highest-impact missing content
  - One-click "Generate" button per gap topic to create a memo
  - Batch generate top 10 gaps at once
  - Continuous monitoring: auto-adds comparison/alternative topics when new competitors are discovered in scans
- **Site Content Inventory** utility (`lib/utils/site-inventory.ts`) - Fetches sitemap.xml, batch-classifies URLs by content type, and deep-reads key pages for quality assessment
- **Topic Universe** database table and Inngest functions for generation and refresh
- **Coverage API** endpoint at `/api/brands/[brandId]/coverage`

---

## [0.19.5] - 2026-02-06

### Fixed
- **Memo Sources**: Sources section now shows real clickable URLs instead of AI-hallucinated descriptions
  - Was showing vague text like "Perplexity AI documentation and behavior analysis"
  - Now generates proper markdown links: `[Brand Name](https://brand.com) (accessed date)`
  - Fixed `{{brand_domain}}` placeholder that was never being replaced in generation code
  - Fixed ALTERNATIVE prompt `{{competitor_name}}` only replacing first occurrence
  - Database sources array now includes competitor domain for comparison/alternative memos

---

## [0.19.4] - 2026-02-06

### Added
- **Daily Digest Email**: Automated daily visibility summary sent via Resend at 9 AM ET
  - Per-brand visibility score with delta vs yesterday
  - Scan count, mention rate, citation rate
  - New citations won and citations lost
  - Memos generated/published count
  - Competitor content detected
  - Top competitors by mention frequency
  - Prompt coverage bar (X of Y prompts citing your brand)
  - Streak milestones (queries with 5+ day citation streaks)
  - Skips tenants with no activity (no spam on quiet days)
  - Clean, responsive HTML email template

---

## [0.19.3] - 2026-02-06

### Changed
- **Memo-First Branding**: Rebranded all "content" references to "memos" across the product UI
  - Landing page: "Content Intelligence" → "Competitive Watch", "Auto-Generate Content" → "Generate Memos", "Popular Content" → "Featured Memos"
  - New trust section: "Not Another Blog Post" — positioning memos as structured, brand-verified, built for AI
  - Settings: "Content Settings" → "Memo Settings" with updated descriptions
  - Updated copy across activity detail, memo editor, competitor list, entity list, and brand actions
  - Left "competitor content" references untouched (refers to their blog posts, not our memos)

---

## [0.19.2] - 2026-02-06

### Added
- **Popular Content Section on Homepage**: New section showcasing featured memos to drive traffic to top content
  - Displays up to 6 featured memos with type badges, titles, and descriptions
  - "View All Content" button links to `/memos` index
  - Curated via `featured` boolean column on memos table
  - `sort_order` column controls display order

### Changed
- Database: Added `featured` (boolean) and `sort_order` (integer) columns to memos table

---

## [0.19.1] - 2026-02-05

### Fixed
- **Subdomain Memo Pages 404**: Fixed all memo pages returning 404 on brand subdomains (e.g., `checkitnet.contextmemo.com/how/...`)
  - Root cause: Supabase query had invalid relational join (`reviewed_by:reviewed_by(...)`) that failed silently
  - Also fixed metadata query missing `brand_id` filter
  - All memo URLs now resolve correctly via subdomain routing

---

## [0.19.0] - 2026-02-05

### Added
- **Public Content Routes for Context Memo Brand**: SEO-optimized URL structure for publishing memos on contextmemo.com
  - `/compare/[slug]` - Comparison memos (vs competitors)
  - `/alternatives/[slug]` - Alternative memos (alternatives to X)
  - `/guides/[slug]` - How-to guides and tutorials
  - `/tools/[slug]` - Tools, resources, and best-of lists
  - `/for/[slug]` - Industry-specific content
  - Index pages for each content type with memo listings
  - Backwards compatible with existing slug formats

- **Shared Memo Rendering Utility**: `lib/memo/render.tsx`
  - Reusable memo page component
  - Markdown processing and HTML rendering
  - AI-optimized Schema.org structured data
  - Review status badges and provenance tracking

---

## [0.18.0] - 2026-02-05

### Added
- **Corporate Positioning Framework**: Comprehensive 32-field strategic messaging framework
  - 8 sections: Mission & Vision, Target Markets, Value Proposition, Key Differentiators, Messaging Pillars, Elevator Pitches, Objection Handling, Competitive Stance
  - Inline edit capability for each section with save/cancel
  - Progress tracking showing completion percentage
  - Collapsible sections for easy navigation

- **Corporate Positioning API**: New endpoint `/api/brands/[brandId]/corporate-positioning`
  - PATCH for section-level updates
  - PUT for full positioning replacement
  - GET for retrieving positioning data

- **Retroactive Data Population**: All existing brands now have corporate positioning data
  - AI-generated positioning based on website content and web research
  - Includes mission statements, buyer personas, differentiators, pitches, and competitive intelligence

---

## [0.17.0] - 2026-02-04

### Added
- **QFO (Query Fan-Out) Tab**: New tab to analyze how LLMs expand prompts
  - Generate 6-8 fan-out sub-queries from any prompt using AI
  - Scan each sub-query with Perplexity to check brand coverage
  - Visual coverage summary (cited/mentioned/gaps/competitor wins)
  - One-click content cluster generation for gap queries
  - Based on the QFO SEO strategy for AI visibility
  
- **MAP (Entity Discovery) Tab**: Interactive ReactFlow visualization
  - Radial graph with your brand at center
  - Entities discovered from AI scan results (competitors_mentioned, citations)
  - Color-coded by type: Competitor (red), Resource (green), Aggregator (amber), Publisher (purple)
  - Node size reflects mention frequency
  - Animated edges highlight competitor wins (they're cited, you're not)
  - Click entities for detailed stats and analysis actions
  - Mini-map for navigation
  - Stats summary row

- **New API Endpoints**:
  - `/api/brands/[brandId]/qfo` - Generate fan-out queries, scan coverage, generate clusters
  - `/api/brands/[brandId]/entities` - Extract and classify entities from scan results

### Dependencies
- Added `@xyflow/react` (ReactFlow v12) for interactive graph visualization

---

## [0.16.0] - 2026-02-04

### Added
- **HubSpot Landing Page**: New `/hubspot` page for marketing to HubSpot users
  - Focused value proposition: "Fill the gaps in your content strategy"
  - 4-step workflow visualization with product screenshots
  - Consumption-based pricing calculator with interactive sliders
  - Beta signup with 50% discount offer

---

## [0.13.0] - 2026-02-02

### Added
- **RSS Feed Monitoring**: Proper RSS/Atom feed parsing with `rss-parser` library
  - Auto-discovers feeds from competitor sites via common paths + HTML autodiscovery
  - Persistent `competitor_feeds` table tracks discovered and manual feeds
  - Feed health monitoring (last success, failures, errors)
- **Historical Content Backfill**: One-click button to import up to 2 years of competitor content
- **Manual Feed Management**: Add custom RSS/Atom URLs per competitor in the UI
- **Enhanced Content Tracking**: Published date, author, word count stored for all competitor articles
- **Improved Response Generation**: New prompt creates unique, differentiated, LONGER content (1000-1500 words)
  - Emphasizes deeper analysis, unique angles, actionable frameworks
  - Uses full competitor content for better differentiation
  - Creates more specific, compelling titles

### Changed
- Competitor content scan now uses proper RSS parser instead of regex
- Response memos target 1000-1500 words (up from 600-900)
- Feeds are discovered once and persisted for efficient re-scans

---

## [0.12.0] - 2026-02-02

### Added
- **Automated memo generation with daily caps**: System now enforces `memos_per_month / 30` daily limit
- **Competitor-linked queries**: Query generation now creates proper `alternative` and `versus` queries with competitor IDs linked
- **sanitizeSlug helper**: Removes special characters (?!., etc.) from memo URLs
- **Live page links**: Published memos now show clickable links to live pages with external link icon
- **Full URL display**: Dashboard shows `subdomain.contextmemo.com/slug` instead of just `/slug`

### Changed
- Query generation prompt now requires 5-8 alternative + 5-8 versus queries with competitor names
- Memo generation now handles `persona_based`, `problem_solution`, `best_of` query types
- Improved memo template styling with better typography, spacing, and visual hierarchy
- Scan-run orders gap queries by priority (high-value first)

### Fixed
- Memos no longer generate with trailing `?` in URLs
- Query types `persona_based` and `problem_solution` now trigger memo generation (previously ignored)
- `best_of` queries now properly map to industry memos

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
- **Actionable Visibility Gaps**: Scan results now show each "gap" prompt with actions
  - See exactly which prompts have 0% visibility
  - "Generate Memo" button to create content for that prompt
  - "Edit Prompt" button to refine the prompt text
  - "Disable Prompt" button to exclude irrelevant prompts
  - Shows visibility %, prompt type, and persona for each gap
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
| 0.13.0 | Feb 2, 2026 | RSS feed monitoring, content backfill, improved response generation |
| 0.12.0 | Feb 2, 2026 | Auto memo generation with daily caps, competitor-linked queries |
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
