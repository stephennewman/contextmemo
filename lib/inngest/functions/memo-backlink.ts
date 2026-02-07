import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { Memo } from '@/lib/supabase/types'

const supabase = createServiceRoleClient()

interface RelatedMemo {
  id: string
  title: string
  slug: string
  memo_type: string
  relevance: 'high' | 'medium' | 'low'
  reason: string
}

/**
 * Find related memos for backlinking
 */
async function findRelatedMemos(
  memo: Memo,
  brandId: string,
  allMemos: Memo[]
): Promise<RelatedMemo[]> {
  const related: RelatedMemo[] = []
  const currentSlug = memo.slug

  for (const other of allMemos) {
    // Skip self
    if (other.id === memo.id) continue
    
    // Skip unpublished
    if (other.status !== 'published') continue

    let relevance: 'high' | 'medium' | 'low' | null = null
    let reason = ''

    // Extract competitor names from slugs
    const currentCompetitor = extractCompetitorFromSlug(currentSlug)
    const otherCompetitor = extractCompetitorFromSlug(other.slug)

    // High relevance: Same competitor, different memo type
    if (currentCompetitor && otherCompetitor && currentCompetitor === otherCompetitor) {
      if (memo.memo_type !== other.memo_type) {
        relevance = 'high'
        reason = `Same competitor: ${currentCompetitor}`
      }
    }

    // High relevance: Comparison memo mentions a competitor that has an alternative memo
    if (memo.memo_type === 'comparison' && other.memo_type === 'alternative') {
      if (currentCompetitor && other.slug.includes(currentCompetitor)) {
        relevance = 'high'
        reason = 'Alternative to compared competitor'
      }
    }

    // High relevance: Alternative memo should link to comparison
    if (memo.memo_type === 'alternative' && other.memo_type === 'comparison') {
      if (otherCompetitor && currentSlug.includes(otherCompetitor)) {
        relevance = 'high'
        reason = 'Direct comparison available'
      }
    }

    // Medium relevance: Same memo type (e.g., all comparisons)
    if (!relevance && memo.memo_type === other.memo_type) {
      relevance = 'medium'
      reason = `Related ${memo.memo_type.replace('_', ' ')}`
    }

    // Medium relevance: How-to memos link to industry memos
    if (!relevance && memo.memo_type === 'how_to' && other.memo_type === 'industry') {
      relevance = 'medium'
      reason = 'Industry context'
    }

    // Medium relevance: Industry memos link to how-to
    if (!relevance && memo.memo_type === 'industry' && other.memo_type === 'how_to') {
      relevance = 'medium'
      reason = 'Practical guide'
    }

    // Low relevance: Any other memo from same brand
    if (!relevance) {
      relevance = 'low'
      reason = 'Related content'
    }

    if (relevance) {
      related.push({
        id: other.id,
        title: other.title,
        slug: other.slug,
        memo_type: other.memo_type,
        relevance,
        reason,
      })
    }
  }

  // Sort by relevance (high first) and limit
  return related
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.relevance] - order[b.relevance]
    })
    .slice(0, 8) // Max 8 related memos
}

/**
 * Extract competitor name from memo slug
 */
function extractCompetitorFromSlug(slug: string): string | null {
  // vs/competitor-name -> competitor-name
  if (slug.startsWith('vs/')) {
    return slug.replace('vs/', '')
  }
  // alternatives-to/competitor-name -> competitor-name
  if (slug.startsWith('alternatives-to/')) {
    return slug.replace('alternatives-to/', '')
  }
  return null
}

/**
 * Inject contextual links into memo content
 */
function injectContextualLinks(
  content: string,
  relatedMemos: RelatedMemo[],
  brandSubdomain: string
): string {
  let updated = content

  // Build a map of competitor names to their memos
  const competitorMemos = new Map<string, RelatedMemo[]>()
  for (const memo of relatedMemos) {
    const competitor = extractCompetitorFromSlug(memo.slug)
    if (competitor) {
      const existing = competitorMemos.get(competitor) || []
      existing.push(memo)
      competitorMemos.set(competitor, existing)
    }
  }

  // Find competitor mentions in content and add links
  // Look for patterns like "**CompetitorName**" or "### CompetitorName"
  for (const [competitor, memos] of competitorMemos) {
    // Convert slug format back to potential name formats
    const nameVariants = [
      competitor.replace(/-/g, ' '), // "competitor-name" -> "competitor name"
      competitor.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), // Title case
      competitor.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(''), // PascalCase
    ]

    for (const name of nameVariants) {
      // Only link the first occurrence to avoid over-linking
      const regex = new RegExp(`\\*\\*${escapeRegex(name)}\\*\\*(?![^\\[]*\\])`, 'i')
      const match = updated.match(regex)
      
      if (match && memos.length > 0) {
        // Prefer comparison memo, then alternative
        const linkMemo = memos.find(m => m.memo_type === 'comparison') 
          || memos.find(m => m.memo_type === 'alternative')
          || memos[0]
        
        const link = `[**${match[0].replace(/\*\*/g, '')}**](/${linkMemo.slug})`
        updated = updated.replace(regex, link)
        break // Only replace first match
      }
    }
  }

  return updated
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Generate "Related Reading" section
 */
function generateRelatedSection(relatedMemos: RelatedMemo[]): string {
  if (relatedMemos.length === 0) return ''

  // Filter to high and medium relevance only for the section
  const toShow = relatedMemos
    .filter(m => m.relevance === 'high' || m.relevance === 'medium')
    .slice(0, 4)

  if (toShow.length === 0) return ''

  let section = '\n\n---\n\n## Related Reading\n\n'
  
  for (const memo of toShow) {
    const typeLabel = memo.memo_type.replace('_', ' ')
    section += `- [${memo.title}](/${memo.slug}) — ${typeLabel}\n`
  }

  return section
}

/**
 * Remove existing Related Reading section if present
 */
function removeExistingRelatedSection(content: string): string {
  // Match "## Related Reading" or "## Related Memos" section and everything after until next ## or end
  const regex = /\n*---\n*## Related (Reading|Memos)\n[\s\S]*?(?=\n---\n|\n## (?!Related)|$)/gi
  return content.replace(regex, '')
}

/**
 * Main backlink function - processes a single memo
 */
export const memoBacklink = inngest.createFunction(
  {
    id: 'memo-backlink',
    name: 'Add Backlinks to Memo',
    concurrency: { limit: 5 },
  },
  { event: 'memo/backlink' },
  async ({ event, step }) => {
    const { memoId, brandId } = event.data

    // Step 1: Get the memo and all related brand memos
    const { memo, brand, allMemos } = await step.run('get-data', async () => {
      const [memoResult, brandResult] = await Promise.all([
        supabase
          .from('memos')
          .select('*')
          .eq('id', memoId)
          .single(),
        supabase
          .from('brands')
          .select('id, subdomain, name')
          .eq('id', brandId)
          .single(),
      ])

      if (memoResult.error || !memoResult.data) {
        throw new Error(`Memo not found: ${memoId}`)
      }

      if (brandResult.error || !brandResult.data) {
        throw new Error(`Brand not found: ${brandId}`)
      }

      // Get all memos for this brand
      const { data: memos } = await supabase
        .from('memos')
        .select('*')
        .eq('brand_id', brandId)
        .eq('status', 'published')

      return {
        memo: memoResult.data as Memo,
        brand: brandResult.data,
        allMemos: (memos || []) as Memo[],
      }
    })

    // Step 2: Find related memos
    const relatedMemos = await step.run('find-related', async () => {
      return findRelatedMemos(memo, brandId, allMemos)
    })

    if (relatedMemos.length === 0) {
      return { success: true, memoId, linksAdded: 0, message: 'No related memos found' }
    }

    // Step 3: Update memo content with backlinks
    const updatedContent = await step.run('inject-links', async () => {
      let content = memo.content_markdown

      // Remove any existing related section first
      content = removeExistingRelatedSection(content)

      // Inject contextual links within content
      content = injectContextualLinks(content, relatedMemos, brand.subdomain)

      // Add related reading section at the end (before footer if exists)
      const relatedSection = generateRelatedSection(relatedMemos)
      
      // Insert before the footer line if it exists
      const footerMatch = content.match(/\n---\n\n\*Context Memo for/)
      if (footerMatch && footerMatch.index !== undefined) {
        content = content.slice(0, footerMatch.index) + relatedSection + content.slice(footerMatch.index)
      } else {
        content += relatedSection
      }

      return content
    })

    // Step 4: Save updated memo
    const result = await step.run('save-memo', async () => {
      const { error } = await supabase
        .from('memos')
        .update({
          content_markdown: updatedContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoId)

      if (error) {
        throw new Error(`Failed to update memo: ${error.message}`)
      }

      return {
        linksAdded: relatedMemos.filter(m => m.relevance === 'high' || m.relevance === 'medium').length,
        relatedMemos: relatedMemos.map(m => ({ title: m.title, relevance: m.relevance })),
      }
    })

    return {
      success: true,
      memoId,
      ...result,
    }
  }
)

/**
 * Batch backlink function - processes all memos for a brand
 * Useful when new memos are added and older ones need updating
 */
export const memoBatchBacklink = inngest.createFunction(
  {
    id: 'memo-batch-backlink',
    name: 'Batch Update Backlinks for Brand',
    concurrency: { limit: 2 },
  },
  { event: 'memo/batch-backlink' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Get all published memos for the brand
    const memos = await step.run('get-memos', async () => {
      const { data, error } = await supabase
        .from('memos')
        .select('id')
        .eq('brand_id', brandId)
        .eq('status', 'published')

      if (error) throw error
      return data || []
    })

    // Trigger backlink update for each memo
    const events = memos.map(memo => ({
      name: 'memo/backlink' as const,
      data: { memoId: memo.id, brandId },
    }))

    if (events.length > 0) {
      await step.sendEvent('trigger-backlinks', events)
    }

    return {
      success: true,
      brandId,
      memosQueued: memos.length,
    }
  }
)

/**
 * Daily backlink refresh - runs for all brands
 * Ensures links stay up-to-date as new content is published
 */
export const dailyBacklinkRefresh = inngest.createFunction(
  {
    id: 'daily-backlink-refresh',
    name: 'Daily Backlink Refresh',
  },
  { cron: '0 7 * * *' }, // 7 AM UTC (2 AM ET) - after daily scans
  async ({ step }) => {
    // Get all brands with published memos
    const brands = await step.run('get-brands', async () => {
      const { data } = await supabase
        .from('brands')
        .select('id, name')

      return data || []
    })

    // For each brand, check if they have new memos in the last 24 hours
    const brandsToUpdate: string[] = []
    
    for (const brand of brands) {
      const hasNewMemos = await step.run(`check-brand-${brand.id}`, async () => {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

        const { count } = await supabase
          .from('memos')
          .select('id', { count: 'exact', head: true })
          .eq('brand_id', brand.id)
          .eq('status', 'published')
          .gte('published_at', yesterday.toISOString())

        return (count || 0) > 0
      })

      if (hasNewMemos) {
        brandsToUpdate.push(brand.id)
      }
    }

    // Trigger batch backlink for brands with new content
    if (brandsToUpdate.length > 0) {
      const events = brandsToUpdate.map(brandId => ({
        name: 'memo/batch-backlink' as const,
        data: { brandId },
      }))

      await step.sendEvent('trigger-batch-backlinks', events)
    }

    return {
      success: true,
      brandsChecked: brands.length,
      brandsUpdated: brandsToUpdate.length,
    }
  }
)
