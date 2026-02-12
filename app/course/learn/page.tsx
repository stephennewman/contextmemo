'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { courseModules } from '@/lib/course/modules'
import { advancedModules } from '@/lib/course/advanced-modules'
import type { CourseModule } from '@/lib/course/types'

interface ModuleProgressItem {
  module_slug: string
  completed: boolean
}

export default function LearnOverviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [moduleProgress, setModuleProgress] = useState<ModuleProgressItem[]>([])
  const [courseCompleted, setCourseCompleted] = useState(false)
  const [finalCompleted, setFinalCompleted] = useState(false)
  const [courseTrack, setCourseTrack] = useState<'standard' | 'advanced'>('standard')
  const [activeModules, setActiveModules] = useState<CourseModule[]>(courseModules)

  useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await fetch('/api/course/progress')
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/course')
            return
          }
          return
        }

        const data = await res.json()
        setModuleProgress(data.moduleProgress || [])
        setCourseCompleted(data.enrollment?.course_completed || false)
        setFinalCompleted(data.enrollment?.final_completed || false)

        const track = data.courseTrack || data.enrollment?.course_track || 'standard'
        setCourseTrack(track)
        setActiveModules(
          track === 'advanced'
            ? [...courseModules, ...advancedModules]
            : courseModules
        )

        // If they haven't done baseline, redirect
        if (!data.enrollment?.baseline_completed) {
          router.push('/course/assessment?type=baseline')
          return
        }
      } catch {
        // Continue with empty progress
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
  }, [router])

  if (loading) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0EA5E9] border-t-transparent animate-spin" />
      </main>
    )
  }

  const completedSlugs = new Set(moduleProgress.filter(p => p.completed).map(p => p.module_slug))
  const completedCount = completedSlugs.size
  const totalModules = activeModules.length
  const progressPercent = Math.round((completedCount / totalModules) * 100)

  // Split modules into standard and advanced sections
  const standardMods = activeModules.filter(m => !m.slug.startsWith('adv-'))
  const advancedMods = activeModules.filter(m => m.slug.startsWith('adv-'))

  return (
    <main className="py-12 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-3xl font-bold text-[#0F172A]">Course Modules</h1>
            {courseTrack === 'advanced' && (
              <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 bg-purple-100 text-purple-700 border border-purple-300">
                Advanced Track
              </span>
            )}
          </div>
          <p className="text-slate-600">
            {courseTrack === 'advanced'
              ? 'Your baseline score qualified you for the advanced track. You\'ll cover the standard modules plus deep-dive advanced content.'
              : 'Work through each module to build your AI search knowledge. Complete all modules to unlock the final assessment.'
            }
          </p>

          {/* Progress bar */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-2 bg-slate-100 border border-slate-200">
              <div
                className="h-full bg-[#0EA5E9] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-[#0F172A] shrink-0">
              {completedCount}/{totalModules} complete
            </span>
          </div>
        </div>

        {/* Standard Module list */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-4 mb-2">
            Core Modules
          </h2>
          {standardMods.map((mod) => {
            const isCompleted = completedSlugs.has(mod.slug)
            return (
              <ModuleRow key={mod.slug} mod={mod} isCompleted={isCompleted} onClick={() => router.push(`/course/learn/${mod.slug}`)} />
            )
          })}
        </div>

        {/* Advanced Modules */}
        {advancedMods.length > 0 && (
          <div className="space-y-3 mt-8">
            <h2 className="text-sm font-bold text-purple-600 uppercase tracking-wider mt-4 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Advanced Modules
            </h2>
            {advancedMods.map((mod) => {
              const isCompleted = completedSlugs.has(mod.slug)
              return (
                <ModuleRow key={mod.slug} mod={mod} isCompleted={isCompleted} isAdvanced onClick={() => router.push(`/course/learn/${mod.slug}`)} />
              )
            })}
          </div>
        )}

        {/* Final Assessment CTA */}
        <div className="mt-10 p-6 border-2 border-[#0F172A] bg-slate-50 text-center">
          {courseCompleted && !finalCompleted ? (
            <>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">All Modules Complete!</h3>
              <p className="text-sm text-slate-600 mb-4">
                You&apos;ve finished all the course material. Take the final assessment to see how much you&apos;ve learned.
              </p>
              <button
                onClick={() => router.push('/course/assessment?type=final')}
                className="bg-[#0EA5E9] text-white font-semibold py-3 px-8 hover:bg-[#0284C7] transition-colors"
              >
                Take Final Assessment
              </button>
            </>
          ) : finalCompleted ? (
            <>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">Course Complete</h3>
              <p className="text-sm text-slate-600 mb-4">
                You&apos;ve completed the course and the final assessment.
              </p>
              <button
                onClick={() => router.push('/course/results?type=final')}
                className="bg-[#0F172A] text-white font-semibold py-3 px-8 hover:bg-slate-800 transition-colors"
              >
                View Final Results
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-slate-400 mb-2">Final Assessment</h3>
              <p className="text-sm text-slate-400">
                Complete all {totalModules} modules to unlock the final assessment.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

function ModuleRow({ mod, isCompleted, isAdvanced, onClick }: {
  mod: CourseModule
  isCompleted: boolean
  isAdvanced?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-5 border-2 transition-all flex items-center gap-4 ${
        isCompleted
          ? 'border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50'
          : isAdvanced
          ? 'border-purple-400 hover:bg-purple-50'
          : 'border-[#0F172A] hover:bg-slate-50'
      }`}
    >
      <div className={`w-10 h-10 shrink-0 flex items-center justify-center font-bold text-sm ${
        isCompleted
          ? 'bg-emerald-500 text-white'
          : isAdvanced
          ? 'bg-purple-600 text-white'
          : 'bg-[#0F172A] text-white'
      }`}>
        {isCompleted ? '✓' : mod.order}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[#0F172A]">{mod.title}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{mod.description}</p>
      </div>
      <div className="shrink-0 text-xs text-slate-400">
        ~{mod.estimatedMinutes} min
      </div>
      <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}
