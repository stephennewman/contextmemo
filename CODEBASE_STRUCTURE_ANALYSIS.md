# Codebase Structure Analysis

## Executive Summary

ContextMemo is a Next.js 16 application built with TypeScript that provides AI-powered brand visibility monitoring and content generation. The application uses Supabase for backend services, Inngest for job orchestration, and integrates with multiple AI providers (OpenRouter, Perplexity, OpenAI) for scanning and content generation.

**Project Type:** SaaS Platform  
**Tech Stack:** Next.js 16, TypeScript, Supabase, Inngest, Tailwind CSS  
**Primary Domain:** AI-powered brand visibility and content management

---

## 1. Project Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   App Router │  │   Components │  │     UI Kit   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Auth API   │  │  Brand API   │  │  Billing API │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Background Jobs (Inngest)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Scan Jobs   │  │ Memo Jobs    │  │  Daily Jobs  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Services                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Supabase   │  │  OpenRouter  │  │   Perplexity │  │
│  │   (Database) │  │   (AI API)   │  │   (AI API)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Stripe    │  │   SerpAPI    │  │   IndexNow   │  │
│  │  (Payments)  │  │  (Search)    │  │  (Indexing)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | Next.js | 16.1.6 | React framework with App Router |
| **Language** | TypeScript | 5.x | Type-safe development |
| **Database** | Supabase | 2.93.3 | PostgreSQL database + Auth |
| **Job Queue** | Inngest | 3.50.0 | Background job orchestration |
| **AI SDK** | Vercel AI SDK | 6.0.65 | AI model integration |
| **AI Providers** | OpenRouter, Anthropic, OpenAI | Various | AI model access |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS |
| **UI Components** | Radix UI | Various | Accessible component primitives |
| **Payments** | Stripe | 20.3.0 | Subscription billing |
| **Testing** | Vitest, Playwright | 3.0.5, 1.48.0 | Unit and E2E testing |

---

## 2. Directory Structure

### 2.1 Root Level

```
contextmemo/
├── app/                    # Next.js App Router
├── components/              # React components
├── lib/                    # Core libraries and utilities
├── public/                 # Static assets
├── scripts/                # Utility scripts
├── supabase/              # Supabase migrations
├── docs/                  # Documentation
├── test/                  # Test files
├── playwright-report/       # Playwright test reports
├── middleware.ts           # Next.js middleware
├── next.config.ts         # Next.js configuration
├── package.json           # Dependencies
├── tsconfig.json         # TypeScript configuration
└── vitest.config.ts      # Vitest configuration
```

### 2.2 App Directory Structure

```
app/
├── (auth)/                    # Auth routes group
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── verify-email/page.tsx
├── (dashboard)/              # Dashboard routes group
│   ├── layout.tsx
│   ├── dashboard/page.tsx
│   ├── brands/
│   │   ├── [brandId]/
│   │   │   ├── page.tsx
│   │   │   ├── memos/[memoId]/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── new/page.tsx
│   └── ...
├── (v2)/                    # V2 routes group
│   ├── layout.tsx
│   ├── page.tsx
│   └── brands/[brandId]/
├── api/                      # API routes
│   ├── auth/                 # Authentication endpoints
│   ├── billing/              # Stripe webhooks
│   ├── brands/               # Brand management
│   ├── inngest/              # Inngest event handler
│   ├── integrations/          # Third-party integrations
│   ├── track/                # Analytics tracking
│   └── usage/               # Usage statistics
├── memo/[subdomain]/[[...slug]]/  # Subdomain routing
├── pricing/                  # Pricing page
├── hubspot/                  # HubSpot integration
└── ...
```

### 2.3 Components Directory

```
components/
├── dashboard/                # Dashboard-specific components
│   ├── activity-feed.tsx
│   ├── alerts-list.tsx
│   ├── brand-actions.tsx
│   ├── competitor-list.tsx
│   ├── scan-progress-modal.tsx
│   └── ...
├── ui/                      # Reusable UI components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   └── ...
└── v2/                      # V2 components
    ├── feed/
    ├── layout/
    └── profile/
```

### 2.4 Library Directory

```
lib/
├── ai/                      # AI-related utilities
│   └── prompts/
│       ├── context-extraction.ts
│       └── memo-generation.ts
├── config/                  # Configuration files
│   └── costs.ts           # Cost calculation
├── feed/                    # Feed event emission
│   └── emit.ts
├── hubspot/                 # HubSpot integration
│   └── oauth.ts
├── inngest/                 # Inngest client and functions
│   ├── client.ts
│   └── functions/
│       ├── scan-run.ts
│       ├── memo-generate.ts
│       ├── discovery-scan.ts
│       ├── prompt-enrich.ts
│       └── ...
├── stripe/                  # Stripe integration
│   ├── client.ts
│   └── client-browser.ts
├── supabase/                # Supabase client
│   ├── client.ts
│   ├── server.ts
│   ├── middleware.ts
│   └── types.ts
└── utils/                   # Utility functions
    ├── domain-verification.ts
    ├── indexnow.ts
    ├── job-tracker.ts
    ├── openrouter.ts
    ├── perplexity.ts
    ├── serpapi.ts
    └── ...
```

---

## 3. Core Systems

### 3.1 Authentication & Authorization

**Implementation:** Supabase Auth with Row Level Security (RLS)

- **Client Auth:** [`lib/supabase/client.ts`](lib/supabase/client.ts:1)
- **Server Auth:** [`lib/supabase/server.ts`](lib/supabase/server.ts:1)
- **Middleware:** [`middleware.ts`](middleware.ts:1)

**Key Features:**
- Email/password authentication
- Email verification required
- Session management via cookies
- Protected route middleware
- Subdomain routing for brand memos

**Security Concerns:**
- ⚠️ Uses `SUPABASE_SERVICE_ROLE_KEY` fallback to `ANON_KEY` in some places
- ⚠️ No rate limiting on auth endpoints
- ⚠️ Email verification bypass possible in some flows

### 3.2 Database Schema

**Primary Tables:**
- `tenants` - Organization/tenant data
- `brands` - Brand profiles and settings
- `queries` - Search queries to track
- `scan_results` - AI scan results
- `memos` - Generated content
- `competitors` - Competitor tracking
- `alerts` - User notifications
- `usage_events` - Cost tracking
- `ai_traffic` - Traffic analytics
- `voice_insights` - Verified human sources
- `competitor_content` - Competitor content monitoring
- `feed_events` - Activity feed events

**Key Relationships:**
- Tenant → Brands (1:N)
- Brand → Queries (1:N)
- Brand → Memos (1:N)
- Brand → Competitors (1:N)
- Query → Scan Results (1:N)

### 3.3 Background Job System

**Implementation:** Inngest for job orchestration

**Key Functions:**
- `scan-run` - Execute AI visibility scans
- `memo-generate` - Generate content memos
- `discovery-scan` - Find brand mentions
- `prompt-enrich` - Analyze gaps and generate new queries
- `daily-run` - Scheduled daily automation
- `competitor-content-scan` - Monitor competitor content

**Concurrency Limits:**
- Scan jobs: 5 concurrent
- Memo generation: 3 concurrent
- Discovery scans: 3 concurrent

### 3.4 AI Integration

**Providers:**
1. **OpenRouter** - Multi-provider access (OpenAI, Anthropic, xAI)
2. **Perplexity** - Direct API for rich citations
3. **OpenAI** - Direct API for content generation

**Models Used:**
- GPT-4o Mini (primary for scans)
- GPT-4o (content generation)
- Claude 3.5 Haiku (disabled for testing)
- Grok 4 Fast (disabled for testing)
- Perplexity Sonar (disabled for testing)

**Cost Tracking:**
- Token-based cost calculation
- Search cost tracking
- Usage events logged to database
- Margin multiplier applied (5x)

### 3.5 Billing System

**Implementation:** Stripe subscriptions

**Plans:**
- Starter: $79/month (50 prompts, 3 AI engines, 5 memos, 1 brand)
- Growth: $199/month (150 prompts, 7 AI engines, unlimited memos, 3 brands)
- Enterprise: Custom pricing

**Webhook Handlers:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

## 4. Key Features

### 4.1 Brand Visibility Scanning

**Location:** [`lib/inngest/functions/scan-run.ts`](lib/inngest/functions/scan-run.ts:1)

**Process:**
1. Fetch brand and active queries
2. Run queries across enabled AI models
3. Parse responses for brand mentions
4. Check citations for brand domain
5. Track competitors mentioned
6. Calculate visibility and citation scores
7. Auto-discover new competitors
8. Trigger memo generation for gaps

**Metrics Tracked:**
- Brand mentioned (yes/no)
- Brand position in response
- Brand in citations (yes/no)
- Competitors mentioned
- Citation streak
- Position changes

### 4.2 Content Generation

**Location:** [`lib/inngest/functions/memo-generate.ts`](lib/inngest/functions/memo-generate.ts:1)

**Memo Types:**
- Comparison (vs competitor)
- Alternative (alternatives to competitor)
- Industry (for specific market)
- How-to guides

**Features:**
- Tone customization based on brand settings
- Voice insights integration (verified human sources)
- Schema.org structured data
- IndexNow submission for instant indexing
- HubSpot auto-sync

### 4.3 Competitor Discovery

**Location:** [`lib/inngest/functions/discovery-scan.ts`](lib/inngest/functions/discovery-scan.ts:1)

**Process:**
1. Generate 50-75 discovery queries
2. Run queries across AI models
3. Identify where brand is mentioned
4. Save winning queries to database
5. Analyze mention patterns by category

**Categories:**
- Direct product queries
- Problem-solution queries
- Industry-specific
- Competitor adjacency
- Feature-specific
- Use case specific
- Audience-specific

### 4.4 Prompt Enrichment

**Location:** [`lib/inngest/functions/prompt-enrich.ts`](lib/inngest/functions/prompt-enrich.ts:1)

**Feedback Loop:**
1. Analyze scan results for gaps
2. Identify queries where brand lost, competitors won
3. Generate new queries targeting those gaps
4. Discover new competitors from responses
5. Save to enrich future scans

### 4.5 Traffic Tracking

**Location:** [`app/api/track/route.ts`](app/api/track/route.ts:1)

**Detection:**
- AI referrer detection (ChatGPT, Perplexity, Claude, etc.)
- User agent analysis
- Country tracking
- Rate limiting (100 requests/minute)

**Sources Tracked:**
- ChatGPT
- Perplexity
- Claude
- Gemini
- Microsoft Copilot
- Meta AI
- Poe
- You.com
- Phind

---

## 5. Integration Points

### 5.1 Supabase

**Usage:**
- Authentication
- Database
- Real-time subscriptions
- Storage (for audio files)

**Tables:** 15+ tables for tenants, brands, queries, scans, memos, etc.

### 5.2 Inngest

**Usage:**
- Background job orchestration
- Event-driven architecture
- Scheduled tasks (daily runs)
- Retry logic

**Events:** 20+ event types defined in client

### 5.3 Stripe

**Usage:**
- Subscription billing
- Checkout sessions
- Webhook processing
- Customer management

**Security:**
- Webhook signature verification
- Service role key for admin operations

### 5.4 External APIs

| Service | Purpose | Rate Limits |
|----------|---------|-------------|
| OpenRouter | AI model access | Provider-specific |
| Perplexity | AI search with citations | Included in token cost |
| SerpAPI | Google AI Overview tracking | 100/month (free tier) |
| IndexNow | Search engine indexing | No official limit |
| HubSpot | Content publishing | API limits apply |

---

## 6. Code Quality Assessment

### 6.1 Strengths

✅ **Type Safety:** Comprehensive TypeScript usage with generated types  
✅ **Modular Architecture:** Clear separation of concerns  
✅ **Event-Driven:** Inngest provides clean async job handling  
✅ **Component Reusability:** Shared UI components library  
✅ **Error Handling:** Try-catch blocks in critical paths  
✅ **Cost Tracking:** Detailed usage and cost logging  

### 6.2 Areas for Improvement

⚠️ **Security:** Several security concerns (see Security Review)  
⚠️ **Error Handling:** Some silent failures without proper logging  
⚠️ **Rate Limiting:** Inconsistent rate limiting across APIs  
⚠️ **Testing:** Limited test coverage visible  
⚠️ **Documentation:** Some complex functions lack JSDoc  
⚠️ **Hardcoded Values:** Magic numbers and strings throughout code  

### 6.3 Technical Debt

1. **Fallback Keys:** Service role key fallback to anon key in multiple places
2. **Disabled Models:** Several AI models disabled for testing
3. **Legacy Code:** Some v1 compatibility code still present
4. **Batch Processing:** Manual batch processing instead of queue-based
5. **Error Recovery:** Limited retry logic for external API failures

---

## 7. Deployment Considerations

### 7.1 Environment Variables Required

**Critical:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENROUTER_API_KEY`
- `PERPLEXITY_API_KEY`

**Optional:**
- `SERPAPI_KEY`
- `INNGEST_EVENT_KEY`
- `NEXT_PUBLIC_APP_URL`

### 7.2 Infrastructure Needs

- **Database:** Supabase (managed PostgreSQL)
- **Job Queue:** Inngest (managed service)
- **CDN:** Vercel (for Next.js deployment)
- **Monitoring:** Application monitoring recommended
- **Logging:** Centralized logging recommended

### 7.3 Scaling Considerations

- **Database:** Connection pooling needed at scale
- **Job Queue:** Inngest handles scaling automatically
- **API Rate Limits:** Need to respect provider limits
- **Cost Management:** Usage-based costs require monitoring

---

## 8. Recommendations

### 8.1 Immediate (Week 1-2)

1. **Security Hardening**
   - Remove service role key fallbacks
   - Implement proper rate limiting
   - Add input validation on all API routes
   - Secure webhook endpoints

2. **Error Handling**
   - Add structured error logging
   - Implement retry logic for external APIs
   - Add circuit breakers for failing services

### 8.2 Short-term (Week 3-4)

1. **Testing**
   - Increase unit test coverage
   - Add integration tests
   - Implement E2E tests for critical flows

2. **Monitoring**
   - Add application performance monitoring
   - Implement cost alerting
   - Set up health checks

### 8.3 Long-term (Month 2+)

1. **Architecture**
   - Consider microservices for job processing
   - Implement caching layer
   - Add CDN for static assets

2. **Performance**
   - Optimize database queries
   - Implement query result caching
   - Add pagination to all list endpoints

---

## 9. Conclusion

ContextMemo is a well-architected Next.js application with a clear separation of concerns and modern technology choices. The codebase demonstrates good practices in TypeScript usage, modular design, and event-driven architecture. However, there are several areas requiring attention, particularly around security, error handling, and testing.

The application is production-ready for a small to medium user base but will require additional hardening and optimization before scaling to enterprise levels.

**Overall Codebase Health:** ⚠️ **Moderate** (6.5/10)

**Key Strengths:**
- Modern tech stack
- Clean architecture
- Type safety
- Event-driven design

**Key Concerns:**
- Security vulnerabilities
- Limited error recovery
- Insufficient testing
- Hardcoded configuration values
