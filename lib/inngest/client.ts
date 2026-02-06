import { Inngest } from 'inngest'

const isDev = process.env.NODE_ENV === 'development'

// Create the Inngest client
export const inngest = new Inngest({
  id: 'contextmemo',
  isDev,
  // For dev, point to local Inngest dev server
  ...(isDev && !process.env.INNGEST_EVENT_KEY && {
    eventKey: 'test', // Dev server accepts any key
  }),
})

// Event types for type safety
export type InngestEvents = {
  'brand/created': {
    data: {
      brandId: string
      tenantId: string
      domain: string
    }
  }
  'context/extract': {
    data: {
      brandId: string
      domain: string
    }
  }
  'context/extracted': {
    data: {
      brandId: string
    }
  }
  'competitor/discover': {
    data: {
      brandId: string
    }
  }
  'competitor/discovered': {
    data: {
      brandId: string
    }
  }
  'query/generate': {
    data: {
      brandId: string
    }
  }
  'query/generated': {
    data: {
      brandId: string
    }
  }
  'scan/run': {
    data: {
      brandId: string
      queryIds?: string[]
      autoGenerateMemos?: boolean // Auto-generate memos after scan
    }
  }
  'scan/completed': {
    data: {
      brandId: string
      visibilityScore: number
      gapsFound: number
    }
  }
  'memo/generate': {
    data: {
      brandId: string
      queryId?: string
      memoType: string
      competitorId?: string
      topicTitle?: string
      topicDescription?: string
    }
  }
  'memo/generated': {
    data: {
      brandId: string
      memoId: string
    }
  }
  'memo/generate-batch': {
    data: {
      brandId: string
      memoTypes: Array<{
        memoType: string
        queryId?: string
        competitorId?: string
      }>
    }
  }
  // Daily scheduled automation
  'daily/run': {
    data: Record<string, never> // No data needed, runs for all brands
  }
  'daily/brand-run': {
    data: {
      brandId: string
    }
  }
  'daily/brand-full-refresh': {
    data: {
      brandId: string
    }
  }
  'daily/brand-update': {
    data: {
      brandId: string
      discoverCompetitors: boolean
      generateQueries: boolean
    }
  }
  'daily/brand-scan': {
    data: {
      brandId: string
    }
  }
  // Discovery scan for exploring new query patterns
  'discovery/scan': {
    data: {
      brandId: string
    }
  }
  // Prompt enrichment - feedback loop from scan results
  'prompt/enrich': {
    data: {
      brandId: string
    }
  }
  // Competitor content monitoring
  'competitor/content-scan': {
    data: {
      brandId: string
      retroactive?: boolean
      daysBack?: number
    }
  }
  'competitor/content-classify': {
    data: {
      brandId: string
    }
  }
  'competitor/content-respond': {
    data: {
      brandId: string
    }
  }
  'competitor/content-backfill': {
    data: {
      brandId: string
      competitorId?: string
    }
  }
  // Competitor enrichment - deep profile extraction
  'competitor/enrich': {
    data: {
      competitorId: string
      brandId: string
    }
  }
  'competitor/enrich-batch': {
    data: {
      brandId: string
    }
  }
  // Topic Universe - Content Coverage Audit
  'topic/universe-generate': {
    data: {
      brandId: string
    }
  }
  'topic/universe-refresh': {
    data: {
      brandId: string
      newEntityName?: string
      newEntityType?: string
    }
  }
}
