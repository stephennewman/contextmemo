import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET - List user's organizations
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get organizations where user is a member
  const { data: memberships, error } = await serviceClient
    .from('organization_members')
    .select(`
      role,
      joined_at,
      organization:organization_id(
        id,
        name,
        slug,
        owner_id,
        plan,
        plan_limits,
        created_at
      )
    `)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching organizations:', error)
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }

  // Format response
  const organizations = memberships?.map(m => ({
    ...m.organization,
    role: m.role,
    joined_at: m.joined_at,
  })) || []

  return NextResponse.json({ organizations })
}

// POST - Create new organization
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name } = body

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ error: 'Name is required (min 2 characters)' }, { status: 400 })
  }

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)

  // Check if slug is taken
  const { data: existing } = await serviceClient
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Organization name already taken' }, { status: 400 })
  }

  // Create organization
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({
      name: name.trim(),
      slug,
      owner_id: user.id,
      plan: 'starter',
      plan_limits: { prompts: 50, memos_per_month: 5, brands: 1, seats: -1 }, // Unlimited seats
    })
    .select()
    .single()

  if (orgError) {
    console.error('Error creating organization:', orgError)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }

  // Add creator as owner member
  const { error: memberError } = await serviceClient
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    console.error('Error adding owner as member:', memberError)
    // Rollback org creation
    await serviceClient.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
  }

  return NextResponse.json({ organization: org }, { status: 201 })
}
