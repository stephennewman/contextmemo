import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - Transcribe audio using OpenAI Whisper
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
  
  // Get the audio file from the form data
  const formData = await request.formData()
  const audioFile = formData.get('audio') as File | null
  
  if (!audioFile) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
  }
  
  // Check file size (max 25MB for Whisper)
  if (audioFile.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 })
  }
  
  try {
    // Prepare form data for OpenAI
    const openaiFormData = new FormData()
    openaiFormData.append('file', audioFile)
    openaiFormData.append('model', 'whisper-1')
    openaiFormData.append('language', 'en')
    openaiFormData.append('response_format', 'verbose_json')
    
    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: openaiFormData,
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI Whisper error:', error)
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
    }
    
    const result = await response.json()
    
    // Calculate duration in seconds
    const duration = result.duration ? Math.round(result.duration) : null
    
    return NextResponse.json({
      transcript: result.text,
      duration_seconds: duration,
      language: result.language,
      // Include word-level timing if available
      words: result.words || null,
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
