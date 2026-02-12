import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { courseModules } from '@/lib/course/modules'
import { advancedModules } from '@/lib/course/advanced-modules'
import { inngest } from '@/lib/inngest/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getEnrollmentId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('course_enrollment_id')?.value || null
}

// GET /api/course/progress - Get enrollment status and module progress
export async function GET() {
  try {
    const enrollmentId = await getEnrollmentId()
    if (!enrollmentId) {
      return NextResponse.json({ error: 'Not enrolled' }, { status: 401 })
    }

    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .single()

    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }

    const { data: moduleProgress } = await supabase
      .from('course_module_progress')
      .select('*')
      .eq('enrollment_id', enrollmentId)

    // Determine which modules to show based on course track
    const track = enrollment.course_track || 'standard'
    const activeModules = track === 'advanced'
      ? [...courseModules, ...advancedModules]
      : courseModules

    return NextResponse.json({
      enrollment,
      moduleProgress: moduleProgress || [],
      totalModules: activeModules.length,
      courseTrack: track,
    })
  } catch (err) {
    console.error('Progress error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/course/progress - Mark a module as complete
export async function POST(request: NextRequest) {
  try {
    const enrollmentId = await getEnrollmentId()
    if (!enrollmentId) {
      return NextResponse.json({ error: 'Not enrolled' }, { status: 401 })
    }

    const { moduleSlug } = await request.json()

    if (!moduleSlug) {
      return NextResponse.json({ error: 'Module slug is required' }, { status: 400 })
    }

    // Verify module exists in either standard or advanced modules
    const allModules = [...courseModules, ...advancedModules]
    const moduleExists = allModules.some(m => m.slug === moduleSlug)
    if (!moduleExists) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Upsert progress
    const { error } = await supabase
      .from('course_module_progress')
      .upsert({
        enrollment_id: enrollmentId,
        module_slug: moduleSlug,
        completed: true,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'enrollment_id,module_slug',
      })

    if (error) {
      console.error('Module progress error:', error)
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 })
    }

    // Check if all modules for the user's track are now complete
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('course_track')
      .eq('id', enrollmentId)
      .single()

    const track = enrollment?.course_track || 'standard'
    const requiredModules = track === 'advanced'
      ? [...courseModules, ...advancedModules]
      : courseModules

    const { data: allProgress } = await supabase
      .from('course_module_progress')
      .select('module_slug')
      .eq('enrollment_id', enrollmentId)
      .eq('completed', true)

    const completedSlugs = new Set(allProgress?.map(p => p.module_slug) || [])
    const allComplete = requiredModules.every(m => completedSlugs.has(m.slug))

    if (allComplete) {
      await supabase
        .from('course_enrollments')
        .update({ course_completed: true })
        .eq('id', enrollmentId)
    }

    // Emit module-completed event for nurture tracking
    inngest.send({
      name: 'course/module-completed',
      data: {
        enrollmentId,
        moduleSlug,
        completedCount: completedSlugs.size,
        totalRequired: requiredModules.length,
      },
    }).catch(err => console.error('[Course Progress] Failed to emit event:', err))

    return NextResponse.json({
      completed: true,
      allModulesComplete: allComplete,
    })
  } catch (err) {
    console.error('Progress error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
