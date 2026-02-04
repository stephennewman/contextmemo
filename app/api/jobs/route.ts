import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ jobs: [] })
  }

  // Get tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!tenant) {
    return NextResponse.json({ jobs: [] })
  }

  // Get brands for this tenant
  const { data: brands } = await supabase
    .from('brands')
    .select('id')
    .eq('tenant_id', tenant.id)

  const brandIds = (brands || []).map(b => b.id)

  if (brandIds.length === 0) {
    return NextResponse.json({ jobs: [] })
  }

  // Get active jobs (started in last 10 minutes, not stale)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  
  const { data: activeJobs } = await supabase
    .from('active_jobs')
    .select('id, brand_id, job_type, job_name, started_at, metadata')
    .in('brand_id', brandIds)
    .gte('started_at', tenMinutesAgo)
    .order('started_at', { ascending: false })

  return NextResponse.json({
    jobs: activeJobs || [],
    hasActive: (activeJobs?.length || 0) > 0,
  })
}
