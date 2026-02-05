import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Props {
  params: Promise<{ brandId: string }>
}

// Known aggregator domains
const AGGREGATOR_DOMAINS = [
  'g2.com', 'capterra.com', 'trustradius.com', 'getapp.com', 
  'softwareadvice.com', 'trustpilot.com', 'gartner.com', 'forrester.com',
  'crunchbase.com', 'producthunt.com',
]

// Known resource domains (government, education, standards bodies)
const RESOURCE_DOMAINS = [
  'fda.gov', 'cdc.gov', 'epa.gov', 'osha.gov', 'usda.gov',
  'who.int', 'iso.org', 'nist.gov', 'ieee.org',
  '.gov', '.edu', '.org',
]

// Classify entity type based on domain
function classifyEntity(domain: string | null, name: string): 'competitor' | 'resource' | 'aggregator' | 'publisher' | 'partner' {
  if (!domain) return 'competitor'
  
  const domainLower = domain.toLowerCase()
  
  // Check aggregators
  if (AGGREGATOR_DOMAINS.some(d => domainLower.includes(d))) {
    return 'aggregator'
  }
  
  // Check resources
  if (RESOURCE_DOMAINS.some(d => domainLower.includes(d))) {
    return 'resource'
  }
  
  // Check for common publisher patterns
  if (domainLower.includes('blog') || 
      domainLower.includes('news') || 
      domainLower.includes('medium.com') ||
      domainLower.includes('techcrunch') ||
      domainLower.includes('forbes') ||
      domainLower.includes('zdnet')) {
    return 'publisher'
  }
  
  // Default to competitor
  return 'competitor'
}

// Extract domain from URL
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { brandId } = await params

    // Get brand info
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('name, domain')
      .eq('id', brandId)
      .single()

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Get known competitors for this brand
    const { data: competitors } = await supabase
      .from('competitors')
      .select('name, domain')
      .eq('brand_id', brandId)
      .eq('is_active', true)

    const competitorNames = new Set((competitors || []).map(c => c.name.toLowerCase()))
    const competitorDomains = new Set((competitors || []).map(c => c.domain?.toLowerCase()).filter(Boolean))

    // Get queries for this brand
    const { data: queries } = await supabase
      .from('queries')
      .select('id, query_text')
      .eq('brand_id', brandId)
      .eq('is_active', true)

    const queryMap = new Map((queries || []).map(q => [q.id, q.query_text]))

    // Get recent scan results (last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data: scanResults, error: scanError } = await supabase
      .from('scan_results')
      .select('query_id, brand_mentioned, brand_in_citations, competitors_mentioned, citations')
      .eq('brand_id', brandId)
      .gte('scanned_at', ninetyDaysAgo.toISOString())

    if (scanError) {
      console.error('Failed to fetch scan results:', scanError)
      return NextResponse.json({ error: 'Failed to fetch scan data' }, { status: 500 })
    }

    // Entity aggregation map
    const entityMap = new Map<string, {
      name: string
      domain: string | null
      type: 'competitor' | 'resource' | 'aggregator' | 'publisher' | 'partner'
      mentionCount: number
      citationCount: number
      winCount: number
      queryIds: Set<string>
    }>()

    // Process scan results to extract entities
    for (const scan of scanResults || []) {
      const brandAppearsInThisScan = scan.brand_mentioned || scan.brand_in_citations

      // Process competitors mentioned
      if (scan.competitors_mentioned && Array.isArray(scan.competitors_mentioned)) {
        for (const competitorName of scan.competitors_mentioned) {
          if (!competitorName || typeof competitorName !== 'string') continue
          
          const key = competitorName.toLowerCase()
          const existing = entityMap.get(key) || {
            name: competitorName,
            domain: null,
            type: 'competitor' as const,
            mentionCount: 0,
            citationCount: 0,
            winCount: 0,
            queryIds: new Set<string>(),
          }

          existing.mentionCount++
          if (scan.query_id) {
            existing.queryIds.add(scan.query_id)
          }
          
          // Track wins (competitor appears, brand doesn't)
          if (!brandAppearsInThisScan) {
            existing.winCount++
          }

          entityMap.set(key, existing)
        }
      }

      // Process citations to find new entities
      if (scan.citations && Array.isArray(scan.citations)) {
        for (const citationUrl of scan.citations) {
          if (!citationUrl || typeof citationUrl !== 'string') continue
          
          const domain = extractDomain(citationUrl)
          if (!domain) continue

          // Skip if it's the brand's own domain
          if (domain.toLowerCase().includes(brand.domain.toLowerCase())) continue

          // Check if this domain belongs to a known competitor
          const isKnownCompetitor = competitorDomains.has(domain.toLowerCase())
          
          const key = domain.toLowerCase()
          const existing = entityMap.get(key) || {
            name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
            domain: domain,
            type: classifyEntity(domain, domain),
            mentionCount: 0,
            citationCount: 0,
            winCount: 0,
            queryIds: new Set<string>(),
          }

          // If it's a known competitor, mark it as such
          if (isKnownCompetitor && existing.type !== 'competitor') {
            existing.type = 'competitor'
          }

          existing.citationCount++
          existing.mentionCount++
          if (scan.query_id) {
            existing.queryIds.add(scan.query_id)
          }
          
          // Track wins for citations too
          if (!brandAppearsInThisScan && existing.type === 'competitor') {
            existing.winCount++
          }

          entityMap.set(key, existing)
        }
      }
    }

    // Also add known competitors that might not appear in scan results
    for (const comp of competitors || []) {
      const key = comp.name.toLowerCase()
      if (!entityMap.has(key)) {
        entityMap.set(key, {
          name: comp.name,
          domain: comp.domain,
          type: 'competitor',
          mentionCount: 0,
          citationCount: 0,
          winCount: 0,
          queryIds: new Set<string>(),
        })
      } else {
        // Update domain if we have it
        const existing = entityMap.get(key)!
        if (!existing.domain && comp.domain) {
          existing.domain = comp.domain
        }
        existing.type = 'competitor' // Ensure known competitors are marked as such
      }
    }

    // Convert to array format
    const entities = Array.from(entityMap.values())
      .map(entity => ({
        id: entity.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: entity.name,
        domain: entity.domain,
        type: entity.type,
        mentionCount: entity.mentionCount,
        citationCount: entity.citationCount,
        winCount: entity.winCount,
        queries: Array.from(entity.queryIds)
          .slice(0, 10)
          .map(qid => queryMap.get(qid) || qid)
          .filter(Boolean),
      }))
      .filter(e => e.mentionCount > 0 || e.type === 'competitor') // Keep all competitors, filter others
      .sort((a, b) => b.mentionCount - a.mentionCount)
      .slice(0, 50) // Limit to top 50

    return NextResponse.json({ 
      entities,
      summary: {
        total: entities.length,
        competitors: entities.filter(e => e.type === 'competitor').length,
        resources: entities.filter(e => e.type === 'resource').length,
        aggregators: entities.filter(e => e.type === 'aggregator').length,
        publishers: entities.filter(e => e.type === 'publisher').length,
        totalWins: entities.reduce((sum, e) => sum + e.winCount, 0),
      }
    })
  } catch (error) {
    console.error('Entity API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
