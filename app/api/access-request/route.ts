import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { name, email, company, message } = await request.json()

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Check for duplicate pending requests
    const { data: existing } = await supabase
      .from('access_requests')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'You already have a pending request. We will be in touch soon.' },
        { status: 409 }
      )
    }

    // Insert access request
    const { error: insertError } = await supabase
      .from('access_requests')
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        company: company?.trim() || null,
        message: message?.trim() || null,
        status: 'pending',
      })

    if (insertError) {
      console.error('Failed to insert access request:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit request. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
