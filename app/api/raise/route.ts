import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

// POST /api/raise — handle email verification, access, and responses
export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient()
  const body = await request.json()
  const { action } = body

  // --- Request access (email gate) ---
  if (action === 'request_access') {
    const { email } = body
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Upsert access record
    const { data: existing } = await supabase
      .from('pitch_deck_access')
      .select('id, verified')
      .eq('email', normalizedEmail)
      .single()

    if (existing) {
      // Update with new code
      await supabase
        .from('pitch_deck_access')
        .update({ access_code: code })
        .eq('id', existing.id)
    } else {
      // Insert new
      await supabase
        .from('pitch_deck_access')
        .insert({ email: normalizedEmail, access_code: code })
    }

    // Send code via Resend
    try {
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Context Memo <noreply@contextmemo.com>',
            to: normalizedEmail,
            subject: 'Your access code for Context Memo',
            html: `
              <div style="font-family: 'Space Grotesk', system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <h2 style="color: #0F172A; margin-bottom: 8px;">Context Memo</h2>
                <p style="color: #64748B; margin-bottom: 32px;">Your access code for the pitch deck:</p>
                <div style="background: #0F172A; color: #0EA5E9; font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 24px; margin-bottom: 32px;">
                  ${code}
                </div>
                <p style="color: #64748B; font-size: 14px;">This code expires in 1 hour. If you didn't request this, you can ignore this email.</p>
              </div>
            `,
          }),
        })
      }
    } catch (e) {
      console.error('Failed to send email:', e)
    }

    return NextResponse.json({ success: true })
  }

  // --- Verify code ---
  if (action === 'verify_code') {
    const { email, code } = body
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const { data: access } = await supabase
      .from('pitch_deck_access')
      .select('id, access_code, created_at')
      .eq('email', normalizedEmail)
      .single()

    if (!access || access.access_code !== code) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
    }

    // Mark verified and log access
    await supabase
      .from('pitch_deck_access')
      .update({
        verified: true,
        first_accessed_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        access_count: 1,
      })
      .eq('id', access.id)

    // Notify founder via Resend
    try {
      const resendKey = process.env.RESEND_API_KEY
      const notifyEmail = process.env.FOUNDER_NOTIFY_EMAIL || 'stephen@contextmemo.com'
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Context Memo <noreply@contextmemo.com>',
            to: notifyEmail,
            subject: `🔔 Pitch deck viewed: ${normalizedEmail}`,
            html: `
              <div style="font-family: system-ui, sans-serif; padding: 20px;">
                <h3>New pitch deck viewer</h3>
                <p><strong>Email:</strong> ${normalizedEmail}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
              </div>
            `,
          }),
        })
      }
    } catch (e) {
      console.error('Failed to send notification:', e)
    }

    return NextResponse.json({ success: true, accessId: access.id })
  }

  // --- Log return visit ---
  if (action === 'log_visit') {
    const { email } = body
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const normalizedEmail = email.toLowerCase().trim()

    // Increment access count and update timestamp
    await supabase
      .from('pitch_deck_access')
      .update({
        last_accessed_at: new Date().toISOString(),
      })
      .eq('email', normalizedEmail)

    // Increment access_count
    try {
      const { data } = await supabase
        .from('pitch_deck_access')
        .select('id, access_count')
        .eq('email', normalizedEmail)
        .single()

      if (data) {
        await supabase
          .from('pitch_deck_access')
          .update({ access_count: (data.access_count || 0) + 1 })
          .eq('id', data.id)
      }
    } catch {
      // Non-critical — timestamp already updated
    }

    return NextResponse.json({ success: true })
  }

  // --- Submit response (CTA) ---
  if (action === 'submit_response') {
    const { email, response_type, commit_amount, firm_name, full_name, note } = body
    if (!email || !response_type) {
      return NextResponse.json({ error: 'Email and response type required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Get access ID
    const { data: access } = await supabase
      .from('pitch_deck_access')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    await supabase
      .from('pitch_deck_responses')
      .insert({
        access_id: access?.id,
        email: normalizedEmail,
        response_type,
        commit_amount,
        firm_name,
        full_name,
        note,
      })

    // Notify founder
    try {
      const resendKey = process.env.RESEND_API_KEY
      const notifyEmail = process.env.FOUNDER_NOTIFY_EMAIL || 'stephen@contextmemo.com'
      if (resendKey) {
        const responseLabels: Record<string, string> = {
          not_interested: '❌ Not Interested',
          interested: '🤝 Interested — Wants to Chat',
          commit: `💰 Wants to Commit: ${commit_amount || 'unspecified'}`,
        }
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Context Memo <noreply@contextmemo.com>',
            to: notifyEmail,
            subject: `Pitch deck response: ${responseLabels[response_type] || response_type}`,
            html: `
              <div style="font-family: system-ui, sans-serif; padding: 20px;">
                <h3>Pitch Deck Response</h3>
                <p><strong>Response:</strong> ${responseLabels[response_type] || response_type}</p>
                <p><strong>Email:</strong> ${normalizedEmail}</p>
                ${full_name ? `<p><strong>Name:</strong> ${full_name}</p>` : ''}
                ${firm_name ? `<p><strong>Firm:</strong> ${firm_name}</p>` : ''}
                ${commit_amount ? `<p><strong>Amount:</strong> ${commit_amount}</p>` : ''}
                ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
                <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
              </div>
            `,
          }),
        })
      }
    } catch (e) {
      console.error('Failed to send notification:', e)
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
