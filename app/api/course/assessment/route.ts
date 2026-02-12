import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { courseQuestions } from '@/lib/course/questions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getEnrollmentId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('course_enrollment_id')?.value || null
}

// POST /api/course/assessment - Start a new assessment or submit an answer
export async function POST(request: NextRequest) {
  try {
    const enrollmentId = await getEnrollmentId()
    if (!enrollmentId) {
      return NextResponse.json({ error: 'Not enrolled' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    // START a new assessment
    if (action === 'start') {
      const { type } = body // 'baseline' or 'final'

      if (!['baseline', 'final'].includes(type)) {
        return NextResponse.json({ error: 'Invalid assessment type' }, { status: 400 })
      }

      // Check enrollment exists
      const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('id', enrollmentId)
        .single()

      if (!enrollment) {
        return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
      }

      // For final assessment, check course is completed
      if (type === 'final' && !enrollment.course_completed) {
        return NextResponse.json({ error: 'Complete the course first' }, { status: 400 })
      }

      // Check if there's already a completed assessment of this type
      if (type === 'baseline' && enrollment.baseline_completed) {
        return NextResponse.json({ error: 'Baseline already completed' }, { status: 400 })
      }
      if (type === 'final' && enrollment.final_completed) {
        return NextResponse.json({ error: 'Final already completed' }, { status: 400 })
      }

      // Check for in-progress assessment
      const { data: existing } = await supabase
        .from('course_assessments')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .eq('assessment_type', type)
        .is('completed_at', null)
        .single()

      if (existing) {
        // Return existing in-progress assessment
        const { data: answers } = await supabase
          .from('course_assessment_answers')
          .select('question_id')
          .eq('assessment_id', existing.id)

        return NextResponse.json({
          assessment: existing,
          answeredQuestionIds: answers?.map(a => a.question_id) || [],
        })
      }

      // Create new assessment
      const { data: assessment, error } = await supabase
        .from('course_assessments')
        .insert({
          enrollment_id: enrollmentId,
          assessment_type: type,
          total_questions: courseQuestions.length,
        })
        .select()
        .single()

      if (error) {
        console.error('Assessment start error:', error)
        return NextResponse.json({ error: 'Failed to start assessment' }, { status: 500 })
      }

      return NextResponse.json({ assessment, answeredQuestionIds: [] })
    }

    // ANSWER a question
    if (action === 'answer') {
      const { assessmentId, questionId, selectedAnswer, timeSpentMs } = body

      if (!assessmentId || !questionId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      // Verify the assessment belongs to this enrollment
      const { data: assessment } = await supabase
        .from('course_assessments')
        .select('*')
        .eq('id', assessmentId)
        .eq('enrollment_id', enrollmentId)
        .is('completed_at', null)
        .single()

      if (!assessment) {
        return NextResponse.json({ error: 'Assessment not found or already completed' }, { status: 404 })
      }

      // Find the correct answer
      const question = courseQuestions.find(q => q.id === questionId)
      if (!question) {
        return NextResponse.json({ error: 'Question not found' }, { status: 404 })
      }

      const isCorrect = selectedAnswer === question.correctAnswer

      // Check for duplicate
      const { data: existingAnswer } = await supabase
        .from('course_assessment_answers')
        .select('id')
        .eq('assessment_id', assessmentId)
        .eq('question_id', questionId)
        .single()

      if (existingAnswer) {
        return NextResponse.json({ recorded: true, duplicate: true })
      }

      // Insert answer
      const { error } = await supabase
        .from('course_assessment_answers')
        .insert({
          assessment_id: assessmentId,
          question_id: questionId,
          selected_answer: selectedAnswer || null,
          is_correct: selectedAnswer ? isCorrect : false,
          time_spent_ms: timeSpentMs || 0,
        })

      if (error) {
        console.error('Answer submission error:', error)
        return NextResponse.json({ error: 'Failed to record answer' }, { status: 500 })
      }

      return NextResponse.json({ recorded: true })
    }

    // COMPLETE the assessment
    if (action === 'complete') {
      const { assessmentId } = body

      if (!assessmentId) {
        return NextResponse.json({ error: 'Missing assessmentId' }, { status: 400 })
      }

      // Verify ownership
      const { data: assessment } = await supabase
        .from('course_assessments')
        .select('*')
        .eq('id', assessmentId)
        .eq('enrollment_id', enrollmentId)
        .is('completed_at', null)
        .single()

      if (!assessment) {
        return NextResponse.json({ error: 'Assessment not found or already completed' }, { status: 404 })
      }

      // Count correct answers
      const { data: answers } = await supabase
        .from('course_assessment_answers')
        .select('is_correct')
        .eq('assessment_id', assessmentId)

      const score = answers?.filter(a => a.is_correct).length || 0

      // Update assessment
      await supabase
        .from('course_assessments')
        .update({
          score,
          completed_at: new Date().toISOString(),
        })
        .eq('id', assessmentId)

      // Update enrollment
      const updateData: Record<string, unknown> = {}
      const percentage = Math.round((score / courseQuestions.length) * 100)

      if (assessment.assessment_type === 'baseline') {
        updateData.baseline_completed = true
        updateData.baseline_score = score
        // Assign course track based on baseline score
        updateData.course_track = percentage >= 80 ? 'advanced' : 'standard'
      } else {
        updateData.final_completed = true
        updateData.final_score = score
      }

      await supabase
        .from('course_enrollments')
        .update(updateData)
        .eq('id', enrollmentId)

      return NextResponse.json({
        score,
        totalQuestions: courseQuestions.length,
        assessmentType: assessment.assessment_type,
        courseTrack: assessment.assessment_type === 'baseline'
          ? (percentage >= 80 ? 'advanced' : 'standard')
          : undefined,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('Assessment error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/course/assessment?type=baseline|final - Get assessment results
export async function GET(request: NextRequest) {
  try {
    const enrollmentId = await getEnrollmentId()
    if (!enrollmentId) {
      return NextResponse.json({ error: 'Not enrolled' }, { status: 401 })
    }

    const type = request.nextUrl.searchParams.get('type')
    if (!type || !['baseline', 'final'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    // Get the completed assessment
    const { data: assessment } = await supabase
      .from('course_assessments')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .eq('assessment_type', type)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    if (!assessment) {
      return NextResponse.json({ error: 'No completed assessment found' }, { status: 404 })
    }

    // Get enrollment for both scores
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('baseline_score, final_score')
      .eq('id', enrollmentId)
      .single()

    // For final assessment, include answer details
    let answers = null
    if (type === 'final') {
      const { data: answerData } = await supabase
        .from('course_assessment_answers')
        .select('*')
        .eq('assessment_id', assessment.id)

      answers = answerData
    }

    return NextResponse.json({
      assessment,
      answers,
      baselineScore: enrollment?.baseline_score,
      finalScore: enrollment?.final_score,
    })
  } catch (err) {
    console.error('Get assessment error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
