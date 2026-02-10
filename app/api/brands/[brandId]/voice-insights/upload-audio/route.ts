import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logSecurityEvent } from '@/lib/security/security-events'

const MAX_REQUEST_SIZE = 25 * 1024 * 1024 // 25MB - matches existing file size limit

// POST - Upload audio file to Supabase Storage
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.ip || 'unknown'
  let userId = 'unknown'

  try {
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      await logSecurityEvent({
        type: 'request_too_large',
        ip,
        path: request.nextUrl.pathname,
        details: { requested_size: parseInt(contentLength) },
      })
      return NextResponse.json(
        { error: `Request too large. Maximum size is ${MAX_REQUEST_SIZE / (1024 * 1024)}MB` },
        { status: 413 }
      )
    }

    const { brandId } = await params
    const supabase = await createClient()
    
    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    userId = user?.id || 'unknown'

    if (authError || !user) {
      await logSecurityEvent({
        type: 'unauthorized',
        ip,
        path: request.nextUrl.pathname,
        details: { reason: 'user_not_authenticated' },
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify brand access
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, tenant_id')
      .eq('id', brandId)
      .single()
    
    if (brandError || !brand || brand.tenant_id !== user.id) {
      await logSecurityEvent({
        type: 'access_denied',
        ip,
        userId,
        path: request.nextUrl.pathname,
        details: { reason: 'brand_not_found_or_unauthorized', brandId },
      })
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }
    
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const insightId = formData.get('insightId') as string | null
    
    if (!audioFile) {
      await logSecurityEvent({
        type: 'invalid_request',
        ip,
        userId,
        path: request.nextUrl.pathname,
        details: { reason: 'no_audio_file_provided' },
      })
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }
    
    // Validate file size (25MB max) - redundant with content-length check but good as a fallback
    if (audioFile.size > MAX_REQUEST_SIZE) {
      await logSecurityEvent({
        type: 'invalid_request',
        ip,
        userId,
        path: request.nextUrl.pathname,
        details: { reason: 'file_too_large_after_parse', fileSize: audioFile.size },
      })
      return NextResponse.json({ error: `File too large. Maximum size is ${MAX_REQUEST_SIZE / (1024 * 1024)}MB` }, { status: 400 })
    }
    
    // Determine file extension
    const extension = audioFile.type.includes('webm') 
      ? 'webm' 
      : audioFile.type.includes('mp4') 
        ? 'mp4' 
        : audioFile.type.includes('mpeg') 
          ? 'mp3' 
          : 'audio'
    
    // Create unique file path: brandId/insightId_timestamp.ext
    const timestamp = Date.now()
    const fileName = insightId 
      ? `${brandId}/${insightId}_${timestamp}.${extension}`
      : `${brandId}/${timestamp}.${extension}`
    
    // Convert File to Buffer for upload
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('voice-recordings')
      .upload(fileName, buffer, {
        contentType: audioFile.type,
        upsert: false,
      })
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      await logSecurityEvent({
        type: 'upload_failed',
        ip,
        userId,
        path: request.nextUrl.pathname,
        details: { reason: 'supabase_upload_error', errorMessage: uploadError.message },
      })
      return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 })
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('voice-recordings')
      .getPublicUrl(fileName)
    
    await logSecurityEvent({
      type: 'audio_upload_success',
      ip,
      userId,
      path: request.nextUrl.pathname,
      resourceId: brandId,
      resourceType: 'brand',
      metadata: { fileName: uploadData.path, fileSize: audioFile.size },
    })

    return NextResponse.json({ 
      audio_url: urlData.publicUrl,
      path: uploadData.path,
      message: 'Audio uploaded successfully'
    })
    
  } catch (error: any) {
    console.error('Upload error:', error)
    await logSecurityEvent({
      type: 'upload_failed',
      ip,
      userId,
      path: request.nextUrl.pathname,
      details: { reason: 'internal_server_error', errorMessage: error.message },
    })
    return NextResponse.json({ error: 'An unexpected error occurred during upload' }, { status: 500 })
  }
}
