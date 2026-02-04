import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Upload audio file to Supabase Storage
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
    .select('id, tenant_id')
    .eq('id', brandId)
    .single()
  
  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }
  
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const insightId = formData.get('insightId') as string | null
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }
    
    // Validate file size (25MB max)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 25MB' }, { status: 400 })
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
      return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 })
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('voice-recordings')
      .getPublicUrl(fileName)
    
    return NextResponse.json({ 
      audio_url: urlData.publicUrl,
      path: uploadData.path,
      message: 'Audio uploaded successfully'
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 })
  }
}
