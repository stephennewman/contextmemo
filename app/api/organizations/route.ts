import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/security/audit-events'
import { z } from 'zod'

const serviceClient = createServiceRoleClient()

// GET - List user's organizations
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || 'unknown'
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.ip || 'unknown'

  if (!user) {
    await logAuditEvent({
      action: 'view_organizations_attempt',
      userId,
      metadata: { status: 'failed', reason: 'unauthorized' },
    }, request)
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
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching organizations', { error: error.message, userId })
    await logAuditEvent({
      action: 'view_organizations_attempt',
      userId,
      metadata: { status: 'failed', reason: 'db_error', errorMessage: error.message },
    }, request)
    return NextResponse.json({ error: 'An unexpected error occurred while fetching organizations' }, { status: 500 })
  }

  // Format response
  const organizations = memberships?.map(m => ({
    ...m.organization,
    role: m.role,
    joined_at: m.joined_at,
  })) || []

  await logAuditEvent({
    action: 'view_organizations',
    userId,
    metadata: { status: 'success', organizationCount: organizations.length },
  }, request)

  return NextResponse.json({ organizations })
}

// POST - Create new organization
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || 'unknown'
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.ip || 'unknown'

  if (!user) {
    await logAuditEvent({
      action: 'create_organization_attempt',
      userId,
      metadata: { status: 'failed', reason: 'unauthorized' },
    }, request)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const schema = z.object({
    name: z.string().min(2).max(100),
  })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    await logAuditEvent({
      action: 'create_organization_attempt',
      userId,
      metadata: { status: 'failed', reason: 'invalid_request_body', details: parsed.error.format() },
    }, request)
    return NextResponse.json({ error: 'Name is required (min 2 characters)' }, { status: 400 })
  }

  const { name } = parsed.data

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
    await logAuditEvent({
      action: 'create_organization_attempt',
      userId,
      metadata: { status: 'failed', reason: 'slug_taken', name, slug },
    }, request)
    return NextResponse.json({ error: 'Organization name already taken' }, { status: 400 })
  }

  // Create organization
  const { data: org, error: orgError } = await serviceClient
    .from('organizations')
    .insert({
      name: name.trim(),
      slug,
      owner_id: userId,
      plan: 'starter',
      plan_limits: { prompts: 50, memos_per_month: 5, brands: 1, seats: -1 }, // Unlimited seats
    })
    .select()
    .single()

  if (orgError) {
    console.error('Error creating organization', { error: orgError.message, userId })
    await logAuditEvent({
      action: 'create_organization_attempt',
      userId,
      metadata: { status: 'failed', reason: 'db_error', errorMessage: orgError.message },
    }, request)
    return NextResponse.json({ error: 'An unexpected error occurred while creating organization' }, { status: 500 })
  }

  // Add creator as owner member
  const { error: memberError } = await serviceClient
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: userId,
      role: 'owner',
    })

  if (memberError) {
    console.error('Error adding owner as member', { error: memberError.message, userId, orgId: org.id })
    await logAuditEvent({
      action: 'create_organization_attempt',
      userId,
      resourceId: org.id,
      resourceType: 'organization',
      metadata: { status: 'failed', reason: 'db_error_add_member', errorMessage: memberError.message },
    }, request)
    // Rollback org creation
    await serviceClient.from('organizations').delete().eq('id', org.id)
    return NextResponse.json({ error: 'An unexpected error occurred while creating organization' }, { status: 500 })
  }

  await logAuditEvent({
    action: 'create_organization',
    userId,
    resourceId: org.id,
    resourceType: 'organization',
    metadata: { status: 'success', name: org.name, slug: org.slug, plan: org.plan },
  }, request)

  return NextResponse.json({ organization: org }, { status: 201 })
}
