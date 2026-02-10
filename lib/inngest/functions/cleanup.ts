import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'

const supabase = createServiceRoleClient()

const RETENTION_POLICIES = {
  scan_results: 90, // days
  usage_events: 365, // days
  ai_traffic: 180, // days
  feed_events: 30, // days
  security_events: 365, // days
  audit_log: 365, // days
}

export const dailyCleanup = inngest.createFunction(
  {
    id: 'daily-cleanup',
    name: 'Daily Database Cleanup',
    rateLimit: {
      limit: 1,
      period: '24h',
    },
  },
  { cron: '0 0 * * *' }, // Run daily at midnight UTC
  async ({ step }) => {
    await step.run('cleanup-old-data', async () => {
      for (const [table, days] of Object.entries(RETENTION_POLICIES)) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        const { error, count } = await supabase
          .from(table)
          .delete()
          .lt('created_at', cutoff.toISOString())
          .select('*', { count: 'exact' }) // Get count of deleted rows

        if (error) {
          console.error(`Error cleaning up old data from ${table}:`, error)
        } else {
          console.log(`Cleaned up ${count} old rows from ${table}.`)
        }
      }
    })

    return { success: true, message: 'Daily cleanup complete' }
  }
)
