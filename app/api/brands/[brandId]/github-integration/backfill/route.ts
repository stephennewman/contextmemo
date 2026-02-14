import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { inngest } from '@/lib/inngest/client'
import { isValidUUID } from '@/lib/security/validation'

interface RouteParams {
  params: Promise<{ brandId: string }>
}

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: { name: string; date: string }
  }
  files?: { filename: string; status: string }[]
}

// POST — backfill deploy memos from recent GitHub commit history
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params

  if (!isValidUUID(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify brand ownership
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('tenant_id', user.id)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // Get the integration
  const serviceClient = createServiceRoleClient()
  const { data: integration } = await serviceClient
    .from('github_integrations')
    .select('id, repo_full_name, github_token')
    .eq('brand_id', brandId)
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'No GitHub integration found' }, { status: 404 })
  }

  // Accept repo name from body (first-time setup) or use stored one
  const body = await request.json().catch(() => ({}))
  const repoFullName = body.repoFullName || integration.repo_full_name
  const githubToken = body.githubToken || integration.github_token

  if (!repoFullName || !/^[\w.-]+\/[\w.-]+$/.test(repoFullName)) {
    return NextResponse.json({ error: 'Provide a valid GitHub repo (e.g. owner/repo)' }, { status: 400 })
  }

  // Save repo name + optional token if provided
  const updates: Record<string, unknown> = {
    repo_full_name: repoFullName,
    last_backfill_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (body.githubToken) {
    updates.github_token = body.githubToken
  }
  await serviceClient
    .from('github_integrations')
    .update(updates)
    .eq('brand_id', brandId)

  // Fetch recent commits from GitHub API (last 30 days, up to 100)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'ContextMemo-Backfill',
  }
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`
  }

  let commits: GitHubCommit[]
  try {
    const url = `https://api.github.com/repos/${repoFullName}/commits?sha=main&since=${since}&per_page=100`
    const res = await fetch(url, { headers })

    if (res.status === 404) {
      // Try master branch
      const masterUrl = `https://api.github.com/repos/${repoFullName}/commits?sha=master&since=${since}&per_page=100`
      const masterRes = await fetch(masterUrl, { headers })
      if (!masterRes.ok) {
        const isPrivate = masterRes.status === 404 || masterRes.status === 403
        return NextResponse.json({
          error: isPrivate
            ? 'Repo not found or private. Add a GitHub token for private repos.'
            : `GitHub API error: ${masterRes.status}`,
        }, { status: isPrivate ? 404 : 502 })
      }
      commits = await masterRes.json()
    } else if (!res.ok) {
      const isPrivate = res.status === 403
      return NextResponse.json({
        error: isPrivate
          ? 'Repo is private. Add a GitHub personal access token to backfill.'
          : `GitHub API error: ${res.status}`,
      }, { status: isPrivate ? 403 : 502 })
    } else {
      commits = await res.json()
    }
  } catch (err) {
    console.error('[backfill] GitHub API error:', err)
    return NextResponse.json({ error: 'Failed to fetch commits from GitHub' }, { status: 502 })
  }

  if (!Array.isArray(commits) || commits.length === 0) {
    return NextResponse.json({ ok: true, batches: 0, message: 'No commits found in the last 30 days' })
  }

  // Group commits by date (one batch per day)
  const byDate = new Map<string, GitHubCommit[]>()
  for (const commit of commits) {
    const date = commit.commit.author.date.split('T')[0]
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(commit)
  }

  // Send each day's batch to deploy-analyze (most recent first)
  const sortedDates = [...byDate.keys()].sort().reverse()
  let batchesSent = 0

  for (const date of sortedDates) {
    const dayCommits = byDate.get(date)!
    const formattedCommits = dayCommits.map(c => ({
      sha: c.sha,
      message: c.commit.message,
      added: (c.files || []).filter(f => f.status === 'added').map(f => f.filename),
      removed: (c.files || []).filter(f => f.status === 'removed').map(f => f.filename),
      modified: (c.files || []).filter(f => f.status === 'modified' || f.status === 'changed').map(f => f.filename),
      timestamp: c.commit.author.date,
      author: c.commit.author.name,
    }))

    await inngest.send({
      name: 'deploy/analyze',
      data: {
        repo: repoFullName,
        branch: 'main',
        commits: formattedCommits,
        compareUrl: `https://github.com/${repoFullName}/commits/main?since=${date}`,
        brandId,
        pushedAt: `${date}T00:00:00Z`,
      },
    })
    batchesSent++
  }

  return NextResponse.json({
    ok: true,
    batches: batchesSent,
    totalCommits: commits.length,
    dateRange: {
      from: sortedDates[sortedDates.length - 1],
      to: sortedDates[0],
    },
    message: `Queued ${batchesSent} deploy batches for analysis. Significant deploys will generate memos within a few minutes.`,
  })
}
