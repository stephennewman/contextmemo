'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { courseModules } from '@/lib/course/modules'
import { courseQuestions } from '@/lib/course/questions'

export default function CourseLandingPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalMinutes = courseModules.reduce((sum, m) => sum + m.estimatedMinutes, 0)

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/course/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      // Redirect based on enrollment status
      if (data.redirect) {
        router.push(data.redirect)
      } else {
        router.push('/course/assessment?type=baseline')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      {/* Hero Section */}
      <section className="bg-[#0F172A] text-white py-20 border-b-3 border-[#0EA5E9]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-block bg-[#0EA5E9] text-white text-xs font-bold tracking-widest uppercase px-4 py-1.5 mb-6">
            Free Course
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
            AI Search Mastery for Marketers
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            The landscape is shifting. Buyers are using ChatGPT, Claude, and Perplexity 
            to make purchasing decisions. Learn how to make your brand visible in AI-generated 
            answers — before your competitors do.
          </p>
          <div className="flex items-center justify-center gap-8 text-sm text-slate-400">
            <span>{courseQuestions.length} question assessment</span>
            <span className="w-1 h-1 bg-slate-600 rounded-full" />
            <span>{courseModules.length} modules</span>
            <span className="w-1 h-1 bg-slate-600 rounded-full" />
            <span>~{totalMinutes} min read time</span>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-10 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#0F172A] text-white flex items-center justify-center font-bold text-lg mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-[#0F172A] mb-2">Baseline Assessment</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Take a timed {courseQuestions.length}-question assessment to benchmark your 
                current AI search knowledge. You&apos;ll get your score — no peeking at answers yet.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#0F172A] text-white flex items-center justify-center font-bold text-lg mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-[#0F172A] mb-2">Complete the Course</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Work through {courseModules.length} modules covering everything from AI search 
                fundamentals to future trends. Practical, no-fluff content you can act on.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#0F172A] text-white flex items-center justify-center font-bold text-lg mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-[#0F172A] mb-2">Final Assessment</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Retake the assessment after the course. This time you&apos;ll see your score, 
                improvement, and a full breakdown of right and wrong answers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Course Modules Preview */}
      <section className="py-16 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-10 text-center">What You&apos;ll Learn</h2>
          <div className="grid gap-4">
            {courseModules.map((mod) => (
              <div
                key={mod.slug}
                className="bg-white border-2 border-[#0F172A] p-5 flex items-start gap-4"
              >
                <div className="w-8 h-8 bg-[#0EA5E9] text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {mod.order}
                </div>
                <div>
                  <h3 className="font-semibold text-[#0F172A]">{mod.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{mod.description}</p>
                  <p className="text-xs text-slate-400 mt-2">~{mod.estimatedMinutes} min read</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enrollment Form */}
      <section className="py-20" id="enroll">
        <div className="max-w-md mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2 text-center">Start the Course</h2>
          <p className="text-sm text-slate-600 text-center mb-8">
            Enter your details to begin with the baseline assessment.
          </p>

          <form onSubmit={handleEnroll} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#0F172A] mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full px-4 py-3 border-2 border-[#0F172A] bg-white text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#0EA5E9] transition-colors"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#0F172A] mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-4 py-3 border-2 border-[#0F172A] bg-white text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#0EA5E9] transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0EA5E9] text-white font-semibold py-3 px-6 hover:bg-[#0284C7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting...' : 'Begin Baseline Assessment'}
            </button>

            <p className="text-xs text-slate-400 text-center">
              Already enrolled? Enter the same email to resume where you left off.
            </p>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Context Memo. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
