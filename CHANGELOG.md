# Changelog

All notable changes to Context Memo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Stripe billing integration
- Email notifications for visibility changes
- Additional memo templates (best-of, what-is)

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
