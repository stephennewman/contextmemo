import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import crypto from 'crypto'

interface RouteParams {
  params: Promise<{ brandId: string }>
}

// Per-brand GitHub webhook: receives push events and triggers deploy analysis
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params

  // Basic UUID format check
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // Look up this brand's GitHub integration
  const { data: integration } = await supabase
    .from('github_integrations')
    .select('webhook_secret, enabled')
    .eq('brand_id', brandId)
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'No GitHub integration found for this brand' }, { status: 404 })
  }

  if (!integration.enabled) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Integration disabled' })
  }

  // Verify GitHub signature
  const signature = request.headers.get('x-hub-signature-256')
  const body = await request.text()

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', integration.webhook_secret)
    .update(body)
    .digest('hex')

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = request.headers.get('x-github-event')

  // Only process push events
  if (event !== 'push') {
    return NextResponse.json({ ok: true, skipped: true, reason: `Event type: ${event}` })
  }

  const payload = JSON.parse(body)

  // Only process pushes to main/master branch
  if (payload.ref !== 'refs/heads/main' && payload.ref !== 'refs/heads/master') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Not main/master branch' })
  }

  // Extract commit info
  const commits = (payload.commits || []).map((c: { id: string; message: string; added: string[]; removed: string[]; modified: string[]; timestamp: string; author: { name: string } }) => ({
    sha: c.id,
    message: c.message,
    added: c.added || [],
    removed: c.removed || [],
    modified: c.modified || [],
    timestamp: c.timestamp,
    author: c.author?.name,
  }))

  if (commits.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'No commits' })
  }

  const repoFullName = payload.repository?.full_name || ''
  const compareUrl = payload.compare || ''

  // Send to Inngest for analysis — brandId comes from the URL
  await inngest.send({
    name: 'deploy/analyze',
    data: {
      repo: repoFullName,
      branch: payload.ref.replace('refs/heads/', ''),
      commits,
      compareUrl,
      brandId, // Pass brand ID explicitly
      pushedAt: new Date().toISOString(),
    },
  })

  return NextResponse.json({
    ok: true,
    queued: true,
    commits: commits.length,
  })
}
