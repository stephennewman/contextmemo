import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://contextmemo.com'

// Send at a specific from address - use custom domain when available
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Context Memo <onboarding@resend.dev>'

interface BrandDigest {
  brandId: string
  brandName: string
  domain: string
  subdomain: string
  // Scores
  visibilityScore: number
  previousScore: number | null
  scoreDelta: number
  // Scan stats (last 24h)
  totalScans: number
  citedScans: number
  mentionedScans: number
  citationRate: number
  // Wins & losses
  firstCitations: number   // brand_mentioned for first time on a query
  lostCitations: number    // queries that lost citation
  // Content
  memosGenerated: number
  memosPublished: number
  // Competitors
  competitorContentDetected: number
  topCompetitors: Array<{ name: string; count: number }>
  // Prompts
  totalActivePrompts: number
  promptsWithCitations: number
  // Notable events
  streakMilestones: Array<{ query: string; streak: number }>
}

interface TenantDigest {
  tenantId: string
  email: string
  name: string | null
  brands: BrandDigest[]
}

/**
 * Daily Digest Email - Sends at 9 AM ET (2 PM UTC)
 * Summarizes the last 24 hours of activity for each brand
 */
export const dailyDigest = inngest.createFunction(
  {
    id: 'daily-digest',
    name: 'Daily Digest Email',
    retries: 2,
  },
  { cron: '0 14 * * *' }, // 9 AM ET = 2 PM UTC
  async ({ step }) => {
    if (!RESEND_API_KEY) {
      console.log('[Daily Digest] RESEND_API_KEY not set, skipping')
      return { success: false, reason: 'no_resend_key' }
    }

    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const yesterday = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const yesterdayDate = yesterday.toISOString().split('T')[0]

    // Step 1: Get all tenants with their brands
    const tenants = await step.run('get-tenants-and-brands', async () => {
      const { data: allBrands, error } = await supabase
        .from('brands')
        .select('id, tenant_id, name, domain, subdomain, visibility_score, is_paused')
        .or('is_paused.is.null,is_paused.eq.false')

      if (error || !allBrands?.length) {
        console.log('[Daily Digest] No active brands found')
        return []
      }

      // Get unique tenant IDs
      const tenantIds = [...new Set(allBrands.map(b => b.tenant_id))]

      const { data: tenantRows } = await supabase
        .from('tenants')
        .select('id, email, name')
        .in('id', tenantIds)

      if (!tenantRows?.length) return []

      return tenantRows.map(t => ({
        tenantId: t.id,
        email: t.email,
        name: t.name,
        brands: allBrands
          .filter(b => b.tenant_id === t.id)
          .map(b => ({
            id: b.id,
            name: b.name,
            domain: b.domain,
            subdomain: b.subdomain,
            visibilityScore: b.visibility_score || 0,
          })),
      }))
    })

    if (!tenants.length) {
      return { success: true, message: 'No tenants to email', sent: 0 }
    }

    // Step 2: Build digest for each tenant
    const digests: TenantDigest[] = await step.run('build-digests', async () => {
      const results: TenantDigest[] = []

      for (const tenant of tenants) {
        const brandDigests: BrandDigest[] = []

        for (const brand of tenant.brands) {
          // Get yesterday's visibility score for comparison
          const { data: historyRow } = await supabase
            .from('visibility_history')
            .select('visibility_score')
            .eq('brand_id', brand.id)
            .eq('recorded_date', yesterdayDate)
            .single()

          const previousScore = historyRow?.visibility_score ?? null
          const scoreDelta = previousScore !== null
            ? brand.visibilityScore - previousScore
            : 0

          // Get scan results from last 24 hours
          const { data: recentScans } = await supabase
            .from('scan_results')
            .select('brand_mentioned, brand_in_citations, is_first_citation, competitors_mentioned')
            .eq('brand_id', brand.id)
            .gte('scanned_at', twentyFourHoursAgo)

          const scans = recentScans || []
          const totalScans = scans.length
          const citedScans = scans.filter(s => s.brand_in_citations).length
          const mentionedScans = scans.filter(s => s.brand_mentioned).length
          const firstCitations = scans.filter(s => s.is_first_citation).length
          const citationRate = totalScans > 0 ? Math.round((mentionedScans / totalScans) * 100) : 0

          // Count competitor mentions across scans
          const compCounts: Record<string, number> = {}
          for (const scan of scans) {
            if (scan.competitors_mentioned) {
              for (const comp of scan.competitors_mentioned) {
                compCounts[comp] = (compCounts[comp] || 0) + 1
              }
            }
          }
          const topCompetitors = Object.entries(compCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }))

          // Get lost citations (queries where citation was lost in last 24h)
          const { count: lostCount } = await supabase
            .from('queries')
            .select('id', { count: 'exact', head: true })
            .eq('brand_id', brand.id)
            .eq('current_status', 'lost_citation')
            .gte('citation_lost_at', twentyFourHoursAgo)

          // Get memos generated in last 24h
          const { count: memosGenerated } = await supabase
            .from('memos')
            .select('id', { count: 'exact', head: true })
            .eq('brand_id', brand.id)
            .gte('created_at', twentyFourHoursAgo)

          const { count: memosPublished } = await supabase
            .from('memos')
            .select('id', { count: 'exact', head: true })
            .eq('brand_id', brand.id)
            .eq('status', 'published')
            .gte('published_at', twentyFourHoursAgo)

          // Get competitor content detected in last 24h
          const { count: competitorContent } = await supabase
            .from('competitor_content')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'new')
            .gte('first_seen_at', twentyFourHoursAgo)

          // Get prompt stats
          const { count: totalActivePrompts } = await supabase
            .from('queries')
            .select('id', { count: 'exact', head: true })
            .eq('brand_id', brand.id)
            .eq('is_active', true)
            .is('excluded_at', null)

          const { count: promptsWithCitations } = await supabase
            .from('queries')
            .select('id', { count: 'exact', head: true })
            .eq('brand_id', brand.id)
            .eq('current_status', 'cited')
            .eq('is_active', true)

          // Get streak milestones (queries hitting 5+ streaks recently)
          const { data: streakQueries } = await supabase
            .from('queries')
            .select('query_text, citation_streak')
            .eq('brand_id', brand.id)
            .gte('citation_streak', 5)
            .gte('last_scanned_at', twentyFourHoursAgo)
            .order('citation_streak', { ascending: false })
            .limit(3)

          brandDigests.push({
            brandId: brand.id,
            brandName: brand.name,
            domain: brand.domain,
            subdomain: brand.subdomain,
            visibilityScore: brand.visibilityScore,
            previousScore,
            scoreDelta,
            totalScans,
            citedScans,
            mentionedScans,
            citationRate,
            firstCitations,
            lostCitations: lostCount || 0,
            memosGenerated: memosGenerated || 0,
            memosPublished: memosPublished || 0,
            competitorContentDetected: competitorContent || 0,
            topCompetitors,
            totalActivePrompts: totalActivePrompts || 0,
            promptsWithCitations: promptsWithCitations || 0,
            streakMilestones: (streakQueries || []).map(q => ({
              query: q.query_text,
              streak: q.citation_streak,
            })),
          })
        }

        results.push({
          tenantId: tenant.tenantId,
          email: tenant.email,
          name: tenant.name,
          brands: brandDigests,
        })
      }

      return results
    })

    // Step 3: Send emails
    const emailResults = await step.run('send-emails', async () => {
      const results: Array<{ email: string; success: boolean; error?: string }> = []

      for (const digest of digests) {
        // Skip tenants with no scan activity (nothing to report)
        const hasActivity = digest.brands.some(b => b.totalScans > 0 || b.memosGenerated > 0)
        if (!hasActivity) {
          results.push({ email: digest.email, success: true, error: 'skipped_no_activity' })
          continue
        }

        const html = buildDigestEmail(digest)
        const subject = buildSubjectLine(digest)

        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: FROM_EMAIL,
              to: [digest.email],
              subject,
              html,
            }),
          })

          if (!response.ok) {
            const error = await response.text()
            console.error(`[Daily Digest] Failed to send to ${digest.email}:`, error)
            results.push({ email: digest.email, success: false, error })
          } else {
            const result = await response.json()
            console.log(`[Daily Digest] Sent to ${digest.email}, ID: ${result.id}`)
            results.push({ email: digest.email, success: true })
          }
        } catch (err) {
          console.error(`[Daily Digest] Error sending to ${digest.email}:`, err)
          results.push({ email: digest.email, success: false, error: String(err) })
        }
      }

      return results
    })

    return {
      success: true,
      tenantsProcessed: digests.length,
      emailsSent: emailResults.filter(r => r.success && !r.error).length,
      skipped: emailResults.filter(r => r.error === 'skipped_no_activity').length,
      failed: emailResults.filter(r => !r.success).length,
      timestamp: now.toISOString(),
    }
  }
)

// ---------------------------------------------------------------------------
// Email building helpers
// ---------------------------------------------------------------------------

function buildSubjectLine(digest: TenantDigest): string {
  // Single brand: show that brand's score
  if (digest.brands.length === 1) {
    const b = digest.brands[0]
    const delta = b.scoreDelta > 0 ? ` (+${b.scoreDelta})` : b.scoreDelta < 0 ? ` (${b.scoreDelta})` : ''
    const wins = b.firstCitations > 0 ? ` · ${b.firstCitations} new citation${b.firstCitations > 1 ? 's' : ''}` : ''
    return `${b.brandName} · Visibility ${b.visibilityScore}%${delta}${wins}`
  }

  // Multiple brands: summary
  const totalFirst = digest.brands.reduce((sum, b) => sum + b.firstCitations, 0)
  const avgScore = Math.round(digest.brands.reduce((sum, b) => sum + b.visibilityScore, 0) / digest.brands.length)
  const wins = totalFirst > 0 ? ` · ${totalFirst} new citation${totalFirst > 1 ? 's' : ''}` : ''
  return `Daily Digest · Avg Visibility ${avgScore}%${wins}`
}

function buildPreheader(digest: TenantDigest): string {
  const parts: string[] = []
  for (const b of digest.brands) {
    const delta = b.scoreDelta > 0 ? `+${b.scoreDelta}` : b.scoreDelta < 0 ? `${b.scoreDelta}` : 'no change'
    parts.push(`${b.brandName} ${b.visibilityScore}% (${delta})`)
  }
  const totalWins = digest.brands.reduce((s, b) => s + b.firstCitations, 0)
  const totalLost = digest.brands.reduce((s, b) => s + b.lostCitations, 0)
  if (totalWins > 0) parts.push(`${totalWins} new citation${totalWins > 1 ? 's' : ''}`)
  if (totalLost > 0) parts.push(`${totalLost} lost`)
  return parts.join(' · ')
}

function buildGreeting(digest: TenantDigest): string {
  const totalWins = digest.brands.reduce((s, b) => s + b.firstCitations, 0)
  const totalLost = digest.brands.reduce((s, b) => s + b.lostCitations, 0)
  const avgDelta = digest.brands.reduce((s, b) => s + b.scoreDelta, 0)

  if (totalWins > 0 && totalLost === 0 && avgDelta >= 0) {
    return 'Good news — your AI visibility improved in the last 24 hours.'
  }
  if (totalLost > 0 && totalWins === 0) {
    return 'Heads up — some citations dropped in the last 24 hours. Here\'s the breakdown.'
  }
  if (totalWins > 0 && totalLost > 0) {
    return 'Mixed results in the last 24 hours — some wins, some drops. Here\'s the full picture.'
  }
  if (avgDelta < 0) {
    return 'Your visibility score dipped in the last 24 hours. Here\'s what changed.'
  }
  return 'Here\'s your AI visibility summary for the last 24 hours.'
}

function buildDigestEmail(digest: TenantDigest): string {
  const firstName = digest.name?.split(' ')[0] || 'there'
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const preheader = buildPreheader(digest)
  const greeting = buildGreeting(digest)
  const brandSections = digest.brands.map(b => buildBrandSection(b)).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Digest</title>
  <!--[if !mso]><!-->
  <style>
    @media only screen and (max-width: 480px) {
      .stat-cell { display: block !important; width: 100% !important; box-sizing: border-box !important; margin-bottom: 8px !important; }
      .stat-spacer { display: none !important; }
      .stat-row { display: block !important; }
    }
  </style>
  <!--<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <!-- Preheader (hidden inbox preview text) -->
  <div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}${'&nbsp;&zwnj;'.repeat(40)}
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;background-color:#09090b;border-radius:12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Context Memo</span>
                  </td>
                  <td align="right">
                    <span style="font-size:13px;color:#a1a1aa;">${dateStr}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:32px 32px 16px;background-color:#ffffff;">
              <p style="margin:0;font-size:15px;color:#3f3f46;">Hi ${firstName},</p>
              <p style="margin:8px 0 0;font-size:15px;color:#71717a;">${greeting}</p>
            </td>
          </tr>

          <!-- Brand sections -->
          ${brandSections}

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#ffffff;border-radius:0 0 12px 12px;border-top:1px solid #e4e4e7;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${SITE_URL}/dashboard" style="display:inline-block;padding:10px 20px;background-color:#09090b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">View Dashboard</a>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">
                Sent by Context Memo · AI visibility monitoring running 24/7
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#a1a1aa;">
                <a href="${SITE_URL}/dashboard/settings#notifications" style="color:#a1a1aa;text-decoration:underline;">Unsubscribe</a> or <a href="${SITE_URL}/dashboard/settings#notifications" style="color:#a1a1aa;text-decoration:underline;">manage email preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

function buildBrandSection(b: BrandDigest): string {
  const brandUrl = `${SITE_URL}/dashboard/brands/${b.brandId}`

  // Score delta display
  const deltaColor = b.scoreDelta > 0 ? '#10b981' : b.scoreDelta < 0 ? '#ef4444' : '#a1a1aa'
  const deltaText = b.scoreDelta > 0 ? `+${b.scoreDelta}` : b.scoreDelta < 0 ? `${b.scoreDelta}` : '='
  const deltaArrow = b.scoreDelta > 0 ? '↑' : b.scoreDelta < 0 ? '↓' : ''

  // Check if this is a quiet day (no meaningful activity)
  const isQuietDay = b.totalScans === 0 && b.memosGenerated === 0 && b.firstCitations === 0 && b.lostCitations === 0

  if (isQuietDay) {
    return `
          <tr>
            <td style="padding:0 32px;background-color:#ffffff;">
              <!-- Brand header -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4e4e7;padding-top:24px;margin-top:8px;">
                <tr>
                  <td>
                    <a href="${brandUrl}" style="font-size:16px;font-weight:700;color:#09090b;text-decoration:none;">${b.brandName}</a>
                    <span style="font-size:12px;color:#a1a1aa;margin-left:8px;">${b.domain}</span>
                  </td>
                </tr>
              </table>

              <!-- Quiet day summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;padding-bottom:24px;">
                <tr>
                  <td style="padding:16px;background:#fafafa;border-radius:8px;text-align:center;">
                    <span style="font-size:28px;font-weight:800;color:#09090b;">${b.visibilityScore}%</span>
                    <span style="font-size:11px;color:${deltaColor};font-weight:600;margin-left:8px;">${deltaArrow} ${deltaText}</span>
                    <p style="margin:8px 0 0;font-size:13px;color:#a1a1aa;">Quiet day — no scans ran. Your visibility score is holding steady.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
`
  }

  // Build notable events
  const events: string[] = []
  if (b.firstCitations > 0) {
    events.push(`<tr><td style="padding:4px 0;font-size:13px;"><span style="color:#10b981;font-weight:600;">+ ${b.firstCitations} new citation${b.firstCitations > 1 ? 's' : ''} won</span></td></tr>`)
  }
  if (b.lostCitations > 0) {
    events.push(`<tr><td style="padding:4px 0;font-size:13px;"><span style="color:#ef4444;font-weight:600;">- ${b.lostCitations} citation${b.lostCitations > 1 ? 's' : ''} lost</span></td></tr>`)
  }
  if (b.memosGenerated > 0) {
    events.push(`<tr><td style="padding:4px 0;font-size:13px;color:#71717a;">${b.memosGenerated} memo${b.memosGenerated > 1 ? 's' : ''} generated${b.memosPublished > 0 ? `, ${b.memosPublished} published` : ''}</td></tr>`)
  } else if (b.memosPublished > 0) {
    events.push(`<tr><td style="padding:4px 0;font-size:13px;color:#71717a;">${b.memosPublished} memo${b.memosPublished > 1 ? 's' : ''} published</td></tr>`)
  }
  if (b.competitorContentDetected > 0) {
    events.push(`<tr><td style="padding:4px 0;font-size:13px;color:#f59e0b;">${b.competitorContentDetected} new competitor post${b.competitorContentDetected > 1 ? 's' : ''} detected</td></tr>`)
  }
  for (const s of b.streakMilestones) {
    events.push(`<tr><td style="padding:4px 0;font-size:13px;color:#f97316;">"${truncate(s.query, 45)}" — ${s.streak}-day citation streak</td></tr>`)
  }

  const eventsHtml = events.length > 0
    ? events.join('')
    : `<tr><td style="padding:4px 0;font-size:13px;color:#a1a1aa;">No notable changes today</td></tr>`

  // Top entities (formerly competitors)
  const entitiesHtml = b.topCompetitors.length > 0
    ? b.topCompetitors.map(c =>
        `<span style="display:inline-block;padding:3px 10px;background:#fef2f2;color:#ef4444;border-radius:12px;font-size:11px;font-weight:500;margin:2px 4px 2px 0;">${c.name} (${c.count})</span>`
      ).join('')
    : '<span style="font-size:12px;color:#a1a1aa;">None detected</span>'

  // Coverage bar — use two-cell table approach for Outlook compatibility
  const coveragePct = b.totalActivePrompts > 0 ? Math.round((b.promptsWithCitations / b.totalActivePrompts) * 100) : 0
  const coverageBarFilled = Math.max(coveragePct, 1) // at least 1% so cell renders
  const coverageBarEmpty = 100 - coverageBarFilled

  return `
          <tr>
            <td style="padding:0 32px;background-color:#ffffff;">
              <!-- Brand header -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4e4e7;padding-top:24px;margin-top:8px;">
                <tr>
                  <td>
                    <a href="${brandUrl}" style="font-size:16px;font-weight:700;color:#09090b;text-decoration:none;">${b.brandName}</a>
                    <span style="font-size:12px;color:#a1a1aa;margin-left:8px;">${b.domain}</span>
                  </td>
                  <td align="right">
                    <a href="${brandUrl}" style="font-size:12px;color:#71717a;text-decoration:none;">View brand &rarr;</a>
                  </td>
                </tr>
              </table>

              <!-- Score + Stats Row (responsive: stacks on mobile) -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;" role="presentation">
                <tr class="stat-row">
                  <!-- Visibility Score -->
                  <td width="25%" class="stat-cell" style="padding:12px;background:#fafafa;border-radius:8px;text-align:center;">
                    <span style="font-size:28px;font-weight:800;color:#09090b;">${b.visibilityScore}%</span><br/>
                    <span style="font-size:11px;color:${deltaColor};font-weight:600;">${deltaArrow} ${deltaText}</span><br/>
                    <span style="font-size:10px;color:#a1a1aa;">VISIBILITY</span>
                  </td>
                  <td width="3%" class="stat-spacer">&nbsp;</td>
                  <!-- Scans -->
                  <td width="22%" class="stat-cell" style="padding:12px;background:#fafafa;border-radius:8px;text-align:center;">
                    <span style="font-size:22px;font-weight:700;color:#09090b;">${b.totalScans}</span><br/>
                    <span style="font-size:10px;color:#a1a1aa;">SCANS</span>
                  </td>
                  <td width="3%" class="stat-spacer">&nbsp;</td>
                  <!-- Mentioned -->
                  <td width="22%" class="stat-cell" style="padding:12px;background:#fafafa;border-radius:8px;text-align:center;">
                    <span style="font-size:22px;font-weight:700;color:#10b981;">${b.mentionedScans}</span><br/>
                    <span style="font-size:10px;color:#a1a1aa;">MENTIONED</span>
                  </td>
                  <td width="3%" class="stat-spacer">&nbsp;</td>
                  <!-- Citation Rate -->
                  <td width="22%" class="stat-cell" style="padding:12px;background:#fafafa;border-radius:8px;text-align:center;">
                    <span style="font-size:22px;font-weight:700;color:#8b5cf6;">${b.citationRate}%</span><br/>
                    <span style="font-size:10px;color:#a1a1aa;">CITE RATE</span>
                  </td>
                </tr>
              </table>

              <!-- Prompts coverage bar (Outlook-safe two-cell approach) -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr>
                  <td style="font-size:12px;color:#71717a;">
                    Prompt coverage: <strong>${b.promptsWithCitations}</strong> of <strong>${b.totalActivePrompts}</strong> prompts citing your brand (${coveragePct}%)
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:6px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        <td width="${coverageBarFilled}%" style="background-color:#10b981;height:6px;line-height:6px;font-size:1px;border-radius:4px 0 0 4px;">&nbsp;</td>
                        <td width="${coverageBarEmpty}%" style="background-color:#e4e4e7;height:6px;line-height:6px;font-size:1px;border-radius:0 4px 4px 0;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Notable Events -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr>
                  <td style="font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;">Today's Activity</td>
                </tr>
                ${eventsHtml}
              </table>

              <!-- Top Entities -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;padding-bottom:24px;">
                <tr>
                  <td style="font-size:11px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;">Top Entities Mentioned</td>
                </tr>
                <tr>
                  <td>${entitiesHtml}</td>
                </tr>
              </table>
            </td>
          </tr>
`
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str
}
