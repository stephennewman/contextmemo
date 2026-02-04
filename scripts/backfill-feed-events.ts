/**
 * Backfill Feed Events
 * 
 * One-time script to populate feed_events from existing data:
 * - alerts table → relevant feed events
 * - scan_results where brand not cited → gap events
 * - memos with verification data → verification events
 * - competitor_content → competitor published events
 * 
 * Run with: npx tsx scripts/backfill-feed-events.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import type { FeedWorkflow, FeedSeverity, FeedAction } from '../lib/feed/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface FeedEventInsert {
  tenant_id: string
  brand_id: string
  workflow: FeedWorkflow
  event_type: string
  title: string
  description?: string
  severity: FeedSeverity
  action_available?: FeedAction[]
  action_cost_credits?: number
  related_query_id?: string
  related_memo_id?: string
  related_competitor_id?: string
  data?: Record<string, unknown>
  read: boolean
  created_at: string
}

async function backfillFromAlerts() {
  console.log('\n📋 Backfilling from alerts table...')
  
  const { data: alerts, error } = await supabase
    .from('alerts')
    .select('*, brand:brand_id(tenant_id)')
    .order('created_at', { ascending: true })
    .limit(1000)
  
  if (error) {
    console.error('Failed to fetch alerts:', error)
    return 0
  }
  
  if (!alerts || alerts.length === 0) {
    console.log('No alerts found')
    return 0
  }
  
  let count = 0
  const feedEvents: FeedEventInsert[] = []
  
  for (const alert of alerts) {
    const tenantId = (alert.brand as { tenant_id: string })?.tenant_id
    if (!tenantId) continue
    
    let workflow: FeedWorkflow = 'system'
    let eventType = alert.alert_type
    let severity: FeedSeverity = 'info'
    let actions: FeedAction[] = []
    
    // Map alert types to feed events
    switch (alert.alert_type) {
      case 'scan_complete':
        workflow = 'core_discovery'
        severity = 'info'
        actions = ['view_details']
        break
      case 'memo_published':
        workflow = 'core_discovery'
        severity = 'success'
        actions = ['view_memo']
        break
      case 'citation_verified':
        workflow = 'verification'
        severity = 'success'
        actions = ['view_memo']
        break
      case 'citation_pending':
        workflow = 'verification'
        eventType = 'verification_pending'
        severity = 'info'
        actions = ['view_memo', 'retry_verification']
        break
      case 'discovery_complete':
        workflow = 'core_discovery'
        severity = 'success'
        actions = ['view_details']
        break
      case 'setup_complete':
        workflow = 'system'
        severity = 'success'
        break
      default:
        workflow = 'system'
    }
    
    feedEvents.push({
      tenant_id: tenantId,
      brand_id: alert.brand_id,
      workflow,
      event_type: eventType,
      title: alert.title,
      description: alert.message,
      severity,
      action_available: actions,
      data: alert.data || {},
      read: alert.read,
      created_at: alert.created_at,
    })
    
    count++
  }
  
  if (feedEvents.length > 0) {
    const { error: insertError } = await supabase
      .from('feed_events')
      .insert(feedEvents)
    
    if (insertError) {
      console.error('Failed to insert feed events from alerts:', insertError)
      return 0
    }
  }
  
  console.log(`✓ Backfilled ${count} events from alerts`)
  return count
}

async function backfillGapsFromScans() {
  console.log('\n🔍 Backfilling gaps from scan_results...')
  
  // Get recent scans where brand wasn't cited
  const { data: scans, error } = await supabase
    .from('scan_results')
    .select('*, query:query_id(query_text), brand:brand_id(tenant_id, name)')
    .eq('brand_in_citations', false)
    .order('scanned_at', { ascending: false })
    .limit(500)
  
  if (error) {
    console.error('Failed to fetch scan results:', error)
    return 0
  }
  
  if (!scans || scans.length === 0) {
    console.log('No gap scans found')
    return 0
  }
  
  // Group by query to avoid duplicates
  const seenQueries = new Set<string>()
  let count = 0
  const feedEvents: FeedEventInsert[] = []
  
  for (const scan of scans) {
    if (!scan.query_id || seenQueries.has(scan.query_id)) continue
    seenQueries.add(scan.query_id)
    
    const tenantId = (scan.brand as { tenant_id: string })?.tenant_id
    const brandName = (scan.brand as { name: string })?.name
    const queryText = (scan.query as { query_text: string })?.query_text
    
    if (!tenantId || !queryText) continue
    
    const winner = scan.competitors_mentioned?.[0]
    
    feedEvents.push({
      tenant_id: tenantId,
      brand_id: scan.brand_id,
      workflow: 'core_discovery',
      event_type: 'gap_identified',
      title: winner 
        ? `${winner} winning on "${queryText.slice(0, 50)}..."`
        : `Gap: "${queryText.slice(0, 60)}..."`,
      description: 'Content needed to compete for this query',
      severity: 'action_required',
      action_available: ['generate_memo', 'view_details', 'dismiss'],
      action_cost_credits: 3,
      related_query_id: scan.query_id,
      data: {
        gap: {
          query_text: queryText,
          visibility_rate: 0,
          winner_name: winner,
          models_checked: [scan.model],
        },
      },
      read: false,
      created_at: scan.scanned_at,
    })
    
    count++
    
    if (count >= 100) break // Limit to prevent overloading
  }
  
  if (feedEvents.length > 0) {
    const { error: insertError } = await supabase
      .from('feed_events')
      .insert(feedEvents)
    
    if (insertError) {
      console.error('Failed to insert gap events:', insertError)
      return 0
    }
  }
  
  console.log(`✓ Backfilled ${count} gap events from scans`)
  return count
}

async function backfillVerifiedMemos() {
  console.log('\n✅ Backfilling verified memos...')
  
  const { data: memos, error } = await supabase
    .from('memos')
    .select('*, brand:brand_id(tenant_id)')
    .not('schema_json->verification->verified', 'is', null)
    .order('created_at', { ascending: true })
    .limit(200)
  
  if (error) {
    console.error('Failed to fetch memos:', error)
    return 0
  }
  
  if (!memos || memos.length === 0) {
    console.log('No verified memos found')
    return 0
  }
  
  let count = 0
  const feedEvents: FeedEventInsert[] = []
  
  for (const memo of memos) {
    const tenantId = (memo.brand as { tenant_id: string })?.tenant_id
    const verification = (memo.schema_json as { verification?: {
      verified?: boolean
      verified_at?: string
      time_to_citation_hours?: number
      models_citing?: string[]
      citation_rate?: number
    }})?.verification
    
    if (!tenantId || !verification?.verified) continue
    
    feedEvents.push({
      tenant_id: tenantId,
      brand_id: memo.brand_id,
      workflow: 'verification',
      event_type: 'citation_verified',
      title: `"${memo.title}" now cited`,
      description: `Verified by ${verification.models_citing?.join(', ') || 'AI models'}`,
      severity: 'success',
      action_available: ['view_memo'],
      related_memo_id: memo.id,
      data: {
        verification: {
          memo_title: memo.title,
          memo_slug: memo.slug,
          time_to_citation_hours: verification.time_to_citation_hours || 0,
          citing_models: verification.models_citing || [],
          citation_rate: verification.citation_rate || 0,
        },
      },
      read: true, // Mark as read since it's historical
      created_at: verification.verified_at || memo.created_at,
    })
    
    count++
  }
  
  if (feedEvents.length > 0) {
    const { error: insertError } = await supabase
      .from('feed_events')
      .insert(feedEvents)
    
    if (insertError) {
      console.error('Failed to insert verification events:', insertError)
      return 0
    }
  }
  
  console.log(`✓ Backfilled ${count} verification events`)
  return count
}

async function backfillCompetitorContent() {
  console.log('\n📰 Backfilling competitor content...')
  
  const { data: content, error } = await supabase
    .from('competitor_content')
    .select('*, competitor:competitor_id(id, name, brand_id, brand:brand_id(tenant_id))')
    .in('status', ['pending_response', 'responded'])
    .order('first_seen_at', { ascending: false })
    .limit(200)
  
  if (error) {
    console.error('Failed to fetch competitor content:', error)
    return 0
  }
  
  if (!content || content.length === 0) {
    console.log('No competitor content found')
    return 0
  }
  
  let count = 0
  const feedEvents: FeedEventInsert[] = []
  
  for (const item of content) {
    const competitor = item.competitor as { 
      id: string
      name: string 
      brand_id: string
      brand: { tenant_id: string }
    }
    
    if (!competitor?.brand?.tenant_id) continue
    
    feedEvents.push({
      tenant_id: competitor.brand.tenant_id,
      brand_id: competitor.brand_id,
      workflow: 'competitive_response',
      event_type: 'competitor_published',
      title: `${competitor.name} published: "${item.title?.slice(0, 50)}..."`,
      description: item.content_summary || 'New content detected',
      severity: item.status === 'responded' ? 'info' : 'action_required',
      action_available: item.status === 'responded' ? ['view_competitor'] : ['generate_memo', 'view_competitor', 'dismiss'],
      action_cost_credits: item.status === 'responded' ? 0 : 3,
      related_competitor_id: competitor.id,
      data: {
        competitor_content: {
          competitor_name: competitor.name,
          article_title: item.title,
          article_url: item.url,
          relevance_score: 0.7,
          matched_prompts: item.topics || [],
        },
      },
      read: item.status === 'responded',
      created_at: item.first_seen_at,
    })
    
    count++
  }
  
  if (feedEvents.length > 0) {
    const { error: insertError } = await supabase
      .from('feed_events')
      .insert(feedEvents)
    
    if (insertError) {
      console.error('Failed to insert competitor content events:', insertError)
      return 0
    }
  }
  
  console.log(`✓ Backfilled ${count} competitor content events`)
  return count
}

async function main() {
  console.log('🚀 Starting feed events backfill...\n')
  console.log('This script will populate the feed_events table from existing data.')
  
  // Check if feed_events table exists
  const { error: tableError } = await supabase
    .from('feed_events')
    .select('id')
    .limit(1)
  
  if (tableError) {
    console.error('\n❌ feed_events table not found. Please run the SQL migration first:')
    console.error('   scripts/sql/feed_events.sql')
    process.exit(1)
  }
  
  let totalCount = 0
  
  try {
    totalCount += await backfillFromAlerts()
    totalCount += await backfillGapsFromScans()
    totalCount += await backfillVerifiedMemos()
    totalCount += await backfillCompetitorContent()
    
    console.log(`\n✅ Backfill complete! Created ${totalCount} feed events.`)
    console.log('\nNext steps:')
    console.log('1. Verify data in Supabase: SELECT * FROM feed_events ORDER BY created_at DESC LIMIT 50;')
    console.log('2. Test v2 UI at /v2')
    console.log('3. Enable realtime: ALTER PUBLICATION supabase_realtime ADD TABLE feed_events;')
    
  } catch (error) {
    console.error('\n❌ Backfill failed:', error)
    process.exit(1)
  }
}

main()
