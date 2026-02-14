import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Upload brand logo to Supabase Storage and update context.theme.logo_url
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  const supabase = await createClient()

  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify brand access
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, tenant_id, context')
    .eq('id', brandId)
    .single()

  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use PNG, JPG, WebP, or SVG.' }, { status: 400 })
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
    }

    // Determine extension
    const ext = file.type === 'image/svg+xml' ? 'svg'
      : file.type === 'image/png' ? 'png'
      : file.type === 'image/webp' ? 'webp'
      : 'jpg'

    // Upload path: brandId/logo_timestamp.ext
    const timestamp = Date.now()
    const fileName = `${brandId}/logo_${timestamp}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Delete any existing logos for this brand (cleanup)
    const { data: existingFiles } = await supabase.storage
      .from('brand-logos')
      .list(brandId)

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map(f => `${brandId}/${f.name}`)
      await supabase.storage.from('brand-logos').remove(filesToRemove)
    }

    // Upload new logo
    const { error: uploadError } = await supabase.storage
      .from('brand-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 })
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('brand-logos')
      .getPublicUrl(fileName)

    const logoUrl = urlData.publicUrl

    // Update context.theme.logo_url
    const existingContext = (brand.context as Record<string, unknown>) || {}
    const existingTheme = (existingContext.theme as Record<string, unknown>) || {}

    const { error: updateError } = await supabase
      .from('brands')
      .update({
        context: {
          ...existingContext,
          theme: {
            ...existingTheme,
            logo_url: logoUrl,
          },
        },
      })
      .eq('id', brandId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save logo URL' }, { status: 500 })
    }

    return NextResponse.json({ logo_url: logoUrl })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 })
  }
}
