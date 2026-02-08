

# Crawler Detection System Manual

## Overview

The ContextMemo platform includes a crawler detection system that identifies when brand websites are visited by AI crawlers from LLM service providers like ChatGPT, Perplexity, and Claude. This manual explains how the system works, how to integrate it with your brand's website, and how it can be used to optimize scanning operations.

## Current Implementation

### Detection Mechanism

The crawler detection system is implemented in the [`detectAISource()`](lib/supabase/types.ts:987) function, which analyzes two key parameters:

1. **Referrer URL**: Identifies known AI platforms from their domain patterns
2. **User Agent**: Detects AI-specific bot patterns in the user agent string

### Detection Logic

The function implements pattern matching for the following AI sources:

```typescript
// Check referrer first
if (ref.includes('chat.openai.com') || ref.includes('chatgpt.com')) return 'chatgpt'
if (ref.includes('perplexity.ai')) return 'perplexity'
if (ref.includes('claude.ai')) return 'claude'
if (ref.includes('gemini.google.com') || ref.includes('bard.google.com')) return 'gemini'
if (ref.includes('copilot.microsoft.com') || ref.includes('bing.com/chat')) return 'copilot'
if (ref.includes('meta.ai') || ref.includes('facebook.com/ai')) return 'meta_ai'
if (ref.includes('poe.com')) return 'poe'
if (ref.includes('you.com')) return 'you'
if (ref.includes('phind.com')) return 'phind'

// Check user agent for AI bot patterns
if (ua.includes('chatgpt') || ua.includes('openai')) return 'chatgpt'
if (ua.includes('perplexitybot') || ua.includes('perplexity')) return 'perplexity'
if (ua.includes('anthropic') || ua.includes('claude')) return 'claude'
if (ua.includes('google-extended') || ua.includes('gemini')) return 'gemini'
if (ua.includes('bingbot') && ua.includes('ai')) return 'copilot'
```

## Tracking Implementation

### Track Endpoint

The detection is used in [`app/api/track/route.ts`](app/api/track/route.ts:76) which provides two tracking methods:

1. **POST requests**: For JSON-based tracking with detailed information
2. **GET requests**: For pixel tracking (1x1 transparent GIF) for simple integration

### Tracked Data

Events are stored in the `ai_traffic` table with the following fields:
- `brand_id`: The brand associated with the tracked page
- `page_url`: The URL visited by the AI crawler
- `referrer`: Original referrer URL
- `referrer_source`: Detected AI source (e.g., chatgpt, perplexity)
- `user_agent`: Full user agent string
- `country`: Geolocation information

### Client-Side Tracking

The [`AITrafficTracker`](components/tracking/ai-traffic-tracker.tsx:10) component implements client-side tracking for ContextMemo's own memo pages:

```tsx
export function AITrafficTracker({ brandId, memoId }: AITrafficTrackerProps) {
  useEffect(() => {
    const track = async () => {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          memoId,
          pageUrl: window.location.href,
          referrer: document.referrer || null,
        }),
      })
    }
    const timer = setTimeout(track, 100)
    return () => clearTimeout(timer)
  }, [brandId, memoId])
  return null
}
```

This component is automatically added to all memo pages ([`app/memo/[subdomain]/[[...slug]]/page.tsx`](app/memo/[subdomain]/[[...slug]]/page.tsx:209)) to track AI traffic to published memos.

## Integrating with Your Brand Website

To track AI crawler activity on your own brand website, you need to implement one of the following integration methods.

### Method 1: Pixel Tracking (Simplest)

Add this 1x1 pixel image to every page on your website:

```html
<img 
  src="https://contextmemo.com/api/track?b=YOUR_BRAND_ID&u={{page_url}}" 
  alt="" 
  width="1" 
  height="1" 
  style="display: none;"
/>
```

**Parameters:**
- `b`: Your ContextMemo brand ID (required)
- `u`: The full URL of the page being tracked (required)
- `m`: Memo ID (optional, if tracking a specific memo)

### Method 2: JavaScript Tracking (More Detailed)

Add this JavaScript snippet to your website to track AI traffic with more detailed information:

```javascript
<script>
  // Track AI traffic to ContextMemo
  (function() {
    const BRAND_ID = 'YOUR_BRAND_ID'; // Replace with your brand ID
    const PAGE_URL = window.location.href;
    const REFERRER = document.referrer;
    
    // Send tracking data to ContextMemo
    fetch('https://contextmemo.com/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandId: BRAND_ID,
        pageUrl: PAGE_URL,
        referrer: REFERRER,
      }),
    }).catch(() => {
      // Fail silently - tracking shouldn't break the page
    });
  })();
</script>
```

### Method 3: Google Analytics Integration

If you use Google Analytics, you can set up custom events to track AI traffic. Here's how:

1. First, implement the JavaScript tracking snippet
2. Add custom event tracking:

```javascript
// Track AI traffic as custom event in Google Analytics
if (window.gtag) {
  gtag('event', 'ai_traffic_detected', {
    'brand_id': BRAND_ID,
    'page_url': PAGE_URL,
    'referrer': REFERRER,
  });
}
```

### Method 4: Server-Side Tracking

For server-side applications, you can send tracking requests directly from your backend:

```javascript
// Node.js example
const fetch = require('node-fetch');

async function trackAITraffic(brandId, pageUrl, referrer, userAgent) {
  try {
    await fetch('https://contextmemo.com/api/track', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': userAgent
      },
      body: JSON.stringify({
        brandId,
        pageUrl,
        referrer,
      }),
    });
  } catch (error) {
    console.error('AI traffic tracking failed:', error);
  }
}
```

## How Detection Works on External Websites

The `detectAISource` function gains visibility into activity on your brand's website through the tracking integration you implement. When an AI crawler visits your site:

1. The tracking pixel or JavaScript snippet sends a request to ContextMemo's `/api/track` endpoint
2. The request includes the referrer URL and user agent string
3. The `detectAISource` function analyzes these parameters to identify the AI source
4. The event is stored in the `ai_traffic` table with all relevant details

## Integrating with Scanning Process

Currently, the crawler detection system tracks AI traffic but doesn't directly influence the scanning process. To implement the "only rescanning when the brand website has been crawled by an LLM service provider" requirement, the following integration is needed:

### Step 1: Add Crawler Check to Daily Scan Scheduler

Modify the [`daily-run.ts`](lib/inngest/functions/daily-run.ts:187) function to check for recent AI traffic before deciding to scan:

```typescript
// Check for recent AI traffic
const { data: recentAITraffic } = await supabase
  .from('ai_traffic')
  .select('id')
  .eq('brand_id', brand.id)
  .gte('timestamp', new Date(Date.now() - scanFrequencyDays * 24 * 60 * 60 * 1000).toISOString())
  .neq('referrer_source', 'organic')
  .neq('referrer_source', 'direct_nav')

const hasRecentAITraffic = (recentAITraffic?.length || 0) > 0
```

### Step 2: Modify Scan Decision Logic

Update the `needsScan` logic in the daily scheduler:

```typescript
needsScan: autoScanEnabled && !dailyCapReached && (
  isOlderThanDays(lastScan, scanFrequencyDays) || 
  hasRecentSiteActivity || 
  hasRecentAITraffic
),
```

### Step 3: Implement Intelligent Scan Frequency

Enhance the system to adjust scan frequency based on AI traffic patterns:

```typescript
// Determine optimal scan frequency based on AI traffic
function getOptimalScanFrequency(trafficCount: number): number {
  if (trafficCount === 0) return 7 // Weekly if no AI traffic
  if (trafficCount < 5) return 3 // Every 3 days for low traffic
  if (trafficCount < 15) return 1 // Daily for moderate traffic
  return 0.5 // Twice daily for high traffic
}
```

## Configuration and Setup

### Finding Your Brand ID

1. Log in to your ContextMemo account
2. Navigate to your brand's dashboard
3. Look for the brand ID in the URL (format: `/brands/[brandId]`)

### Verifying the Integration

After implementing tracking, you can verify it's working by:

1. Checking the Activity Feed in your brand dashboard for "AI Traffic" events
2. Monitoring the `ai_traffic` table in your database
3. Using browser developer tools to inspect network requests to `/api/track`

## Enhancing Detection Accuracy

To improve the crawler detection system:

1. **Update Detection Patterns**: Add new AI platform patterns as they emerge
2. **Implement Behavioral Analysis**: Track request patterns and behavior
3. **Add IP Range Detection**: Include known IP ranges for AI crawlers
4. **Machine Learning**: Train models to identify new AI crawler patterns

## Summary

The crawler detection system provides valuable insights into how AI services are interacting with your brand's content. By integrating tracking on your brand's website, you can:

1. Identify which AI platforms are crawling your site
2. Optimize scanning operations to only run when needed
3. Measure the impact of AI content on your brand visibility
4. Make data-driven decisions about content optimization

The integration process is straightforward and can be implemented using simple pixel tracking or more detailed JavaScript tracking. Once integrated, the system will automatically start collecting data about AI crawler activity.