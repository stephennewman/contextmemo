import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { logSingleUsage } from '@/lib/utils/usage-logger'
import { emitFeedEvent } from '@/lib/feed/emit'

const supabase = createServiceRoleClient()

// Commit messages matching these patterns are never publish-worthy
const SKIP_PATTERNS = [
  /^fix[:(]/i,
  /^fix:/i,
  /^fix\b/i,
  /^docs:/i,
  /^chore:/i,
  /^test/i,
  /^ci[:(]/i,
  /^build[:(]/i,
  /^style[:(]/i,
  /^refactor[:(]/i,
  /typescript error/i,
  /type error/i,
  /build error/i,
  /build failure/i,
  /deploy log/i,
  /update.*onboarding/i,
  /update.*changelog/i,
  /update.*readme/i,
  /update.*documentation/i,
  /trigger.*rebuild/i,
  /trigger.*redeploy/i,
  /trigger.*sync/i,
  /bump version/i,
  /merge branch/i,
  /revert/i,
  /^wip/i,
]

// File patterns that indicate internal-only changes
const INTERNAL_FILE_PATTERNS = [
  /\.md$/,
  /\.test\./,
  /\.spec\./,
  /scripts\//,
  /\.env/,
  /package-lock/,
  /tsconfig/,
  /\.eslint/,
  /\.prettier/,
  /next\.config/,
  /sentry/i,
]

interface CommitData {
  sha: string
  message: string
  added: string[]
  removed: string[]
  modified: string[]
  timestamp: string
  author: string
}

// Fallback brand ID for the legacy webhook (Context Memo's own brand)
const LEGACY_BRAND_ID = '9fa32d64-e1c6-4be3-b12c-1be824a6c63f'

export const deployAnalyze = inngest.createFunction(
  {
    id: 'deploy-analyze',
    name: 'Analyze Deploy for Memo Generation',
    concurrency: { limit: 1 },
  },
  { event: 'deploy/analyze' },
  async ({ event, step }) => {
    const { repo, commits, compareUrl, brandId: explicitBrandId, pushedAt } = event.data as {
      repo: string
      commits: CommitData[]
      compareUrl: string
      brandId?: string
      pushedAt?: string
    }

    // Use explicit brandId from per-brand webhook, fall back to legacy default
    const brandId = explicitBrandId || LEGACY_BRAND_ID

    // Get tenant_id for feed events and usage logging
    const tenantId = await step.run('get-tenant', async () => {
      const { data: brand } = await supabase
        .from('brands')
        .select('tenant_id')
        .eq('id', brandId)
        .single()
      return brand?.tenant_id || null
    })

    // Format a deploy date label for feed events
    const deployDateLabel = pushedAt
      ? new Date(pushedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'recent'

    // Step 1: Filter out obviously non-publish-worthy commits
    const candidates = await step.run('filter-commits', () => {
      return commits.filter(commit => {
        const msg = commit.message.split('\n')[0] // First line only

        // Skip if message matches any skip pattern
        if (SKIP_PATTERNS.some(p => p.test(msg))) return false

        // Skip if ALL changed files are internal
        const allFiles = [...commit.added, ...commit.removed, ...commit.modified]
        if (allFiles.length > 0 && allFiles.every(f => INTERNAL_FILE_PATTERNS.some(p => p.test(f)))) {
          return false
        }

        return true
      })
    })

    if (candidates.length === 0) {
      // No feed event for pre-filter skip — these are routine (bug fixes, docs, etc.)
      return { status: 'skipped', reason: 'No publish-worthy commits after filtering', totalCommits: commits.length }
    }

    // Step 2: Ask GPT-4o-mini to classify the batch of commits
    const classification = await step.run('classify-deploy', async () => {
      const commitSummary = candidates.map(c => {
        const files = [...c.added.map(f => `+ ${f}`), ...c.modified.map(f => `~ ${f}`), ...c.removed.map(f => `- ${f}`)].slice(0, 20)
        return `[${c.sha.slice(0, 7)}] ${c.message.split('\n')[0]}\n  Files: ${files.join(', ') || 'none listed'}`
      }).join('\n\n')

      const prompt = `You analyze software deploys to determine if they contain externally meaningful product changes worth writing about.

A deploy is "publish-worthy" if it introduces:
- A new user-facing feature or capability
- A new integration with another product
- A significant improvement to existing functionality that customers would notice
- A new data source, model, or algorithm that changes what the product can do

A deploy is NOT publish-worthy if it's:
- A bug fix, crash fix, or error handling improvement
- Internal refactoring or code cleanup
- UI tweaks, styling changes, or layout adjustments
- Build/deploy infrastructure changes
- Performance optimizations (unless dramatic and user-visible)
- Admin/internal tooling changes

Here are the commits from this deploy:

${commitSummary}

If ANY of the commits contain a publish-worthy change, respond with a JSON object:
{
  "publish_worthy": true,
  "topic_title": "A specific, search-optimized article title (e.g., 'How to Monitor Multiple AI Models for Brand Visibility')",
  "topic_description": "1-2 sentence description of what the article would cover, grounded in what actually shipped",
  "reasoning": "Brief explanation of why this is externally meaningful",
  "source_commits": ["sha1", "sha2"]
}

If NONE are publish-worthy, respond with:
{
  "publish_worthy": false,
  "reasoning": "Brief explanation of why these are internal-only changes"
}

Respond ONLY with the JSON object, no other text.`

      const { text, usage } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        temperature: 0.1,
      })

      if (tenantId) {
        await logSingleUsage(
          tenantId, brandId, 'deploy_analyze',
          'gpt-4o-mini', usage?.inputTokens || 0, usage?.outputTokens || 0
        )
      }

      // Parse the JSON response
      try {
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        return JSON.parse(cleaned) as {
          publish_worthy: boolean
          topic_title?: string
          topic_description?: string
          reasoning: string
          source_commits?: string[]
        }
      } catch {
        console.error('[deploy-analyze] Failed to parse classification:', text)
        return { publish_worthy: false, reasoning: 'Failed to parse AI classification' }
      }
    })

    if (!classification.publish_worthy || !classification.topic_title) {
      // Feed event: deploy analyzed but nothing significant
      if (tenantId) {
        await step.run('feed-not-publish-worthy', () =>
          emitFeedEvent({
            tenant_id: tenantId,
            brand_id: brandId,
            workflow: 'system',
            event_type: 'setup_complete',
            title: `Deploy analyzed (${deployDateLabel}): no significant changes`,
            description: `${candidates.length} commit${candidates.length === 1 ? '' : 's'} reviewed — ${classification.reasoning}`,
            severity: 'info',
          })
        )
      }
      return {
        status: 'not_publish_worthy',
        reasoning: classification.reasoning,
        totalCommits: commits.length,
        candidatesAnalyzed: candidates.length,
      }
    }

    // Step 3: Check for duplicate — don't regenerate a memo on the same topic
    const isDuplicate = await step.run('check-duplicate', async () => {
      const { data: existing } = await supabase
        .from('memos')
        .select('id, title')
        .eq('brand_id', brandId)
        .eq('memo_type', 'product_deploy')
        .ilike('title', `%${classification.topic_title!.slice(0, 40)}%`)
        .limit(1)

      return (existing && existing.length > 0) ? existing[0] : null
    })

    if (isDuplicate) {
      if (tenantId) {
        await step.run('feed-duplicate', () =>
          emitFeedEvent({
            tenant_id: tenantId,
            brand_id: brandId,
            workflow: 'system',
            event_type: 'setup_complete',
            title: `Deploy analyzed (${deployDateLabel}): similar memo exists`,
            description: `"${isDuplicate.title}" already covers this topic`,
            severity: 'info',
            related_memo_id: isDuplicate.id,
            action_available: ['view_memo'],
          })
        )
      }
      return {
        status: 'duplicate',
        existingMemoId: isDuplicate.id,
        existingTitle: isDuplicate.title,
        proposedTitle: classification.topic_title,
      }
    }

    // Step 4: Trigger memo generation with commit context
    await step.run('trigger-memo', async () => {
      // Build a commit summary so the memo generator has real context
      const commitSummary = candidates
        .filter(c => classification.source_commits?.includes(c.sha) || !classification.source_commits)
        .slice(0, 5)
        .map(c => {
          const files = [...c.added.map(f => `+ ${f}`), ...c.modified.map(f => `~ ${f}`)].slice(0, 10)
          return `- ${c.message.split('\n')[0]}${files.length > 0 ? `\n  Files: ${files.join(', ')}` : ''}`
        })
        .join('\n')

      // Determine the deploy date from the most recent candidate commit, or pushedAt
      const deployDate = candidates[0]?.timestamp || pushedAt || undefined

      await inngest.send({
        name: 'memo/generate',
        data: {
          brandId,
          memoType: 'product_deploy',
          topicTitle: classification.topic_title!,
          topicDescription: classification.topic_description || '',
          deployCommitSummary: commitSummary,
          deployDate,
        },
      })
    })

    // Feed event: memo being generated
    if (tenantId) {
      await step.run('feed-memo-triggered', () =>
        emitFeedEvent({
          tenant_id: tenantId,
          brand_id: brandId,
          workflow: 'core_discovery',
          event_type: 'scan_complete',
          title: `Deploy memo generating: "${classification.topic_title}"`,
          description: `${deployDateLabel} deploy — ${classification.reasoning}`,
          severity: 'success',
        })
      )
    }

    return {
      status: 'memo_triggered',
      topicTitle: classification.topic_title,
      topicDescription: classification.topic_description,
      reasoning: classification.reasoning,
      sourceCommits: classification.source_commits,
      totalCommits: commits.length,
      candidatesAnalyzed: candidates.length,
      compareUrl,
    }
  }
)
