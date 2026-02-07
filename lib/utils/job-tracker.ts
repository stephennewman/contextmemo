import { createServiceRoleClient } from '@/lib/supabase/service'

const supabase = createServiceRoleClient()

export type JobType = 'scan' | 'classify' | 'generate' | 'extract' | 'discover'

const JOB_NAMES: Record<JobType, string> = {
  scan: 'AI Visibility Scan',
  classify: 'Content Classification',
  generate: 'Memo Generation',
  extract: 'Context Extraction',
  discover: 'Competitor Discovery',
}

export async function trackJobStart(
  brandId: string,
  jobType: JobType,
  metadata?: Record<string, unknown>
): Promise<string> {
  const { data, error } = await supabase
    .from('active_jobs')
    .insert({
      brand_id: brandId,
      job_type: jobType,
      job_name: JOB_NAMES[jobType] || jobType,
      metadata: metadata || {},
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to track job start:', error)
    return ''
  }

  return data?.id || ''
}

export async function trackJobEnd(jobId: string): Promise<void> {
  if (!jobId) return
  
  const { error } = await supabase
    .from('active_jobs')
    .delete()
    .eq('id', jobId)

  if (error) {
    console.error('Failed to track job end:', error)
  }
}

// Clean up stale jobs (older than 10 minutes)
export async function cleanupStaleJobs(): Promise<void> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  
  await supabase
    .from('active_jobs')
    .delete()
    .lt('started_at', tenMinutesAgo)
}
