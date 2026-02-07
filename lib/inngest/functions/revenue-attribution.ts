/**
 * Revenue Attribution Pipeline
 * 
 * Connects AI traffic to HubSpot CRM to track:
 * - Which AI-generated content created contacts
 * - Which contacts became deals/pipeline
 * - Which deals closed (revenue attribution)
 * 
 * Flow:
 * 1. AI traffic event → Track visitor with UTM-like params
 * 2. HubSpot form submission → Create contact with source
 * 3. Contact → Deal association → Track pipeline
 * 4. Deal close → Attribute revenue to AI citation
 */

import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { BrandContext, HubSpotConfig } from '@/lib/supabase/types'

const supabase = createServiceRoleClient()

interface HubSpotContact {
  id: string
  properties: {
    email?: string
    firstname?: string
    lastname?: string
    createdate?: string
    ai_source?: string
    ai_content_id?: string
    ai_first_touch?: string
  }
}

interface HubSpotDeal {
  id: string
  properties: {
    dealname?: string
    amount?: string
    dealstage?: string
    closedate?: string
    createdate?: string
    pipeline?: string
  }
  associations?: {
    contacts?: { results: Array<{ id: string }> }
  }
}

interface AttributionEvent {
  id?: string
  brand_id: string
  event_type: 'traffic' | 'contact' | 'deal' | 'closed_won'
  ai_source: string | null
  memo_id: string | null
  gap_id: string | null
  hubspot_contact_id: string | null
  hubspot_deal_id: string | null
  deal_value: number | null
  metadata: Record<string, unknown>
  created_at?: string
}

/**
 * Sync AI traffic with HubSpot contacts
 * Looks for contacts created after AI traffic events and associates them
 */
export const syncAITrafficAttribution = inngest.createFunction(
  {
    id: 'sync-ai-traffic-attribution',
    name: 'Sync AI Traffic Attribution',
    concurrency: { limit: 2 },
  },
  { event: 'attribution/sync' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Get brand with HubSpot config
    const brand = await step.run('get-brand', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (error || !data) throw new Error('Brand not found')
      return data
    })

    const context = brand.context as BrandContext
    const hubspotConfig = context?.hubspot as HubSpotConfig | undefined

    if (!hubspotConfig?.enabled || !hubspotConfig?.access_token) {
      return { success: false, reason: 'HubSpot not configured' }
    }

    // Get recent AI traffic events (last 7 days)
    const trafficEvents = await step.run('get-traffic', async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const { data } = await supabase
        .from('ai_traffic')
        .select('*')
        .eq('brand_id', brandId)
        .neq('referrer_source', 'organic')
        .neq('referrer_source', 'direct_nav')
        .gte('timestamp', sevenDaysAgo)
        .order('timestamp', { ascending: false })

      return data || []
    })

    if (trafficEvents.length === 0) {
      return { success: true, message: 'No AI traffic to attribute', contacts: 0 }
    }

    // Get recent HubSpot contacts (created in last 7 days)
    const contacts = await step.run('get-hubspot-contacts', async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime()
      
      const response = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hubspotConfig.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: 'createdate',
                operator: 'GTE',
                value: sevenDaysAgo,
              }],
            }],
            properties: ['email', 'firstname', 'lastname', 'createdate', 'ai_source', 'ai_content_id', 'ai_first_touch'],
            limit: 100,
          }),
        }
      )

      if (!response.ok) {
        console.error('HubSpot contacts fetch failed:', response.status)
        return []
      }

      const data = await response.json()
      return (data.results || []) as HubSpotContact[]
    })

    // Match contacts to AI traffic by time proximity and email domain pattern
    const attributions: AttributionEvent[] = []

    await step.run('match-contacts', async () => {
      for (const contact of contacts) {
        // Skip if already attributed
        if (contact.properties.ai_source) continue

        const contactCreated = new Date(contact.properties.createdate || '').getTime()
        
        // Find AI traffic within 30 minutes before contact creation
        const matchingTraffic = trafficEvents.find(traffic => {
          const trafficTime = new Date(traffic.timestamp).getTime()
          const timeDiff = contactCreated - trafficTime
          // Traffic should be within 30 minutes before contact creation
          return timeDiff >= 0 && timeDiff <= 30 * 60 * 1000
        })

        if (matchingTraffic) {
          // Update HubSpot contact with AI source
          await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contact.id}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${hubspotConfig.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                properties: {
                  ai_source: matchingTraffic.referrer_source,
                  ai_content_id: matchingTraffic.memo_id || null,
                  ai_first_touch: matchingTraffic.timestamp,
                },
              }),
            }
          )

          // Record attribution event
          attributions.push({
            brand_id: brandId,
            event_type: 'contact',
            ai_source: matchingTraffic.referrer_source,
            memo_id: matchingTraffic.memo_id,
            gap_id: null,
            hubspot_contact_id: contact.id,
            hubspot_deal_id: null,
            deal_value: null,
            metadata: {
              email: contact.properties.email,
              traffic_page: matchingTraffic.page_url,
              traffic_referrer: matchingTraffic.referrer,
            },
          })
        }
      }
    })

    // Save attribution events
    if (attributions.length > 0) {
      await step.run('save-attributions', async () => {
        await supabase.from('attribution_events').insert(attributions)
      })
    }

    return {
      success: true,
      trafficEvents: trafficEvents.length,
      contactsChecked: contacts.length,
      contactsAttributed: attributions.length,
    }
  }
)

/**
 * Sync deals and revenue attribution
 * Tracks deals associated with AI-attributed contacts
 */
export const syncDealAttribution = inngest.createFunction(
  {
    id: 'sync-deal-attribution',
    name: 'Sync Deal Attribution',
    concurrency: { limit: 2 },
  },
  { event: 'attribution/sync-deals' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Get brand with HubSpot config
    const brand = await step.run('get-brand', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (error || !data) throw new Error('Brand not found')
      return data
    })

    const context = brand.context as BrandContext
    const hubspotConfig = context?.hubspot as HubSpotConfig | undefined

    if (!hubspotConfig?.enabled || !hubspotConfig?.access_token) {
      return { success: false, reason: 'HubSpot not configured' }
    }

    // Get AI-attributed contacts
    const attributedContacts = await step.run('get-attributed-contacts', async () => {
      const { data } = await supabase
        .from('attribution_events')
        .select('*')
        .eq('brand_id', brandId)
        .eq('event_type', 'contact')
        .not('hubspot_contact_id', 'is', null)

      return data || []
    })

    if (attributedContacts.length === 0) {
      return { success: true, message: 'No attributed contacts', deals: 0 }
    }

    const contactIds = attributedContacts.map(c => c.hubspot_contact_id).filter(Boolean)

    // Get deals associated with these contacts
    const dealsAttributed: AttributionEvent[] = []
    let totalPipeline = 0
    let totalClosed = 0

    for (const contactId of contactIds) {
      const deals = await step.run(`get-deals-${contactId}`, async () => {
        const response = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/deals`,
          {
            headers: {
              'Authorization': `Bearer ${hubspotConfig.access_token}`,
            },
          }
        )

        if (!response.ok) return []

        const data = await response.json()
        const dealIds = (data.results || []).map((d: { id: string }) => d.id)

        if (dealIds.length === 0) return []

        // Get deal details
        const dealsResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/deals/batch/read`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${hubspotConfig.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              properties: ['dealname', 'amount', 'dealstage', 'closedate', 'createdate', 'pipeline'],
              inputs: dealIds.map((id: string) => ({ id })),
            }),
          }
        )

        if (!dealsResponse.ok) return []

        const dealsData = await dealsResponse.json()
        return (dealsData.results || []) as HubSpotDeal[]
      })

      const contactAttribution = attributedContacts.find(c => c.hubspot_contact_id === contactId)

      for (const deal of deals) {
        const amount = parseFloat(deal.properties.amount || '0')
        const isClosedWon = deal.properties.dealstage === 'closedwon'

        // Check if we already tracked this deal
        const { data: existing } = await supabase
          .from('attribution_events')
          .select('id')
          .eq('hubspot_deal_id', deal.id)
          .single()

        if (!existing) {
          const attribution: AttributionEvent = {
            brand_id: brandId,
            event_type: isClosedWon ? 'closed_won' : 'deal',
            ai_source: contactAttribution?.ai_source || null,
            memo_id: contactAttribution?.memo_id || null,
            gap_id: null,
            hubspot_contact_id: contactId,
            hubspot_deal_id: deal.id,
            deal_value: amount,
            metadata: {
              dealname: deal.properties.dealname,
              dealstage: deal.properties.dealstage,
              closedate: deal.properties.closedate,
            },
          }

          dealsAttributed.push(attribution)

          if (isClosedWon) {
            totalClosed += amount
          } else {
            totalPipeline += amount
          }
        }
      }
    }

    // Save deal attributions
    if (dealsAttributed.length > 0) {
      await step.run('save-deal-attributions', async () => {
        await supabase.from('attribution_events').insert(dealsAttributed)
      })

      // Create alert for new attributed revenue
      if (totalClosed > 0) {
        await step.run('create-revenue-alert', async () => {
          await supabase.from('alerts').insert({
            brand_id: brandId,
            alert_type: 'revenue_attributed',
            title: 'Revenue Attributed to AI Citations',
            message: `$${totalClosed.toLocaleString()} in closed deals attributed to AI-generated content.`,
            data: {
              totalClosed,
              totalPipeline,
              dealsCount: dealsAttributed.length,
            },
          })
        })
      }
    }

    return {
      success: true,
      contactsChecked: contactIds.length,
      dealsAttributed: dealsAttributed.length,
      totalPipeline,
      totalClosed,
    }
  }
)

/**
 * Get attribution metrics for a brand
 */
export const getAttributionMetrics = inngest.createFunction(
  {
    id: 'get-attribution-metrics',
    name: 'Calculate Attribution Metrics',
  },
  { event: 'metrics/attribution' },
  async ({ event, step }) => {
    const { brandId, startDate, endDate } = event.data

    const metrics = await step.run('calculate-metrics', async () => {
      let query = supabase
        .from('attribution_events')
        .select('*')
        .eq('brand_id', brandId)

      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      const { data: events } = await query

      if (!events || events.length === 0) {
        return {
          totalTraffic: 0,
          totalContacts: 0,
          totalDeals: 0,
          closedWonDeals: 0,
          totalPipeline: 0,
          totalRevenue: 0,
          conversionRate: 0,
          avgDealSize: 0,
          topSources: [],
          topContent: [],
        }
      }

      // Calculate metrics
      const contacts = events.filter(e => e.event_type === 'contact')
      const deals = events.filter(e => e.event_type === 'deal' || e.event_type === 'closed_won')
      const closedWon = events.filter(e => e.event_type === 'closed_won')

      const totalPipeline = deals.reduce((sum, d) => sum + (d.deal_value || 0), 0)
      const totalRevenue = closedWon.reduce((sum, d) => sum + (d.deal_value || 0), 0)

      // Top sources by revenue
      const sourceRevenue: Record<string, number> = {}
      for (const event of closedWon) {
        const source = event.ai_source || 'unknown'
        sourceRevenue[source] = (sourceRevenue[source] || 0) + (event.deal_value || 0)
      }
      const topSources = Object.entries(sourceRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([source, revenue]) => ({ source, revenue }))

      // Top content by contacts
      const contentContacts: Record<string, number> = {}
      for (const event of contacts) {
        if (event.memo_id) {
          contentContacts[event.memo_id] = (contentContacts[event.memo_id] || 0) + 1
        }
      }
      const topContent = Object.entries(contentContacts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([memoId, count]) => ({ memoId, contacts: count }))

      return {
        totalTraffic: 0, // Would need ai_traffic table aggregation
        totalContacts: contacts.length,
        totalDeals: deals.length,
        closedWonDeals: closedWon.length,
        totalPipeline,
        totalRevenue,
        conversionRate: contacts.length > 0 ? Math.round((closedWon.length / contacts.length) * 100) : 0,
        avgDealSize: closedWon.length > 0 ? Math.round(totalRevenue / closedWon.length) : 0,
        topSources,
        topContent,
      }
    })

    return metrics
  }
)

/**
 * Scheduled job to sync attribution daily
 */
export const dailyAttributionSync = inngest.createFunction(
  {
    id: 'daily-attribution-sync',
    name: 'Daily Attribution Sync',
  },
  { cron: '0 13 * * *' }, // 8 AM ET = 1 PM UTC
  async ({ step }) => {
    // Get all brands with HubSpot configured
    const brands = await step.run('get-brands', async () => {
      const { data } = await supabase
        .from('brands')
        .select('id, name, context')

      return (data || []).filter(b => {
        const ctx = b.context as BrandContext
        return ctx?.hubspot?.enabled && ctx?.hubspot?.access_token
      })
    })

    if (brands.length === 0) {
      return { success: true, message: 'No brands with HubSpot', synced: 0 }
    }

    // Trigger attribution sync for each brand
    await step.sendEvent(
      'sync-attributions',
      brands.flatMap(brand => [
        { name: 'attribution/sync' as const, data: { brandId: brand.id } },
        { name: 'attribution/sync-deals' as const, data: { brandId: brand.id } },
      ])
    )

    return {
      success: true,
      brandsSynced: brands.length,
    }
  }
)
