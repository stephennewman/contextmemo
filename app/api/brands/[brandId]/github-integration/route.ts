import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/security/validation'
import crypto from 'crypto'

interface RouteParams {
  params: Promise<{ brandId: string }>
}

function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

// GET — fetch the current GitHub integration for this brand
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params

  if (!isValidUUID(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify brand ownership
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('tenant_id', user.id)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const { data: integration } = await supabase
    .from('github_integrations')
    .select('id, webhook_secret, enabled, created_at, updated_at')
    .eq('brand_id', brandId)
    .single()

  if (!integration) {
    return NextResponse.json({ integration: null })
  }

  // Build the webhook URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://contextmemo.com'
  const webhookUrl = `${baseUrl}/api/webhooks/github/${brandId}`

  return NextResponse.json({
    integration: {
      id: integration.id,
      enabled: integration.enabled,
      webhookSecret: integration.webhook_secret,
      webhookUrl,
      createdAt: integration.created_at,
      updatedAt: integration.updated_at,
    },
  })
}

// POST — create a new GitHub integration (generates webhook secret)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params

  if (!isValidUUID(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify brand ownership
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('tenant_id', user.id)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // Check if one already exists
  const { data: existing } = await supabase
    .from('github_integrations')
    .select('id')
    .eq('brand_id', brandId)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Integration already exists. Use PATCH to update.' }, { status: 409 })
  }

  const webhookSecret = generateWebhookSecret()

  const { data: integration, error } = await supabase
    .from('github_integrations')
    .insert({
      brand_id: brandId,
      webhook_secret: webhookSecret,
      enabled: true,
    })
    .select('id, webhook_secret, enabled, created_at')
    .single()

  if (error) {
    console.error('[github-integration] Create error:', error)
    return NextResponse.json({ error: 'Failed to create integration' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://contextmemo.com'
  const webhookUrl = `${baseUrl}/api/webhooks/github/${brandId}`

  return NextResponse.json({
    integration: {
      id: integration.id,
      enabled: integration.enabled,
      webhookSecret: integration.webhook_secret,
      webhookUrl,
      createdAt: integration.created_at,
    },
  })
}

// PATCH — update integration (toggle enabled, regenerate secret)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params

  if (!isValidUUID(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify brand ownership
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('tenant_id', user.id)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const body = await request.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body.enabled === 'boolean') {
    updates.enabled = body.enabled
  }

  if (body.regenerateSecret === true) {
    updates.webhook_secret = generateWebhookSecret()
  }

  const { data: integration, error } = await supabase
    .from('github_integrations')
    .update(updates)
    .eq('brand_id', brandId)
    .select('id, webhook_secret, enabled, created_at, updated_at')
    .single()

  if (error) {
    console.error('[github-integration] Update error:', error)
    return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://contextmemo.com'
  const webhookUrl = `${baseUrl}/api/webhooks/github/${brandId}`

  return NextResponse.json({
    integration: {
      id: integration.id,
      enabled: integration.enabled,
      webhookSecret: integration.webhook_secret,
      webhookUrl,
      createdAt: integration.created_at,
      updatedAt: integration.updated_at,
    },
  })
}

// DELETE — remove the GitHub integration
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params

  if (!isValidUUID(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify brand ownership
  const { data: brand } = await supabase
    .from('brands')
    .select('id')
    .eq('id', brandId)
    .eq('tenant_id', user.id)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('github_integrations')
    .delete()
    .eq('brand_id', brandId)

  if (error) {
    console.error('[github-integration] Delete error:', error)
    return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
