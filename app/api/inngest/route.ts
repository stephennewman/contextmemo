import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { contextExtract } from '@/lib/inngest/functions/context-extract'
import { competitorDiscover } from '@/lib/inngest/functions/competitor-discover'
import { queryGenerate } from '@/lib/inngest/functions/query-generate'
import { scanRun } from '@/lib/inngest/functions/scan-run'
import { memoGenerate } from '@/lib/inngest/functions/memo-generate'
import { discoveryScan } from '@/lib/inngest/functions/discovery-scan'
import { promptEnrich } from '@/lib/inngest/functions/prompt-enrich'
import { 
  competitorContentScan,
  competitorContentClassify,
  competitorContentRespond,
} from '@/lib/inngest/functions/competitor-content'
import { hourlyContentGenerate } from '@/lib/inngest/functions/hourly-content'
import { 
  memoBacklink, 
  memoBatchBacklink, 
  dailyBacklinkRefresh 
} from '@/lib/inngest/functions/memo-backlink'
import { 
  dailyRun, 
  dailyBrandFullRefresh,
  dailyBrandUpdate,
  dailyBrandScan,
} from '@/lib/inngest/functions/daily-run'
import { bingSync, bingWeeklySync } from '@/lib/inngest/functions/bing-sync'
import { googleSearchConsoleSync, googleWeeklySync } from '@/lib/inngest/functions/google-search-console-sync'
import { aiOverviewScan } from '@/lib/inngest/functions/ai-overview-scan'
import { citationLoopRun, analyzeCitation } from '@/lib/inngest/functions/citation-loop'
import { gapToContent, processAllGaps } from '@/lib/inngest/functions/gap-to-content'
import { verifyGap, verifyAllGaps, getVerificationMetrics } from '@/lib/inngest/functions/citation-verify'
import { 
  syncAITrafficAttribution, 
  syncDealAttribution, 
  getAttributionMetrics,
  dailyAttributionSync,
} from '@/lib/inngest/functions/revenue-attribution'
import { analyzeModelPerformance, weeklyModelInsights } from '@/lib/inngest/functions/model-insights'
import { 
  analyzePromptIntelligence, 
  getPromptIntelligenceFeed, 
  weeklyPromptIntelligence 
} from '@/lib/inngest/functions/prompt-intelligence'
import { 
  promptLabRun, 
  promptLabStop 
} from '@/lib/inngest/functions/prompt-lab'
import { dailyDigest } from '@/lib/inngest/functions/daily-digest'
import { topicUniverseGenerate, topicUniverseRefresh } from '@/lib/inngest/functions/topic-universe'
import { competitorEnrich, competitorEnrichBatch } from '@/lib/inngest/functions/competitor-enrich'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Core workflow functions
    contextExtract,      // Crawl website, extract brand context
    competitorDiscover,  // Find competitors using AI
    queryGenerate,       // Generate search queries to monitor
    scanRun,            // Run AI scans, track visibility
    memoGenerate,       // Generate context memos
    discoveryScan,      // Discovery scan - find where brand is mentioned
    promptEnrich,       // Feedback loop - mine scan results for new prompts/competitors
    
    // Citation loop - autonomous competitor analysis
    citationLoopRun,    // Full loop: analyze competitors → find content gaps → recommendations
    analyzeCitation,    // Analyze why specific competitor was cited
    
    // Gap-to-content pipeline - automated content generation
    gapToContent,       // Generate content from a single gap → push to HubSpot
    processAllGaps,     // Process all pending gaps for a brand
    
    // Citation verification - closed-loop validation
    verifyGap,              // Verify a single gap is now being cited
    verifyAllGaps,          // Verify all pending gaps for a brand
    getVerificationMetrics, // Calculate verification metrics
    
    // Revenue attribution - connect AI traffic to CRM revenue
    syncAITrafficAttribution,  // Match AI traffic to HubSpot contacts
    syncDealAttribution,       // Track deals from attributed contacts
    getAttributionMetrics,     // Calculate ROI metrics
    dailyAttributionSync,      // Daily sync job
    
    // Per-model insights and optimization
    analyzeModelPerformance,   // Analyze which models cite what content
    weeklyModelInsights,       // Weekly analysis job
    
    // Prompt intelligence feed
    analyzePromptIntelligence,    // Analyze trending prompts and competitor wins
    getPromptIntelligenceFeed,    // Get intelligence feed for a brand
    weeklyPromptIntelligence,     // Weekly analysis job
    
    // Competitor content intelligence
    competitorContentScan,     // Scan competitor sites for new content
    competitorContentClassify, // Classify and filter content
    competitorContentRespond,  // Generate and auto-publish response content
    hourlyContentGenerate,     // Hourly cron: generate 1 memo per brand (9am-5pm ET, Mon-Fri)
    
    // Backlinking functions
    memoBacklink,           // Add backlinks to individual memo
    memoBatchBacklink,      // Batch update all memos for a brand
    dailyBacklinkRefresh,   // Daily refresh - 7 AM UTC
    
    // Daily automation functions
    dailyRun,               // Main scheduler - 6 AM ET daily
    dailyBrandFullRefresh,  // Full refresh (context → competitors → queries → scan)
    dailyBrandUpdate,       // Weekly update (competitors/queries → scan)
    dailyBrandScan,         // Daily scan only (also handles daily/brand-run event)
    
    // Search Console integrations
    bingSync,               // Sync Bing Webmaster data for a brand
    bingWeeklySync,         // Weekly sync for all brands - Sundays 8 AM UTC
    googleSearchConsoleSync, // Sync Google Search Console data for a brand
    googleWeeklySync,        // Weekly sync for all brands - Sundays 9 AM UTC
    
    // Google AI Overviews (requires SERPAPI_KEY)
    aiOverviewScan,          // Scan Google AI Overviews for brand queries
    
    // Prompt Lab - high-volume citation research
    promptLabRun,            // Run prompts continuously for X minutes
    promptLabStop,           // Stop a running lab
    
    // Daily digest email - 9 AM ET
    dailyDigest,             // Send daily visibility summary via Resend
    
    // Competitor enrichment - deep website crawl + AI extraction
    competitorEnrich,        // Enrich a single competitor with full profile
    competitorEnrichBatch,   // Batch enrich all competitors for a brand
    
    // Topic Universe - Content Coverage Audit
    topicUniverseGenerate,   // Generate full topic universe for a brand
    topicUniverseRefresh,    // Add topics for newly discovered entities
  ],
})
// Sync trigger Wed Feb  4 13:26:53 EST 2026
