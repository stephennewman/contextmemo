import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { inngest } from '@/lib/inngest/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      // Set enrollment cookie
      const cookieStore = await cookies()
      cookieStore.set('course_enrollment_id', existing.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 90, // 90 days
        path: '/',
      })

      // Determine where to redirect returning user
      if (existing.final_completed) {
        return NextResponse.json({ redirect: '/course/results?type=final' })
      }
      if (existing.course_completed) {
        return NextResponse.json({ redirect: '/course/assessment?type=final' })
      }
      if (existing.baseline_completed) {
        return NextResponse.json({ redirect: '/course/learn' })
      }

      // Check if they have an in-progress baseline assessment
      const { data: inProgressAssessment } = await supabase
        .from('course_assessments')
        .select('id')
        .eq('enrollment_id', existing.id)
        .eq('assessment_type', 'baseline')
        .is('completed_at', null)
        .single()

      if (inProgressAssessment) {
        return NextResponse.json({ redirect: '/course/assessment?type=baseline' })
      }

      return NextResponse.json({ redirect: '/course/assessment?type=baseline' })
    }

    // Create new enrollment
    const { data: enrollment, error } = await supabase
      .from('course_enrollments')
      .insert({
        email: email.toLowerCase().trim(),
        name: name?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Enrollment error:', error)
      return NextResponse.json({ error: 'Failed to create enrollment' }, { status: 500 })
    }

    // Set enrollment cookie
    const cookieStore = await cookies()
    cookieStore.set('course_enrollment_id', enrollment.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 90, // 90 days
      path: '/',
    })

    // Emit enrollment event for nurture emails
    inngest.send({
      name: 'course/enrolled',
      data: {
        enrollmentId: enrollment.id,
        email: enrollment.email,
        name: enrollment.name,
      },
    }).catch(err => console.error('[Course Enroll] Failed to emit event:', err))

    return NextResponse.json({ enrollment, redirect: '/course/assessment?type=baseline' })
  } catch (err) {
    console.error('Enrollment error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
