import { NextRequest, NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'
import crypto from 'crypto'

// GitHub sends push events here when code is deployed to main
export async function POST(request: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) {
    console.error('[GitHub Webhook] GITHUB_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Verify GitHub signature
  const signature = request.headers.get('x-hub-signature-256')
  const body = await request.text()

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
  }

  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', secret)
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

  // Only process pushes to main branch
  if (payload.ref !== 'refs/heads/main') {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Not main branch' })
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

  // Send to Inngest for analysis
  await inngest.send({
    name: 'deploy/analyze',
    data: {
      repo: repoFullName,
      branch: 'main',
      commits,
      compareUrl,
      pushedAt: new Date().toISOString(),
    },
  })

  return NextResponse.json({ 
    ok: true, 
    queued: true, 
    commits: commits.length,
  })
}
