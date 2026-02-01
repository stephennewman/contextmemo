import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { hasPermission, OrgRole } from '@/lib/supabase/types'
import crypto from 'crypto'

const serviceClient = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface RouteParams {
  params: Promise<{ orgId: string }>
}

// Helper to check user's role in org
async function getUserRole(userId: string, orgId: string): Promise<OrgRole | null> {
  const { data } = await serviceClient
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .single()
  
  return data?.role as OrgRole || null
}

// GET - List organization members
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is a member
  const role = await getUserRole(user.id, orgId)
  if (!role) {
    return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
  }

  // Get all members
  const { data: members, error } = await serviceClient
    .from('organization_members')
    .select(`
      id,
      role,
      joined_at,
      user:user_id(
        id,
        email,
        name
      )
    `)
    .eq('organization_id', orgId)
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }

  // Get pending invites (only for admins+)
  let invites: Array<{ id: string; email: string; role: string; expires_at: string }> = []
  if (hasPermission(role, 'manage_members')) {
    const { data: pendingInvites } = await serviceClient
      .from('organization_invites')
      .select('id, email, role, expires_at')
      .eq('organization_id', orgId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())

    invites = pendingInvites || []
  }

  return NextResponse.json({ members, invites })
}

// POST - Invite a new member
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permissions
  const role = await getUserRole(user.id, orgId)
  if (!role || !hasPermission(role, 'manage_members')) {
    return NextResponse.json({ error: 'Not authorized to invite members' }, { status: 403 })
  }

  const body = await request.json()
  const { email, inviteRole = 'member' } = body

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Validate role (can't invite someone with higher role than yourself)
  const validRoles = ['member', 'viewer']
  if (role === 'owner' || role === 'admin') {
    validRoles.push('admin')
  }
  if (!validRoles.includes(inviteRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Check if already a member
  const { data: existingUser } = await serviceClient
    .from('tenants')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (existingUser) {
    const { data: existingMember } = await serviceClient
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', existingUser.id)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 })
    }
  }

  // Check if already invited
  const { data: existingInvite } = await serviceClient
    .from('organization_invites')
    .select('id')
    .eq('organization_id', orgId)
    .eq('email', email.toLowerCase())
    .is('accepted_at', null)
    .single()

  if (existingInvite) {
    return NextResponse.json({ error: 'Invitation already pending' }, { status: 400 })
  }

  // Create invite
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiry

  const { data: invite, error } = await serviceClient
    .from('organization_invites')
    .insert({
      organization_id: orgId,
      email: email.toLowerCase(),
      role: inviteRole,
      invited_by: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }

  // TODO: Send invite email
  // For now, return the invite link
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`

  return NextResponse.json({ 
    invite,
    inviteUrl,
    message: 'Invitation created. Share this link with the user.'
  }, { status: 201 })
}

// DELETE - Remove a member
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { orgId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const memberId = searchParams.get('memberId')
  const inviteId = searchParams.get('inviteId')

  // Check permissions
  const role = await getUserRole(user.id, orgId)
  if (!role || !hasPermission(role, 'manage_members')) {
    return NextResponse.json({ error: 'Not authorized to remove members' }, { status: 403 })
  }

  if (inviteId) {
    // Cancel invite
    const { error } = await serviceClient
      .from('organization_invites')
      .delete()
      .eq('id', inviteId)
      .eq('organization_id', orgId)

    if (error) {
      return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Invitation cancelled' })
  }

  if (memberId) {
    // Get member to remove
    const { data: member } = await serviceClient
      .from('organization_members')
      .select('user_id, role')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Can't remove owner
    if (member.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove organization owner' }, { status: 400 })
    }

    // Can't remove yourself (use leave instead)
    if (member.user_id === user.id) {
      return NextResponse.json({ error: 'Use leave endpoint to remove yourself' }, { status: 400 })
    }

    const { error } = await serviceClient
      .from('organization_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Member removed' })
  }

  return NextResponse.json({ error: 'memberId or inviteId required' }, { status: 400 })
}
