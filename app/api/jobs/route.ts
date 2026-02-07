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

  // Get last activity from alerts table (most recent completed activity)
  let lastActivity = null
  try {
    const { data } = await supabase
      .from('alerts')
      .select('created_at, title, alert_type')
      .in('brand_id', brandIds)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (data) {
      lastActivity = {
        timestamp: data.created_at,
        title: data.title,
        type: data.alert_type,
      }
    }
  } catch {
    // alerts query failed, proceed without last activity
  }

  return NextResponse.json({
    jobs: activeJobs || [],
    hasActive: (activeJobs?.length || 0) > 0,
    lastActivity,
  })
}
