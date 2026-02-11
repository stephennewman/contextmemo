import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Context Memo <onboarding@resend.dev>'
const ADMIN_EMAIL = 'stephen@krezzo.com'

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.warn('[Access Request] RESEND_API_KEY not set, skipping email to', to)
    return
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`[Access Request] Failed to send email to ${to}:`, err)
    }
  } catch (err) {
    console.error(`[Access Request] Email send error to ${to}:`, err)
  }
}

function buildAdminNotificationEmail(name: string, email: string, company: string | null, message: string | null) {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0F172A; padding: 24px; text-align: center;">
        <h1 style="color: #0EA5E9; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;">CONTEXT MEMO</h1>
      </div>
      <div style="padding: 32px 24px; background: #ffffff;">
        <h2 style="color: #0F172A; margin: 0 0 16px; font-size: 22px; font-weight: 800;">New Access Request</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748B; font-weight: 600; width: 100px;">Name</td>
            <td style="padding: 8px 0; color: #0F172A; font-weight: 500;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748B; font-weight: 600;">Email</td>
            <td style="padding: 8px 0; color: #0F172A; font-weight: 500;">
              <a href="mailto:${email}" style="color: #0EA5E9; text-decoration: none;">${email}</a>
            </td>
          </tr>
          ${company ? `
          <tr>
            <td style="padding: 8px 0; color: #64748B; font-weight: 600;">Company</td>
            <td style="padding: 8px 0; color: #0F172A; font-weight: 500;">${company}</td>
          </tr>` : ''}
          ${message ? `
          <tr>
            <td style="padding: 8px 0; color: #64748B; font-weight: 600; vertical-align: top;">Message</td>
            <td style="padding: 8px 0; color: #0F172A; font-weight: 500;">${message}</td>
          </tr>` : ''}
        </table>
      </div>
      <div style="padding: 16px 24px; background: #F8FAFC; border-top: 2px solid #E2E8F0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94A3B8;">
          Reply to this person or send them an invite code.
        </p>
      </div>
    </div>
  `
}

function buildRequesterConfirmationEmail(name: string) {
  const firstName = name.split(' ')[0]
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0F172A; padding: 24px; text-align: center;">
        <h1 style="color: #0EA5E9; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;">CONTEXT MEMO</h1>
      </div>
      <div style="padding: 32px 24px; background: #ffffff;">
        <h2 style="color: #0F172A; margin: 0 0 16px; font-size: 22px; font-weight: 800;">We got your request, ${firstName}.</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
          Thanks for your interest in Context Memo. We review every request personally and will get back to you within 24 hours with next steps.
        </p>
        <div style="background: #F0F9FF; border-left: 4px solid #0EA5E9; padding: 16px; margin: 0 0 20px;">
          <p style="color: #0F172A; font-size: 14px; font-weight: 600; margin: 0 0 4px;">What happens next?</p>
          <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.5;">
            We&rsquo;ll review your request and reach out with your invite code and onboarding details. If you have questions in the meantime, just reply to this email.
          </p>
        </div>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
          While you wait, you can explore our published memos to see how AI visibility works:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://contextmemo.com/memos" style="display: inline-block; background: #0EA5E9; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; text-decoration: none; letter-spacing: 0.025em;">
            EXPLORE MEMOS
          </a>
        </div>
      </div>
      <div style="padding: 16px 24px; background: #F8FAFC; border-top: 2px solid #E2E8F0; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94A3B8;">
          Context Memo &mdash; The AI Visibility Platform for B2B Teams
        </p>
      </div>
    </div>
  `
}

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

    const trimmedName = name.trim()
    const trimmedEmail = email.toLowerCase().trim()
    const trimmedCompany = company?.trim() || null
    const trimmedMessage = message?.trim() || null

    // Insert access request
    const { error: insertError } = await supabase
      .from('access_requests')
      .insert({
        name: trimmedName,
        email: trimmedEmail,
        company: trimmedCompany,
        message: trimmedMessage,
        status: 'pending',
      })

    if (insertError) {
      console.error('Failed to insert access request:', insertError)
      return NextResponse.json(
        { error: 'Failed to submit request. Please try again.' },
        { status: 500 }
      )
    }

    // Send emails in parallel (non-blocking — don't fail the request if emails fail)
    await Promise.allSettled([
      // Notify admin
      sendEmail(
        ADMIN_EMAIL,
        `New Access Request: ${trimmedName}${trimmedCompany ? ` (${trimmedCompany})` : ''}`,
        buildAdminNotificationEmail(trimmedName, trimmedEmail, trimmedCompany, trimmedMessage)
      ),
      // Confirm to requester
      sendEmail(
        trimmedEmail,
        'We got your request — Context Memo',
        buildRequesterConfirmationEmail(trimmedName)
      ),
    ])

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
