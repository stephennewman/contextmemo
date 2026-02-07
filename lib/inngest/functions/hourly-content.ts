import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { trackJobStart, trackJobEnd } from '@/lib/utils/job-tracker'
import { getAllBrandSettings } from '@/lib/utils/brand-settings'
import { canBrandSpend } from '@/lib/utils/budget-guard'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Hourly Content Generator - Runs every hour 9am-5pm ET
 * Processes ONE piece of competitor content per brand per hour
 * This creates a natural, gradual content pipeline
 */
export const hourlyContentGenerate = inngest.createFunction(
  { 
    id: 'hourly-content-generate', 
    name: 'Hourly Content Generation',
  },
  // Runs at the top of each hour, 9am-5pm ET (14:00-22:00 UTC)
  // Weekdays only (Mon-Fri)
  { cron: '0 14-22 * * 1-5' },
  async ({ step }) => {
    // Step 1: Get all active brands
    const brands = await step.run('get-brands', async () => {
      const { data } = await supabase
        .from('brands')
        .select('id, name, tenant_id')
        .or('is_paused.is.null,is_paused.eq.false')
        .order('created_at', { ascending: true })

      return data || []
    })

    if (brands.length === 0) {
      return { success: true, message: 'No brands to process' }
    }

    // Step 1b: Load settings to check which brands have content generation enabled
    const settingsMap = await step.run('load-settings', async () => {
      const map = await getAllBrandSettings(brands.map(b => b.id))
      const result: Record<string, { auto_respond_content: boolean; content_generation_schedule: string }> = {}
      for (const [id, s] of map) {
        result[id] = { auto_respond_content: s.auto_respond_content, content_generation_schedule: s.content_generation_schedule }
      }
      return result
    })

    // Filter brands to only those with content generation enabled and not 'off'
    const eligibleBrands = brands.filter(b => {
      const s = settingsMap[b.id]
      return s && s.auto_respond_content && s.content_generation_schedule !== 'off'
    })

    if (eligibleBrands.length === 0) {
      return { success: true, message: 'No brands with content generation enabled' }
    }

    const results: Array<{ brandId: string; brandName: string; action: string }> = []

    // Step 2: For each eligible brand, process ONE piece of content
    for (const brand of eligibleBrands) {
      const result = await step.run(`process-brand-${brand.id}`, async () => {
        // Budget check
        const allowed = await canBrandSpend(brand.id)
        if (!allowed) {
          return { action: 'skip', reason: 'budget_exceeded' }
        }

        // First, check if there's any content pending response (ready to generate memo)
        const { data: competitors } = await supabase
          .from('competitors')
          .select('id')
          .eq('brand_id', brand.id)

        const competitorIds = (competitors || []).map(c => c.id)
        
        if (competitorIds.length === 0) {
          return { action: 'skip', reason: 'no_competitors' }
        }

        // Check for pending_response content (already classified, needs memo)
        const { data: pendingContent } = await supabase
          .from('competitor_content')
          .select('id')
          .in('competitor_id', competitorIds)
          .eq('status', 'pending_response')
          .limit(1)

        if (pendingContent && pendingContent.length > 0) {
          // Trigger memo generation for this ONE piece
          await inngest.send({
            name: 'competitor/content-respond',
            data: { brandId: brand.id, limit: 1 },
          })
          return { action: 'generate_memo', contentId: pendingContent[0].id }
        }

        // If no pending, check for unclassified content
        const { data: newContent } = await supabase
          .from('competitor_content')
          .select('id')
          .in('competitor_id', competitorIds)
          .eq('status', 'new')
          .limit(1)

        if (newContent && newContent.length > 0) {
          // Trigger classification for this brand
          await inngest.send({
            name: 'competitor/content-classify',
            data: { brandId: brand.id, limit: 5 }, // Classify a small batch
          })
          return { action: 'classify', count: 1 }
        }

        // Nothing to do - maybe scan for new content
        return { action: 'idle', reason: 'no_pending_content' }
      })

      results.push({
        brandId: brand.id,
        brandName: brand.name,
        action: result.action,
      })
    }

    return {
      success: true,
      processed: results.filter(r => r.action !== 'idle' && r.action !== 'skip').length,
      results,
    }
  }
)

/**
 * Generate ONE memo for a specific brand
 * Called by the hourly job with limit: 1
 */
export const contentRespondSingle = inngest.createFunction(
  { 
    id: 'content-respond-single', 
    name: 'Generate Single Memo',
    concurrency: { limit: 1 },
  },
  { event: 'content/respond-single' },
  async ({ event, step }) => {
    const { brandId, contentId } = event.data

    // Track job
    const jobId = await step.run('track-start', async () => {
      return await trackJobStart(brandId, 'generate', { single: true })
    })

    try {
      // Get the specific content to respond to
      const content = await step.run('get-content', async () => {
        const { data } = await supabase
          .from('competitor_content')
          .select('*, competitor:competitor_id(name, domain)')
          .eq('id', contentId)
          .single()
        
        return data
      })

      if (!content) {
        await trackJobEnd(jobId)
        return { success: false, error: 'Content not found' }
      }

      // Trigger the main respond function which will handle the actual generation
      await step.sendEvent('trigger-respond', {
        name: 'competitor/content-respond',
        data: { brandId, limit: 1 },
      })

      await step.run('track-end', async () => {
        await trackJobEnd(jobId)
      })

      return { success: true, contentId }
    } catch (error) {
      await trackJobEnd(jobId)
      throw error
    }
  }
)
