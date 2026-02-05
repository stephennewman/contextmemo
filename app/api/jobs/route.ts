import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ jobs: [], lastActivity: null })
  }

  // Get tenant (tenant.id IS the user.id)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!tenant) {
    return NextResponse.json({ jobs: [], lastActivity: null })
  }

  // Get brands for this tenant
  const { data: brands } = await supabase
    .from('brands')
    .select('id')
    .eq('tenant_id', tenant.id)

  const brandIds = (brands || []).map(b => b.id)

  if (brandIds.length === 0) {
    return NextResponse.json({ jobs: [], lastActivity: null })
  }

  // Get active jobs (started in last 10 minutes, not stale)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  
  const { data: activeJobs } = await supabase
    .from('active_jobs')
    .select('id, brand_id, job_type, job_name, started_at, metadata')
    .in('brand_id', brandIds)
    .gte('started_at', tenMinutesAgo)
    .order('started_at', { ascending: false })

  // Get last activity from activity_log (most recent completed activity)
  const { data: lastActivity } = await supabase
    .from('activity_log')
    .select('created_at, title, activity_type')
    .in('brand_id', brandIds)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({
    jobs: activeJobs || [],
    hasActive: (activeJobs?.length || 0) > 0,
    lastActivity: lastActivity ? {
      timestamp: lastActivity.created_at,
      title: lastActivity.title,
      type: lastActivity.activity_type,
    } : null,
  })
}
