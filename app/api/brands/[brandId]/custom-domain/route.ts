import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/security/validation'
import { addCustomDomain, removeCustomDomain, verifyCustomDomain } from '@/lib/utils/vercel-domains'

interface RouteParams {
  params: Promise<{ brandId: string }>
}

/**
 * GET /api/brands/[brandId]/custom-domain
 * Get the current custom domain configuration for a brand.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params

  if (!isValidUUID(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID format' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, custom_domain, domain_verified')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  return NextResponse.json({
    custom_domain: brand.custom_domain || null,
    domain_verified: brand.domain_verified || false,
    dns_instructions: brand.custom_domain
      ? `Add a CNAME record pointing to cname.vercel-dns.com`
      : null,
  })
}

/**
 * POST /api/brands/[brandId]/custom-domain
 * Set a custom domain for a brand.
 * Body: { domain: "ai.krezzo.com" }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params

  if (!isValidUUID(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID format' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, custom_domain')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const body = await request.json()
  const { domain } = body

  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'domain is required' }, { status: 400 })
  }

  // Basic domain validation
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/
  const cleanDomain = domain.toLowerCase().trim()
  if (!domainRegex.test(cleanDomain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 })
  }

  // Check if domain is already in use by another brand
  const { data: existing } = await supabase
    .from('brands')
    .select('id')
    .eq('custom_domain', cleanDomain)
    .neq('id', brandId)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'This domain is already in use by another brand' }, { status: 409 })
  }

  // Remove old domain from Vercel if changing
  if (brand.custom_domain && brand.custom_domain !== cleanDomain) {
    try {
      await removeCustomDomain(brand.custom_domain)
    } catch {
      // Non-fatal: old domain might already be removed
    }
  }

  // Register domain with Vercel
  try {
    const result = await addCustomDomain(cleanDomain)
    if (result.error && result.error.code !== 'domain_already_in_use') {
      return NextResponse.json({
        error: `Vercel domain error: ${result.error.message}`,
      }, { status: 400 })
    }
  } catch (err) {
    // If Vercel integration isn't configured, still save the domain
    // (allows setup before Vercel env vars are added)
    console.warn('Vercel domain registration skipped:', err)
  }

  // Save to database
  const { error: updateError } = await supabase
    .from('brands')
    .update({
      custom_domain: cleanDomain,
      domain_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', brandId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save domain' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    custom_domain: cleanDomain,
    domain_verified: false,
    dns_instructions: `Add a CNAME record for "${cleanDomain.split('.')[0]}" pointing to cname.vercel-dns.com`,
  })
}

/**
 * PUT /api/brands/[brandId]/custom-domain
 * Verify DNS configuration for the custom domain.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params

  if (!isValidUUID(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID format' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, custom_domain, domain_verified')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  if (!brand.custom_domain) {
    return NextResponse.json({ error: 'No custom domain configured' }, { status: 400 })
  }

  // Check DNS with Vercel
  try {
    const result = await verifyCustomDomain(brand.custom_domain)

    if (result.verified) {
      // Mark as verified in database
      await supabase
        .from('brands')
        .update({
          domain_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', brandId)

      return NextResponse.json({
        success: true,
        domain_verified: true,
        custom_domain: brand.custom_domain,
      })
    }

    return NextResponse.json({
      success: false,
      domain_verified: false,
      misconfigured: result.misconfigured,
      message: result.misconfigured
        ? 'DNS is misconfigured. Ensure the CNAME points to cname.vercel-dns.com'
        : 'DNS not yet propagated. This can take up to 48 hours.',
    })
  } catch {
    // If Vercel isn't configured, allow manual verification
    return NextResponse.json({
      success: false,
      domain_verified: false,
      message: 'Could not verify domain. Ensure VERCEL_TOKEN and VERCEL_PROJECT_ID are configured.',
    })
  }
}

/**
 * DELETE /api/brands/[brandId]/custom-domain
 * Remove the custom domain from a brand.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params

  if (!isValidUUID(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID format' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, custom_domain')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // Remove from Vercel
  if (brand.custom_domain) {
    try {
      await removeCustomDomain(brand.custom_domain)
    } catch {
      // Non-fatal
    }
  }

  // Clear from database
  await supabase
    .from('brands')
    .update({
      custom_domain: null,
      domain_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', brandId)

  return NextResponse.json({ success: true })
}
