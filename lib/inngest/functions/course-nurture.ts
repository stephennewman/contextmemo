import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { getDueEmails, getSegment } from '@/lib/course/nurture'
import { getEmail } from '@/lib/course/emails'
import { courseQuestions } from '@/lib/course/questions'
import { courseModules } from '@/lib/course/modules'
import { advancedModules } from '@/lib/course/advanced-modules'
import type { Enrollment, ModuleProgress } from '@/lib/course/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Context Memo <onboarding@resend.dev>'

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log('[Course Nurture] RESEND_API_KEY not set, skipping')
    return false
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[Course Nurture] Failed to send to ${to}:`, error)
      return false
    }

    const result = await response.json()
    console.log(`[Course Nurture] Sent to ${to}, ID: ${result.id}`)
    return true
  } catch (err) {
    console.error(`[Course Nurture] Error sending to ${to}:`, err)
    return false
  }
}

async function recordEmailSent(enrollmentId: string, emailKey: string): Promise<void> {
  await supabase
    .from('course_emails_sent')
    .upsert({ enrollment_id: enrollmentId, email_key: emailKey }, { onConflict: 'enrollment_id,email_key' })
}

async function getMissedCategories(enrollmentId: string, assessmentType: 'baseline' | 'final'): Promise<string[]> {
  // Get the assessment
  const { data: assessment } = await supabase
    .from('course_assessments')
    .select('id')
    .eq('enrollment_id', enrollmentId)
    .eq('assessment_type', assessmentType)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()

  if (!assessment) return []

  // Get incorrect answers
  const { data: wrongAnswers } = await supabase
    .from('course_assessment_answers')
    .select('question_id')
    .eq('assessment_id', assessment.id)
    .eq('is_correct', false)

  if (!wrongAnswers || wrongAnswers.length === 0) return []

  // Map to categories
  const categoryCount = new Map<string, number>()
  for (const answer of wrongAnswers) {
    const question = courseQuestions.find(q => q.id === answer.question_id)
    if (question) {
      categoryCount.set(question.category, (categoryCount.get(question.category) || 0) + 1)
    }
  }

  // Return sorted by frequency
  return Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat)
}

// ─── Function A: Cron-based nurture check (every 6 hours) ──────────

export const courseNurtureCheck = inngest.createFunction(
  {
    id: 'course-nurture-check',
    name: 'Course Nurture Email Check',
    retries: 2,
  },
  { cron: '0 */6 * * *' }, // Every 6 hours
  async ({ step }) => {
    if (!RESEND_API_KEY) {
      return { success: false, reason: 'no_resend_key' }
    }

    // Get all enrollments that have completed baseline
    const enrollments = await step.run('fetch-enrollments', async () => {
      const { data } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('baseline_completed', true)

      return (data || []) as Enrollment[]
    })

    if (enrollments.length === 0) {
      return { success: true, processed: 0 }
    }

    const results: Array<{ email: string; sent: string[]; errors: string[] }> = []

    for (const enrollment of enrollments) {
      const result = await step.run(`process-${enrollment.id}`, async () => {
        const sent: string[] = []
        const errors: string[] = []

        // Get already-sent emails
        const { data: sentEmails } = await supabase
          .from('course_emails_sent')
          .select('email_key')
          .eq('enrollment_id', enrollment.id)

        const sentKeys = new Set((sentEmails || []).map(e => e.email_key))

        // Get module progress
        const { data: progress } = await supabase
          .from('course_module_progress')
          .select('*')
          .eq('enrollment_id', enrollment.id)

        const moduleProgress = (progress || []) as ModuleProgress[]

        // Determine total required modules
        const track = enrollment.course_track || 'standard'
        const totalRequired = track === 'advanced'
          ? courseModules.length + advancedModules.length
          : courseModules.length

        // Get due emails
        const dueKeys = getDueEmails(enrollment, sentKeys, moduleProgress, totalRequired)

        // Send each due email
        for (const emailKey of dueKeys) {
          const missedCategories = await getMissedCategories(enrollment.id, 'baseline')

          const emailData = getEmail(emailKey, {
            name: enrollment.name,
            email: enrollment.email,
            score: enrollment.baseline_score || undefined,
            totalQuestions: courseQuestions.length,
            baselineScore: enrollment.baseline_score,
            courseTrack: enrollment.course_track,
            missedCategories,
          })

          if (!emailData) {
            errors.push(`No template for ${emailKey}`)
            continue
          }

          const success = await sendEmail(enrollment.email, emailData.subject, emailData.html)
          if (success) {
            await recordEmailSent(enrollment.id, emailKey)
            sent.push(emailKey)
          } else {
            errors.push(emailKey)
          }
        }

        return { email: enrollment.email, sent, errors }
      })

      results.push(result)
    }

    const totalSent = results.reduce((sum, r) => sum + r.sent.length, 0)
    console.log(`[Course Nurture] Processed ${enrollments.length} enrollments, sent ${totalSent} emails`)

    return { success: true, processed: enrollments.length, totalSent, results }
  }
)

// ─── Function B: Event-triggered immediate emails ──────────────────

export const courseNurtureSend = inngest.createFunction(
  {
    id: 'course-nurture-send',
    name: 'Course Nurture Immediate Email',
    retries: 2,
  },
  [
    { event: 'course/enrolled' },
    { event: 'course/baseline-completed' },
    { event: 'course/final-completed' },
  ],
  async ({ event, step }) => {
    if (!RESEND_API_KEY) {
      return { success: false, reason: 'no_resend_key' }
    }

    const eventName = event.name

    const result = await step.run('send-immediate-email', async () => {
      let emailKey: string
      let emailData: ReturnType<typeof getEmail>

      if (eventName === 'course/enrolled') {
        const { enrollmentId, email, name } = event.data as {
          enrollmentId: string
          email: string
          name: string | null
        }
        emailKey = 'enrolled_welcome'
        emailData = getEmail(emailKey, { name, email })

        if (emailData) {
          const success = await sendEmail(email, emailData.subject, emailData.html)
          if (success) await recordEmailSent(enrollmentId, emailKey)
          return { emailKey, success, email }
        }
      }

      if (eventName === 'course/baseline-completed') {
        const { enrollmentId, email, name, score, totalQuestions, courseTrack } = event.data as {
          enrollmentId: string
          email: string
          name: string | null
          score: number
          totalQuestions: number
          courseTrack: 'standard' | 'advanced'
        }

        const missedCategories = await getMissedCategories(enrollmentId, 'baseline')

        emailKey = 'baseline_completed'
        emailData = getEmail(emailKey, {
          name,
          email,
          score,
          totalQuestions,
          courseTrack,
          missedCategories,
        })

        if (emailData) {
          const success = await sendEmail(email, emailData.subject, emailData.html)
          if (success) await recordEmailSent(enrollmentId, emailKey)
          return { emailKey, success, email }
        }
      }

      if (eventName === 'course/final-completed') {
        const { enrollmentId, email, score, baselineScore, totalQuestions } = event.data as {
          enrollmentId: string
          email: string
          score: number
          baselineScore: number | null
          totalQuestions: number
        }

        // Get name from enrollment
        const { data: enrollment } = await supabase
          .from('course_enrollments')
          .select('name')
          .eq('id', enrollmentId)
          .single()

        emailKey = 'final_completed'
        emailData = getEmail(emailKey, {
          name: enrollment?.name || null,
          email,
          score,
          totalQuestions,
          baselineScore,
        })

        if (emailData) {
          const success = await sendEmail(email, emailData.subject, emailData.html)
          if (success) await recordEmailSent(enrollmentId, emailKey)
        }

        // Also send improvement/same behavioral email
        const improvement = score - (baselineScore || 0)
        const behavioralKey = improvement >= 5 ? 'final_improved' : 'final_same'
        const behavioralEmail = getEmail(behavioralKey, {
          name: enrollment?.name || null,
          email,
          score,
          totalQuestions,
          baselineScore,
        })

        if (behavioralEmail) {
          // Send behavioral email after a short delay (don't stack)
          // Record it now so the cron doesn't also send it
          await recordEmailSent(enrollmentId, behavioralKey)
          // The cron will not re-send since it's recorded
        }

        return { emailKey: 'final_completed', behavioralKey, success: true, email }
      }

      return { success: false, reason: 'unknown_event' }
    })

    return result
  }
)
