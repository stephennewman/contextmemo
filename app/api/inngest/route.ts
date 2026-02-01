import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { contextExtract } from '@/lib/inngest/functions/context-extract'
import { competitorDiscover } from '@/lib/inngest/functions/competitor-discover'
import { queryGenerate } from '@/lib/inngest/functions/query-generate'
import { scanRun } from '@/lib/inngest/functions/scan-run'
import { memoGenerate } from '@/lib/inngest/functions/memo-generate'
import { 
  dailyRun, 
  dailyBrandFullRefresh,
  dailyBrandUpdate,
  dailyBrandScan,
} from '@/lib/inngest/functions/daily-run'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Core workflow functions
    contextExtract,      // Crawl website, extract brand context
    competitorDiscover,  // Find competitors using AI
    queryGenerate,       // Generate search queries to monitor
    scanRun,            // Run AI scans, track visibility
    memoGenerate,       // Generate context memos
    
    // Daily automation functions
    dailyRun,               // Main scheduler - 6 AM ET daily
    dailyBrandFullRefresh,  // Full refresh (context → competitors → queries → scan)
    dailyBrandUpdate,       // Weekly update (competitors/queries → scan)
    dailyBrandScan,         // Daily scan only (also handles daily/brand-run event)
  ],
})
