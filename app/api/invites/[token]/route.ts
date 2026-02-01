import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface RouteParams {
  params: Promise<{ token: string }>
}

// GET - Get invite details (public, no auth required)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = await params

  const { data: invite, error } = await serviceClient
    .from('organization_invites')
    .select(`
      id,
      email,
      role,
      expires_at,
      accepted_at,
      organization:organization_id(
        id,
        name,
        slug
      ),
      inviter:invited_by(
        name,
        email
      )
    `)
    .eq('token', token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
  }

  // Check if expired
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
  }

  // Check if already accepted
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 })
  }

  return NextResponse.json({
    invite: {
      email: invite.email,
      role: invite.role,
      organization: invite.organization,
      invitedBy: invite.inviter,
      expiresAt: invite.expires_at,
    }
  })
}

// POST - Accept invite (requires auth)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Please log in to accept this invitation' }, { status: 401 })
  }

  // Get invite
  const { data: invite, error } = await serviceClient
    .from('organization_invites')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
  }

  // Check if expired
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 })
  }

  // Check if already accepted
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 })
  }

  // Get user's tenant record
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('id, email')
    .eq('id', user.id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'User account not found' }, { status: 404 })
  }

  // Check if email matches (optional - can allow any logged in user to accept)
  // For now, we'll be flexible and allow any authenticated user
  // if (tenant.email.toLowerCase() !== invite.email.toLowerCase()) {
  //   return NextResponse.json({ error: 'This invitation was sent to a different email' }, { status: 403 })
  // }

  // Check if already a member
  const { data: existingMember } = await serviceClient
    .from('organization_members')
    .select('id')
    .eq('organization_id', invite.organization_id)
    .eq('user_id', user.id)
    .single()

  if (existingMember) {
    // Mark invite as accepted anyway
    await serviceClient
      .from('organization_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    return NextResponse.json({ 
      success: true, 
      message: 'You are already a member of this organization',
      alreadyMember: true
    })
  }

  // Add as member
  const { error: memberError } = await serviceClient
    .from('organization_members')
    .insert({
      organization_id: invite.organization_id,
      user_id: user.id,
      role: invite.role,
      invited_by: invite.invited_by,
      invited_at: invite.created_at,
    })

  if (memberError) {
    console.error('Error adding member:', memberError)
    return NextResponse.json({ error: 'Failed to join organization' }, { status: 500 })
  }

  // Mark invite as accepted
  await serviceClient
    .from('organization_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  // Get organization details for response
  const { data: org } = await serviceClient
    .from('organizations')
    .select('id, name, slug')
    .eq('id', invite.organization_id)
    .single()

  return NextResponse.json({
    success: true,
    message: `You have joined ${org?.name}`,
    organization: org,
  })
}
