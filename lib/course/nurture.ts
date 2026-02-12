import type { Enrollment, ModuleProgress } from './types'

export type NurtureSegment = 'beginner' | 'developing' | 'advanced'

export interface SequenceEmail {
  emailKey: string
  dayOffset: number
  /** If set, only send if this condition is met */
  condition?: 'course_not_started' | 'course_incomplete' | 'course_complete' | 'course_not_complete'
}

export interface BehavioralEmail {
  emailKey: string
  /** Check function returns true if this email should fire */
  check: (ctx: BehavioralContext) => boolean
}

export interface BehavioralContext {
  enrollment: Enrollment
  moduleProgress: ModuleProgress[]
  totalRequired: number
  daysSinceEnrollment: number
  daysSinceLastModuleComplete: number | null
}

/**
 * Determine nurture segment from baseline score
 */
export function getSegment(baselineScore: number, totalQuestions: number): NurtureSegment {
  const pct = Math.round((baselineScore / totalQuestions) * 100)
  if (pct >= 80) return 'advanced'
  if (pct >= 40) return 'developing'
  return 'beginner'
}

/**
 * Time-based sequence emails per segment.
 * dayOffset is days after baseline completion.
 */
const beginnerSequence: SequenceEmail[] = [
  { emailKey: 'beginner_day2', dayOffset: 2 },
  { emailKey: 'beginner_day5', dayOffset: 5 },
  { emailKey: 'beginner_day8', dayOffset: 8 },
  { emailKey: 'beginner_day12', dayOffset: 12 },
  { emailKey: 'beginner_day16', dayOffset: 16, condition: 'course_not_complete' },
  { emailKey: 'beginner_day21', dayOffset: 21, condition: 'course_complete' },
]

const developingSequence: SequenceEmail[] = [
  { emailKey: 'developing_day2', dayOffset: 2 },
  { emailKey: 'developing_day5', dayOffset: 5 },
  { emailKey: 'developing_day8', dayOffset: 8 },
  { emailKey: 'developing_day12', dayOffset: 12 },
  { emailKey: 'developing_day16', dayOffset: 16 },
  { emailKey: 'developing_day21', dayOffset: 21 },
]

const advancedSequence: SequenceEmail[] = [
  { emailKey: 'advanced_day3', dayOffset: 3 },
  { emailKey: 'advanced_day6', dayOffset: 6 },
  { emailKey: 'advanced_day10', dayOffset: 10 },
  { emailKey: 'advanced_day14', dayOffset: 14 },
  { emailKey: 'advanced_day18', dayOffset: 18 },
  { emailKey: 'advanced_day22', dayOffset: 22 },
]

export function getSequenceEmails(segment: NurtureSegment): SequenceEmail[] {
  switch (segment) {
    case 'beginner': return beginnerSequence
    case 'developing': return developingSequence
    case 'advanced': return advancedSequence
  }
}

/**
 * Behavioral trigger definitions.
 * These fire based on user state, independent of time-based sequences.
 */
export const behavioralTriggers: BehavioralEmail[] = [
  {
    emailKey: 'stall_no_start',
    check: (ctx) =>
      ctx.daysSinceEnrollment >= 2 &&
      !ctx.enrollment.course_completed &&
      ctx.moduleProgress.filter(p => p.completed).length === 0,
  },
  {
    emailKey: 'stall_halfway',
    check: (ctx) => {
      const completedCount = ctx.moduleProgress.filter(p => p.completed).length
      return (
        completedCount >= 5 &&
        completedCount < ctx.totalRequired &&
        ctx.daysSinceLastModuleComplete !== null &&
        ctx.daysSinceLastModuleComplete >= 5
      )
    },
  },
  {
    emailKey: 'nudge_final',
    check: (ctx) =>
      ctx.enrollment.course_completed &&
      !ctx.enrollment.final_completed &&
      ctx.daysSinceLastModuleComplete !== null &&
      ctx.daysSinceLastModuleComplete >= 3,
  },
]

/**
 * Get all emails that should be sent right now for a given enrollment.
 * Returns email keys that are due and haven't been sent yet.
 */
export function getDueEmails(
  enrollment: Enrollment,
  sentKeys: Set<string>,
  moduleProgress: ModuleProgress[],
  totalRequired: number,
): string[] {
  const due: string[] = []

  // Must have completed baseline to receive nurture emails
  if (!enrollment.baseline_completed || !enrollment.baseline_score) return due

  const segment = getSegment(enrollment.baseline_score, 25) // 25 total questions
  const sequence = getSequenceEmails(segment)

  // Calculate days since baseline
  const baselineDate = new Date(enrollment.enrolled_at)
  const now = new Date()
  const daysSinceEnrollment = Math.floor((now.getTime() - baselineDate.getTime()) / (1000 * 60 * 60 * 24))

  // Check time-based sequence emails
  for (const seqEmail of sequence) {
    if (sentKeys.has(seqEmail.emailKey)) continue
    if (daysSinceEnrollment < seqEmail.dayOffset) continue

    // Check conditions
    if (seqEmail.condition === 'course_complete' && !enrollment.course_completed) continue
    if (seqEmail.condition === 'course_not_complete' && enrollment.course_completed) continue
    if (seqEmail.condition === 'course_not_started' && moduleProgress.some(p => p.completed)) continue
    if (seqEmail.condition === 'course_incomplete' && enrollment.course_completed) continue

    due.push(seqEmail.emailKey)
  }

  // Check behavioral triggers
  const completedModules = moduleProgress.filter(p => p.completed)
  const lastCompleted = completedModules
    .map(p => p.completed_at ? new Date(p.completed_at).getTime() : 0)
    .sort((a, b) => b - a)[0]

  const daysSinceLastModuleComplete = lastCompleted
    ? Math.floor((now.getTime() - lastCompleted) / (1000 * 60 * 60 * 24))
    : null

  const ctx: BehavioralContext = {
    enrollment,
    moduleProgress,
    totalRequired,
    daysSinceEnrollment,
    daysSinceLastModuleComplete,
  }

  for (const trigger of behavioralTriggers) {
    if (sentKeys.has(trigger.emailKey)) continue
    if (trigger.check(ctx)) {
      due.push(trigger.emailKey)
    }
  }

  return due
}
