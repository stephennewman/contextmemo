# HubSpot App Marketplace Listing Guide

## Overview

This document outlines the requirements and strategy for listing Context Memo on the HubSpot App Marketplace.

## Why HubSpot Marketplace?

- **200K+ potential customers** already using HubSpot
- **First-mover advantage** - No AI citation/GEO tools currently in marketplace
- **Distribution** - Organic discovery by marketers actively seeking solutions
- **Trust signal** - HubSpot certification adds credibility
- **Integration depth** - Already have working HubSpot blog publishing

## App Category

**Primary:** Marketing > Content Marketing
**Secondary:** Marketing > SEO

## App Listing Content

### App Name
**Context Memo** - AI Citation & Content Automation

### Tagline (70 chars max)
"Get your brand cited by ChatGPT, Claude & Perplexity. Automatically."

### Short Description (150 chars)
"Monitor AI citations, identify content gaps, auto-generate optimized content, and publish directly to HubSpot. Close the loop on AI visibility."

### Full Description

#### The Problem
When buyers ask AI assistants "What's the best [solution] for [use case]?", AI models recommend brands based on available content. If your brand isn't represented with clear, citable content, you're invisible to AI-driven discovery.

#### The Solution
Context Memo automatically:
1. **Monitors AI Citations** - Track how ChatGPT, Claude, Perplexity, and Gemini mention your brand
2. **Identifies Content Gaps** - Discover where competitors get cited instead of you
3. **Generates Optimized Content** - AI creates citation-worthy content filling those gaps
4. **Publishes to HubSpot** - Content goes directly to your HubSpot blog as drafts or published
5. **Verifies Results** - Re-runs prompts to confirm your content now gets cited

#### Key Features
- **Citation Loop Analysis**: Reverse-engineer WHY competitors get cited and create content to win those citations
- **Multi-Model Monitoring**: Track visibility across GPT-4, Claude, Gemini, Perplexity, and more
- **Revenue Attribution**: Connect AI traffic to HubSpot contacts and deals
- **Automated Content Pipeline**: Gap identification → content generation → HubSpot publish → verification
- **Per-Model Optimization**: Get recommendations specific to each AI model's preferences

#### Who It's For
- B2B Marketing teams managing brand visibility
- Content teams scaling AI-optimized content
- Growth teams tracking AI as a discovery channel

### Screenshots Required

1. **Dashboard Overview** - Main visibility dashboard showing citation scores
2. **Content Gap Analysis** - List of identified gaps with competitor data
3. **HubSpot Integration** - Settings showing blog connection and auto-publish options
4. **Generated Content** - Example memo published to HubSpot
5. **Citation Verification** - Results showing content now being cited

### Video Demo (2-3 minutes)
- 0:00-0:30 - Problem introduction (AI visibility matters)
- 0:30-1:30 - Connect HubSpot, run first scan, see gaps
- 1:30-2:30 - Generate content, publish to HubSpot, verify citation
- 2:30-3:00 - ROI dashboard and revenue attribution

## Technical Requirements

### OAuth 2.0 Scopes Required
```
content                 # Read/write blog posts
crm.objects.contacts.read   # Read contacts for attribution
crm.objects.contacts.write  # Update contacts with AI source
crm.objects.deals.read      # Read deals for revenue attribution
```

### Webhook Events (Optional, Future)
- `contact.creation` - For real-time attribution
- `deal.propertyChange` - For pipeline tracking

### API Endpoints Used
- `POST /cms/v3/blogs/posts` - Create blog posts
- `POST /cms/v3/blogs/posts/{id}/draft/push-live` - Publish drafts
- `GET /crm/v3/objects/contacts` - Read contacts
- `PATCH /crm/v3/objects/contacts/{id}` - Update contact properties
- `GET /crm/v3/objects/deals` - Read deals

### Custom Contact Properties Created
| Property | Type | Description |
|----------|------|-------------|
| `ai_source` | String | AI platform that drove the visit (chatgpt, perplexity, etc.) |
| `ai_content_id` | String | ID of the memo/content that was cited |
| `ai_first_touch` | DateTime | When the AI traffic event occurred |

## Listing Requirements Checklist

### Required Documentation
- [ ] Privacy Policy URL
- [ ] Terms of Service URL
- [ ] Support/Help documentation
- [ ] API documentation (if applicable)

### Required Assets
- [ ] App icon (512x512 PNG, transparent background)
- [ ] 5 screenshots (1280x800 recommended)
- [ ] Demo video (YouTube/Vimeo)
- [ ] Banner image (1200x628)

### Technical Requirements
- [ ] OAuth 2.0 implementation
- [ ] Secure token storage (Supabase encrypted)
- [ ] Error handling for API rate limits
- [ ] Webhook signature validation (if using webhooks)

### Review Process
1. **Submit listing** - Fill out app info, upload assets
2. **Technical review** - HubSpot verifies OAuth, API usage
3. **Security review** - Data handling, token storage
4. **Quality review** - UX, documentation, support
5. **Approval** - 2-4 weeks typically

## Pricing Strategy

### Free Tier (HubSpot Free/Starter)
- 1 brand
- 10 prompts monitored
- Manual content export (no auto-publish)

### Professional ($49/month)
- 3 brands
- 50 prompts monitored
- Auto-publish to HubSpot
- Citation verification

### Enterprise ($199/month)
- Unlimited brands
- Unlimited prompts
- Revenue attribution
- Priority support
- Custom integrations

## Competitive Positioning

### vs. HubSpot AI Search Grader (Native Tool)
- **Grader**: Monitoring only, no content generation
- **Context Memo**: Full loop - monitor → identify → generate → publish → verify

### vs. Semrush AI Visibility
- **Semrush**: Separate from CMS, manual content process
- **Context Memo**: Native HubSpot integration, automated publishing

### vs. Generic AI Content Tools
- **Generic**: Create content without citation strategy
- **Context Memo**: Create content specifically optimized for AI citations

## Launch Strategy

### Phase 1: Private Beta
- Invite 10-20 HubSpot users from existing customer base
- Gather feedback on HubSpot-specific workflows
- Document common issues/questions

### Phase 2: Public Listing
- Submit to marketplace
- Prepare launch content (blog post, social)
- Set up support workflows

### Phase 3: Growth
- Case studies from beta users
- HubSpot partner program consideration
- Content marketing targeting "HubSpot AI" keywords

## Action Items

1. **Create HubSpot Developer Account** (if not exists)
2. **Register App** in HubSpot developer portal
3. **Implement OAuth flow** (already partially done)
4. **Create custom contact properties** for attribution
5. **Design and create visual assets**
6. **Write support documentation**
7. **Record demo video**
8. **Submit listing**

## Resources

- [HubSpot App Partner Program](https://www.hubspot.com/partners/app)
- [HubSpot Developer Documentation](https://developers.hubspot.com/docs)
- [App Marketplace Listing Guide](https://developers.hubspot.com/docs/api/app-marketplace-listings)
- [OAuth Implementation Guide](https://developers.hubspot.com/docs/api/oauth-quickstart-guide)
