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
    
    // Competitor content intelligence
    competitorContentScan,     // Scan competitor sites for new content
    competitorContentClassify, // Classify and filter content
    competitorContentRespond,  // Generate and auto-publish response content
    
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
  ],
})
