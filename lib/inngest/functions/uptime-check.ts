import { inngest } from '../client'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Context Memo <onboarding@resend.dev>'
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://contextmemo.com'

/**
 * Uptime Check - Runs every 5 minutes
 * 
 * Checks critical service health and sends email alerts when issues are detected.
 * 
 * What this catches:
 * - Supabase/Postgres down or degraded
 * - Redis down or unreachable
 * - Health endpoint returning errors
 * 
 * What this does NOT catch (use external monitor for these):
 * - Vercel itself being down (this function runs on Vercel)
 * - DNS failures
 * - SSL certificate issues
 * 
 * Alerts are rate-limited: one email per service per hour to avoid inbox flooding.
 */

// In-memory tracking of last alert times to avoid spamming
// (resets on cold start, which is fine - better to get a duplicate than miss an alert)
const lastAlertSent: Record<string, number> = {}
const ALERT_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour between alerts per service

function shouldSendAlert(serviceKey: string): boolean {
  const last = lastAlertSent[serviceKey]
  if (!last) return true
  return Date.now() - last > ALERT_COOLDOWN_MS
}

function markAlertSent(serviceKey: string) {
  lastAlertSent[serviceKey] = Date.now()
}

async function sendAlertEmail(subject: string, body: string) {
  if (!RESEND_API_KEY || ADMIN_EMAILS.length === 0) {
    console.error('[Uptime] Cannot send alert: RESEND_API_KEY or ADMIN_EMAILS not configured')
    return false
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAILS,
        subject,
        html: body,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[Uptime] Failed to send alert email:', text)
      return false
    }

    return true
  } catch (err) {
    console.error('[Uptime] Error sending alert email:', err)
    return false
  }
}

function buildAlertEmail(failedServices: Array<{ name: string; error: string; latencyMs?: number }>) {
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  const serviceRows = failedServices
    .map(
      (s) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: 600; color: #dc2626;">${s.name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${s.error}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${s.latencyMs !== undefined ? `${s.latencyMs}ms` : 'N/A'}</td>
      </tr>`
    )
    .join('')

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">⚠️ Context Memo - Service Alert</h1>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${timestamp} ET</p>
      </div>
      <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 16px; color: #374151;">One or more services are reporting errors:</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Service</th>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Error</th>
              <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Latency</th>
            </tr>
          </thead>
          <tbody>${serviceRows}</tbody>
        </table>
        <div style="margin-top: 20px; padding: 12px; background: #fef2f2; border-radius: 6px; font-size: 13px; color: #991b1b;">
          <strong>Next check:</strong> 5 minutes. Alerts are rate-limited to 1 per service per hour.
        </div>
        <div style="margin-top: 16px; text-align: center;">
          <a href="${SITE_URL}/api/health" style="display: inline-block; padding: 10px 20px; background: #111827; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">View Health Status</a>
        </div>
      </div>
    </div>
  `
}

function buildRecoveryEmail(recoveredServices: string[]) {
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
  const serviceList = recoveredServices.map((s) => `<li style="padding: 4px 0;">${s}</li>`).join('')

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">✅ Context Memo - Services Recovered</h1>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${timestamp} ET</p>
      </div>
      <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 12px; color: #374151;">The following services are now healthy again:</p>
        <ul style="color: #16a34a; font-weight: 600;">${serviceList}</ul>
        <div style="margin-top: 16px; text-align: center;">
          <a href="${SITE_URL}/api/health" style="display: inline-block; padding: 10px 20px; background: #111827; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">View Health Status</a>
        </div>
      </div>
    </div>
  `
}

// Track which services were previously down (for recovery notifications)
const previouslyDown: Set<string> = new Set()

export const uptimeCheck = inngest.createFunction(
  {
    id: 'uptime-check',
    name: 'Uptime Health Check',
    retries: 0, // Don't retry - the next cron tick will handle it
  },
  { cron: '*/5 * * * *' }, // Every 5 minutes
  async ({ step }) => {
    // Check health by hitting our own endpoint
    const healthResult = await step.run('check-health', async () => {
      try {
        const response = await fetch(`${SITE_URL}/api/health`, {
          signal: AbortSignal.timeout(15000), // 15s timeout
        })
        const data = await response.json()
        return { reachable: true, data }
      } catch (err) {
        return {
          reachable: false,
          error: err instanceof Error ? err.message : 'Health endpoint unreachable',
        }
      }
    })

    // Determine which services are failing
    const failedServices: Array<{ name: string; error: string; latencyMs?: number }> = []
    const recoveredServices: string[] = []

    if (!healthResult.reachable) {
      failedServices.push({
        name: 'Health Endpoint',
        error: ('error' in healthResult ? healthResult.error : null) || 'Unreachable',
      })
    } else if (healthResult.data) {
      const { services } = healthResult.data
      for (const [name, check] of Object.entries(services) as [string, { status: string; error?: string; latencyMs?: number }][]) {
        if (check.status === 'error') {
          failedServices.push({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            error: check.error || 'Service error',
            latencyMs: check.latencyMs,
          })
        } else if (previouslyDown.has(name)) {
          // Service was down but is now OK
          recoveredServices.push(name.charAt(0).toUpperCase() + name.slice(1))
          previouslyDown.delete(name)
        }
      }
    }

    // Send alert if services are failing
    let alertSent = false
    if (failedServices.length > 0) {
      const newFailures = failedServices.filter((s) => shouldSendAlert(s.name))
      if (newFailures.length > 0) {
        await step.run('send-alert', async () => {
          const subject = `🚨 Context Memo DOWN: ${newFailures.map((s) => s.name).join(', ')}`
          const html = buildAlertEmail(newFailures)
          const sent = await sendAlertEmail(subject, html)
          if (sent) {
            newFailures.forEach((s) => markAlertSent(s.name))
          }
          return { sent }
        })
        alertSent = true
      }
      // Track what's down
      failedServices.forEach((s) => previouslyDown.add(s.name.toLowerCase()))
    }

    // Send recovery notification
    if (recoveredServices.length > 0) {
      await step.run('send-recovery', async () => {
        const subject = `✅ Context Memo RECOVERED: ${recoveredServices.join(', ')}`
        const html = buildRecoveryEmail(recoveredServices)
        await sendAlertEmail(subject, html)
        return { sent: true }
      })
    }

    return {
      timestamp: new Date().toISOString(),
      status: failedServices.length > 0 ? 'unhealthy' : 'healthy',
      failedServices: failedServices.map((s) => s.name),
      recoveredServices,
      alertSent,
    }
  }
)
