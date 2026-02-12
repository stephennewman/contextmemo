'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { courseQuestions } from '@/lib/course/questions'

interface AnswerDetail {
  question_id: string
  selected_answer: string | null
  is_correct: boolean
  time_spent_ms: number
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0EA5E9] border-t-transparent animate-spin" />
      </main>
    }>
      <ResultsContent />
    </Suspense>
  )
}

function ResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') as 'baseline' | 'final' || 'baseline'
  const urlScore = searchParams.get('score')
  const urlTotal = searchParams.get('total')

  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState<number | null>(urlScore ? parseInt(urlScore) : null)
  const [total, setTotal] = useState<number>(urlTotal ? parseInt(urlTotal) : courseQuestions.length)
  const [baselineScore, setBaselineScore] = useState<number | null>(null)
  const [answers, setAnswers] = useState<AnswerDetail[] | null>(null)

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await fetch(`/api/course/assessment?type=${type}`)
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/course')
            return
          }
          // If no results yet, use URL params
          setLoading(false)
          return
        }

        const data = await res.json()
        setScore(data.assessment.score)
        setTotal(data.assessment.total_questions)
        setBaselineScore(data.baselineScore)

        if (type === 'final' && data.answers) {
          setAnswers(data.answers)
        }
      } catch {
        // Use URL params as fallback
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [type, router])

  if (loading) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0EA5E9] border-t-transparent animate-spin" />
      </main>
    )
  }

  const percentage = score !== null ? Math.round((score / total) * 100) : 0
  const improvement = type === 'final' && baselineScore !== null && score !== null
    ? score - baselineScore
    : null

  // Score tier
  const tier = percentage >= 80 ? 'expert' : percentage >= 60 ? 'proficient' : percentage >= 40 ? 'developing' : 'beginner'
  const tierLabels = {
    expert: { label: 'AI Search Expert', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-500' },
    proficient: { label: 'Proficient', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500' },
    developing: { label: 'Developing', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-500' },
    beginner: { label: 'Beginner', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-400' },
  }
  const tierInfo = tierLabels[tier]

  return (
    <main className="py-16 px-6">
      <div className="max-w-2xl mx-auto">
        {/* Score Display */}
        <div className="text-center mb-12">
          <div className="inline-block bg-[#0F172A] text-white text-xs font-bold tracking-widest uppercase px-4 py-1.5 mb-6">
            {type === 'baseline' ? 'Baseline' : 'Final'} Results
          </div>

          <div className="my-8">
            <div className="text-7xl font-bold text-[#0F172A]">
              {score}<span className="text-3xl text-slate-400">/{total}</span>
            </div>
            <div className="text-2xl font-semibold text-slate-500 mt-2">{percentage}%</div>
          </div>

          <div className={`inline-block px-4 py-2 border-2 ${tierInfo.border} ${tierInfo.bg} ${tierInfo.color} font-semibold text-sm`}>
            {tierInfo.label}
          </div>

          {/* Improvement for final */}
          {type === 'final' && improvement !== null && (
            <div className="mt-6 p-4 bg-slate-50 border-2 border-[#0F172A]">
              <p className="text-sm text-slate-600">
                Your baseline score was <span className="font-bold text-[#0F172A]">{baselineScore}/{total}</span>
              </p>
              {improvement > 0 ? (
                <p className="text-lg font-bold text-emerald-600 mt-1">
                  You improved by {improvement} {improvement === 1 ? 'question' : 'questions'}!
                </p>
              ) : improvement === 0 ? (
                <p className="text-lg font-bold text-slate-600 mt-1">
                  Same score as your baseline
                </p>
              ) : (
                <p className="text-lg font-bold text-amber-600 mt-1">
                  {Math.abs(improvement)} fewer correct than your baseline
                </p>
              )}
            </div>
          )}
        </div>

        {/* Baseline: Show score, track assignment, and CTA to start course */}
        {type === 'baseline' && (
          <div className="text-center">
            {percentage >= 80 ? (
              <div className="mb-8 max-w-md mx-auto">
                <div className="p-4 bg-purple-50 border-2 border-purple-400 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="font-bold text-purple-700">Advanced Track Unlocked</span>
                  </div>
                  <p className="text-sm text-purple-800">
                    You clearly know the fundamentals. Your course includes the standard modules 
                    <strong> plus 4 advanced deep-dives</strong> on retrieval systems, competitive intelligence, 
                    AI attribution, and agent commerce.
                  </p>
                </div>
                <p className="text-slate-600">
                  Even experts have blind spots. The course will fill gaps and give you the 
                  advanced frameworks that go beyond the basics.
                </p>
              </div>
            ) : (
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                This is your starting point. Take the course to learn about AI search optimization, 
                then retake the assessment to see how much you&apos;ve improved.
              </p>
            )}
            <button
              onClick={() => router.push('/course/learn')}
              className="bg-[#0EA5E9] text-white font-semibold py-3 px-8 hover:bg-[#0284C7] transition-colors text-lg"
            >
              {percentage >= 80 ? 'Start Advanced Course' : 'Start the Course'}
            </button>
          </div>
        )}

        {/* Final: Show full answer breakdown */}
        {type === 'final' && answers && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-[#0F172A] mb-6">Answer Breakdown</h2>
            <div className="space-y-4">
              {courseQuestions.map((question, idx) => {
                const answer = answers.find(a => a.question_id === question.id)
                const isCorrect = answer?.is_correct ?? false
                const wasAnswered = answer?.selected_answer !== null && answer?.selected_answer !== undefined
                const selectedKey = answer?.selected_answer

                return (
                  <div
                    key={question.id}
                    className={`border-2 p-5 ${
                      isCorrect
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-red-400 bg-red-50/30'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <span className={`w-7 h-7 shrink-0 flex items-center justify-center text-sm font-bold ${
                        isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Question {idx + 1} — {question.category}</p>
                        <p className="font-semibold text-[#0F172A]">{question.question}</p>
                      </div>
                    </div>

                    {/* Options with correct/incorrect highlighting */}
                    <div className="ml-10 space-y-1.5 mt-3">
                      {question.options.map(option => {
                        const isThisCorrect = option.key === question.correctAnswer
                        const isThisSelected = option.key === selectedKey
                        let optionClass = 'text-slate-500'
                        if (isThisCorrect) optionClass = 'text-emerald-700 font-semibold'
                        if (isThisSelected && !isThisCorrect) optionClass = 'text-red-600 line-through'

                        return (
                          <div key={option.key} className={`text-sm flex gap-2 ${optionClass}`}>
                            <span className="font-mono">{option.key.toUpperCase()}.</span>
                            <span>{option.text}</span>
                            {isThisCorrect && <span className="text-emerald-500 text-xs">(correct)</span>}
                            {isThisSelected && !isThisCorrect && <span className="text-red-400 text-xs">(your answer)</span>}
                          </div>
                        )
                      })}
                      {!wasAnswered && (
                        <p className="text-xs text-slate-400 italic mt-1">Time expired — no answer submitted</p>
                      )}
                    </div>

                    {/* Explanation */}
                    <div className="ml-10 mt-3 pt-3 border-t border-slate-200">
                      <p className="text-sm text-slate-600">{question.explanation}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Final CTA */}
            <div className="text-center mt-12 py-8 border-t border-slate-200">
              <h3 className="text-lg font-bold text-[#0F172A] mb-3">Ready to put this into practice?</h3>
              <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                Context Memo helps brands become visible in AI search results. 
                See how AI models talk about your brand today.
              </p>
              <a
                href="https://contextmemo.com/request-access"
                className="inline-block bg-[#0F172A] text-white font-semibold py-3 px-8 hover:bg-slate-800 transition-colors"
              >
                Get Started with Context Memo
              </a>
            </div>
          </div>
        )}

        {/* Final assessment but no answers loaded - show simplified view */}
        {type === 'final' && !answers && (
          <div className="text-center mt-8">
            <a
              href="https://contextmemo.com/request-access"
              className="inline-block bg-[#0F172A] text-white font-semibold py-3 px-8 hover:bg-slate-800 transition-colors"
            >
              Get Started with Context Memo
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
