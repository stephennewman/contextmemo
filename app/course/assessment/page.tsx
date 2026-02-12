'use client'

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { courseQuestions, TIME_PER_QUESTION_SECONDS } from '@/lib/course/questions'

type Phase = 'loading' | 'ready' | 'active' | 'completing' | 'done'

export default function AssessmentPage() {
  return (
    <Suspense fallback={
      <main className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0EA5E9] border-t-transparent animate-spin" />
      </main>
    }>
      <AssessmentContent />
    </Suspense>
  )
}

function AssessmentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') as 'baseline' | 'final' || 'baseline'

  const [phase, setPhase] = useState<Phase>('loading')
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION_SECONDS)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [error, setError] = useState('')

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)
  const isAdvancingRef = useRef(false)

  const totalQuestions = courseQuestions.length

  // Start the assessment
  useEffect(() => {
    async function startAssessment() {
      try {
        const res = await fetch('/api/course/assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start', type }),
        })

        if (!res.ok) {
          const data = await res.json()
          if (res.status === 401) {
            router.push('/course')
            return
          }
          setError(data.error || 'Failed to start assessment')
          return
        }

        const data = await res.json()
        setAssessmentId(data.assessment.id)

        // If resuming, skip already-answered questions
        const answeredIds = new Set(data.answeredQuestionIds || [])
        if (answeredIds.size > 0) {
          const nextUnanswered = courseQuestions.findIndex(q => !answeredIds.has(q.id))
          if (nextUnanswered === -1) {
            // All questions answered - complete
            await completeAssessment(data.assessment.id)
            return
          }
          setCurrentIndex(nextUnanswered)
          setAnsweredCount(answeredIds.size)
        }

        setPhase('ready')
      } catch {
        setError('Failed to connect. Please try again.')
      }
    }

    startAssessment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  async function completeAssessment(id: string) {
    setPhase('completing')
    try {
      const res = await fetch('/api/course/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', assessmentId: id }),
      })

      if (res.ok) {
        const data = await res.json()
        setPhase('done')
        // Short delay then redirect to results
        setTimeout(() => {
          router.push(`/course/results?type=${type}&score=${data.score}&total=${data.totalQuestions}`)
        }, 1500)
      }
    } catch {
      setError('Failed to complete assessment')
    }
  }

  // Timer logic
  useEffect(() => {
    if (phase !== 'active') return

    startTimeRef.current = Date.now()
    setTimeLeft(TIME_PER_QUESTION_SECONDS)
    setSelectedAnswer(null)

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - auto advance
          if (timerRef.current) clearInterval(timerRef.current)
          advanceQuestion(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentIndex])

  const advanceQuestion = useCallback(async (answer: string | null) => {
    if (isAdvancingRef.current) return
    isAdvancingRef.current = true

    if (timerRef.current) clearInterval(timerRef.current)

    const timeSpentMs = Date.now() - startTimeRef.current
    const question = courseQuestions[currentIndex]

    // Submit answer to API (fire and forget for speed)
    fetch('/api/course/assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'answer',
        assessmentId,
        questionId: question.id,
        selectedAnswer: answer,
        timeSpentMs,
      }),
    })

    setAnsweredCount(prev => prev + 1)

    // Check if this was the last question
    if (currentIndex >= totalQuestions - 1) {
      // Small delay for the last answer to be recorded
      await new Promise(resolve => setTimeout(resolve, 500))
      await completeAssessment(assessmentId!)
    } else {
      // Brief pause to show selection, then advance
      await new Promise(resolve => setTimeout(resolve, 400))
      setCurrentIndex(prev => prev + 1)
      isAdvancingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, assessmentId, totalQuestions])

  function handleSelectAnswer(key: string) {
    if (selectedAnswer || phase !== 'active') return
    setSelectedAnswer(key)
    advanceQuestion(key)
  }

  function handleStart() {
    setPhase('active')
  }

  if (error) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 bg-red-100 text-red-600 flex items-center justify-center font-bold mx-auto mb-4 text-xl">!</div>
          <p className="text-[#0F172A] font-semibold mb-2">{error}</p>
          <button
            onClick={() => router.push('/course')}
            className="text-sm text-[#0EA5E9] hover:underline"
          >
            Back to course
          </button>
        </div>
      </main>
    )
  }

  // Loading state
  if (phase === 'loading') {
    return (
      <main className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0EA5E9] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Preparing assessment...</p>
        </div>
      </main>
    )
  }

  // Ready state - instructions before starting
  if (phase === 'ready') {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <div className="inline-block bg-[#0F172A] text-white text-xs font-bold tracking-widest uppercase px-4 py-1.5 mb-6">
            {type === 'baseline' ? 'Baseline' : 'Final'} Assessment
          </div>
          <h1 className="text-3xl font-bold text-[#0F172A] mb-4">
            {type === 'baseline' ? 'Ready to Test Your Knowledge?' : 'Time for the Final Assessment'}
          </h1>
          <div className="text-slate-600 space-y-3 mb-8 text-left bg-slate-50 border-2 border-[#0F172A] p-6">
            <p className="font-semibold text-[#0F172A]">How this works:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="text-[#0EA5E9] font-bold shrink-0">01</span>
                <span>{totalQuestions} questions about AI search, GEO, and digital marketing</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#0EA5E9] font-bold shrink-0">02</span>
                <span>{TIME_PER_QUESTION_SECONDS} seconds per question — read carefully and select your answer</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#0EA5E9] font-bold shrink-0">03</span>
                <span>If time runs out, the question is marked as unanswered and you move on</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#0EA5E9] font-bold shrink-0">04</span>
                <span>No going back — each question can only be answered once</span>
              </li>
              {type === 'baseline' && (
                <li className="flex gap-2">
                  <span className="text-[#0EA5E9] font-bold shrink-0">05</span>
                  <span>You&apos;ll see your score at the end, but not the correct answers (that comes after the course)</span>
                </li>
              )}
            </ul>
          </div>
          <button
            onClick={handleStart}
            className="bg-[#0EA5E9] text-white font-semibold py-3 px-8 hover:bg-[#0284C7] transition-colors text-lg"
          >
            Start Assessment
          </button>
        </div>
      </main>
    )
  }

  // Completing / Done state
  if (phase === 'completing' || phase === 'done') {
    return (
      <main className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#0EA5E9] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">
            {phase === 'completing' ? 'Calculating your score...' : 'Done! Redirecting...'}
          </p>
        </div>
      </main>
    )
  }

  // Active assessment
  const question = courseQuestions[currentIndex]
  const progress = ((currentIndex) / totalQuestions) * 100
  const timerProgress = (timeLeft / TIME_PER_QUESTION_SECONDS) * 100
  const isUrgent = timeLeft <= 5

  return (
    <main className="min-h-[80vh]">
      {/* Progress bar */}
      <div className="w-full h-1 bg-slate-100">
        <div
          className="h-full bg-[#0EA5E9] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Question header */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-sm text-slate-500">
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          <div className="flex items-center gap-3">
            {/* Timer display */}
            <div className={`flex items-center gap-2 px-3 py-1.5 border-2 ${
              isUrgent ? 'border-red-500 text-red-600 bg-red-50' : 'border-[#0F172A] text-[#0F172A]'
            } transition-colors`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span className="font-mono font-bold text-sm tabular-nums">
                {timeLeft}s
              </span>
            </div>
          </div>
        </div>

        {/* Timer bar */}
        <div className="w-full h-1.5 bg-slate-100 mb-8">
          <div
            className={`h-full transition-all duration-1000 linear ${
              isUrgent ? 'bg-red-500' : 'bg-[#0EA5E9]'
            }`}
            style={{ width: `${timerProgress}%` }}
          />
        </div>

        {/* Category badge */}
        <div className="mb-4">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {question.category}
          </span>
        </div>

        {/* Question */}
        <h2 className="text-xl md:text-2xl font-bold text-[#0F172A] mb-8 leading-snug">
          {question.question}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option) => {
            const isSelected = selectedAnswer === option.key
            return (
              <button
                key={option.key}
                onClick={() => handleSelectAnswer(option.key)}
                disabled={!!selectedAnswer}
                className={`w-full text-left p-4 border-2 transition-all duration-150 flex items-start gap-3 ${
                  isSelected
                    ? 'border-[#0EA5E9] bg-[#0EA5E9]/5'
                    : 'border-slate-200 hover:border-[#0F172A] hover:bg-slate-50'
                } ${selectedAnswer && !isSelected ? 'opacity-50' : ''}`}
              >
                <span className={`w-7 h-7 shrink-0 flex items-center justify-center text-sm font-bold border-2 ${
                  isSelected
                    ? 'border-[#0EA5E9] bg-[#0EA5E9] text-white'
                    : 'border-slate-300 text-slate-500'
                }`}>
                  {option.key.toUpperCase()}
                </span>
                <span className="text-[#0F172A] pt-0.5">{option.text}</span>
              </button>
            )
          })}
        </div>

        {/* Bottom info */}
        <div className="mt-8 text-center text-xs text-slate-400">
          {answeredCount} of {totalQuestions} answered
        </div>
      </div>
    </main>
  )
}
