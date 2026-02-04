/**
 * Backfill Prompt Tracking Data
 * 
 * This script populates historical tracking data for prompts:
 * 1. Count existing scan_results for each query
 * 2. Find first scan where brand_in_citations = true
 * 3. Calculate current streak from recent scans
 * 4. Set current_status based on latest scan
 * 5. Infer source_type from query_type and related_competitor_id
 * 
 * Run with: npx ts-node --project tsconfig.json scripts/backfill-prompt-tracking.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface QueryTrackingUpdate {
  id: string
  scan_count: number
  last_scanned_at: string | null
  first_cited_at: string | null
  last_cited_at: string | null
  citation_lost_at: string | null
  citation_streak: number
  longest_streak: number
  current_status: 'never_scanned' | 'gap' | 'cited' | 'lost_citation'
  source_type: 'original' | 'expanded' | 'competitor_inspired' | 'greenspace' | 'manual' | 'auto'
}

async function backfillPromptTracking() {
  console.log('Starting prompt tracking backfill...')
  
  // Get all queries
  const { data: queries, error: queriesError } = await supabase
    .from('queries')
    .select('id, query_type, related_competitor_id, auto_discovered')
    .order('created_at', { ascending: true })
  
  if (queriesError || !queries) {
    console.error('Failed to fetch queries:', queriesError)
    return
  }
  
  console.log(`Found ${queries.length} queries to process`)
  
  let processed = 0
  let updated = 0
  const batchSize = 50
  
  // Process in batches
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize)
    const queryIds = batch.map(q => q.id)
    
    // Get all scan results for this batch
    const { data: scans, error: scansError } = await supabase
      .from('scan_results')
      .select('query_id, brand_in_citations, brand_mentioned, scanned_at')
      .in('query_id', queryIds)
      .order('scanned_at', { ascending: true })
    
    if (scansError) {
      console.error('Failed to fetch scans for batch:', scansError)
      continue
    }
    
    // Group scans by query_id
    const scansByQuery = new Map<string, typeof scans>()
    for (const scan of scans || []) {
      const existing = scansByQuery.get(scan.query_id) || []
      existing.push(scan)
      scansByQuery.set(scan.query_id, existing)
    }
    
    // Calculate tracking data for each query
    const updates: QueryTrackingUpdate[] = []
    
    for (const query of batch) {
      const queryScans = scansByQuery.get(query.id) || []
      
      // Sort by scanned_at ascending
      queryScans.sort((a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime())
      
      const scanCount = queryScans.length
      const lastScan = queryScans[queryScans.length - 1]
      
      // Find first citation
      const firstCitedScan = queryScans.find(s => s.brand_in_citations === true)
      
      // Find last citation
      const citedScans = queryScans.filter(s => s.brand_in_citations === true)
      const lastCitedScan = citedScans[citedScans.length - 1]
      
      // Calculate current streak (from most recent scans)
      let currentStreak = 0
      for (let j = queryScans.length - 1; j >= 0; j--) {
        if (queryScans[j].brand_in_citations === true) {
          currentStreak++
        } else {
          break
        }
      }
      
      // Calculate longest streak
      let longestStreak = 0
      let tempStreak = 0
      for (const scan of queryScans) {
        if (scan.brand_in_citations === true) {
          tempStreak++
          longestStreak = Math.max(longestStreak, tempStreak)
        } else {
          tempStreak = 0
        }
      }
      
      // Determine current status
      let currentStatus: QueryTrackingUpdate['current_status'] = 'never_scanned'
      if (scanCount > 0 && lastScan) {
        if (lastScan.brand_in_citations === true) {
          currentStatus = 'cited'
        } else if (firstCitedScan && lastScan.brand_in_citations !== true) {
          // Was cited before but not now
          currentStatus = 'lost_citation'
        } else {
          currentStatus = 'gap'
        }
      }
      
      // Determine citation_lost_at
      let citationLostAt: string | null = null
      if (currentStatus === 'lost_citation' && lastCitedScan) {
        // Find first scan after last citation that wasn't cited
        const lastCitedIndex = queryScans.indexOf(lastCitedScan)
        if (lastCitedIndex < queryScans.length - 1) {
          citationLostAt = queryScans[lastCitedIndex + 1].scanned_at
        }
      }
      
      // Infer source_type
      let sourceType: QueryTrackingUpdate['source_type'] = 'auto'
      if (!query.auto_discovered) {
        sourceType = 'manual'
      } else if (query.related_competitor_id) {
        sourceType = 'competitor_inspired'
      } else if (query.query_type === 'greenspace' || query.query_type === 'opportunity') {
        sourceType = 'greenspace'
      } else if (query.query_type === 'comparison' || query.query_type === 'versus' || query.query_type === 'alternative') {
        sourceType = 'competitor_inspired'
      } else {
        sourceType = 'auto' // Could be 'original' or 'expanded', hard to distinguish
      }
      
      updates.push({
        id: query.id,
        scan_count: scanCount,
        last_scanned_at: lastScan?.scanned_at || null,
        first_cited_at: firstCitedScan?.scanned_at || null,
        last_cited_at: lastCitedScan?.scanned_at || null,
        citation_lost_at: citationLostAt,
        citation_streak: currentStreak,
        longest_streak: longestStreak,
        current_status: currentStatus,
        source_type: sourceType,
      })
    }
    
    // Batch update queries
    for (const update of updates) {
      const { id, ...fields } = update
      const { error: updateError } = await supabase
        .from('queries')
        .update(fields)
        .eq('id', id)
      
      if (updateError) {
        console.error(`Failed to update query ${id}:`, updateError)
      } else {
        updated++
      }
    }
    
    processed += batch.length
    console.log(`Processed ${processed}/${queries.length} queries (${updated} updated)`)
  }
  
  console.log(`\nBackfill complete!`)
  console.log(`Total queries: ${queries.length}`)
  console.log(`Successfully updated: ${updated}`)
  
  // Print summary statistics
  const { data: stats } = await supabase
    .from('queries')
    .select('current_status')
  
  if (stats) {
    const statusCounts = stats.reduce((acc, q) => {
      const status = q.current_status || 'never_scanned'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('\nStatus distribution:')
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  ${status}: ${count}`)
    }
  }
}

// Run the backfill
backfillPromptTracking()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Backfill failed:', err)
    process.exit(1)
  })
