'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { courseModules } from '@/lib/course/modules'
import { advancedModules } from '@/lib/course/advanced-modules'
import type { CourseModule } from '@/lib/course/types'

export default function ModulePage() {
  const router = useRouter()
  const params = useParams()
  const moduleSlug = params.moduleSlug as string

  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [allComplete, setAllComplete] = useState(false)
  const [allModules, setAllModules] = useState<CourseModule[]>(courseModules)

  // Determine which module list this slug belongs to
  const allPossibleModules = [...courseModules, ...advancedModules]
  const currentModule = allPossibleModules.find(m => m.slug === moduleSlug)
  const isAdvancedModule = moduleSlug.startsWith('adv-')

  // Check if already completed and determine module list
  useEffect(() => {
    async function checkProgress() {
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
        const track = data.courseTrack || data.enrollment?.course_track || 'standard'
        const mods = track === 'advanced'
          ? [...courseModules, ...advancedModules]
          : courseModules
        setAllModules(mods)

        const moduleProgress = data.moduleProgress || []
        const isCompleted = moduleProgress.some(
          (p: { module_slug: string; completed: boolean }) => p.module_slug === moduleSlug && p.completed
        )
        setCompleted(isCompleted)
        setAllComplete(data.enrollment?.course_completed || false)
      } catch {
        // Continue
      }
    }
    checkProgress()
  }, [moduleSlug, router])

  // Compute navigation based on allModules (which updates when track is fetched)
  const currentIndex = allModules.findIndex(m => m.slug === moduleSlug)
  const nextModule = currentIndex >= 0 && currentIndex < allModules.length - 1 ? allModules[currentIndex + 1] : null
  const prevModule = currentIndex > 0 ? allModules[currentIndex - 1] : null

  if (!currentModule) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#0F172A] mb-4">Module Not Found</h1>
          <button
            onClick={() => router.push('/course/learn')}
            className="text-[#0EA5E9] hover:underline"
          >
            Back to modules
          </button>
        </div>
      </main>
    )
  }

  async function handleCompleteModule() {
    setCompleting(true)
    try {
      const res = await fetch('/api/course/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleSlug }),
      })

      if (res.ok) {
        const data = await res.json()
        setCompleted(true)
        setAllComplete(data.allModulesComplete)
      }
    } catch {
      // Silently fail
    } finally {
      setCompleting(false)
    }
  }

  return (
    <main className="py-8 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Back navigation */}
        <button
          onClick={() => router.push('/course/learn')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0F172A] transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All Modules
        </button>

        {/* Module header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 flex items-center justify-center font-bold text-sm ${
              completed ? 'bg-emerald-500 text-white' : isAdvancedModule ? 'bg-purple-600 text-white' : 'bg-[#0EA5E9] text-white'
            }`}>
              {completed ? '✓' : currentModule.order}
            </div>
            <span className="text-xs text-slate-500 uppercase tracking-wider">
              {isAdvancedModule ? 'Advanced' : 'Core'} Module {currentModule.order} of {allModules.length}
            </span>
            {isAdvancedModule && (
              <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 bg-purple-100 text-purple-700 border border-purple-300">
                Advanced
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-[#0F172A] mb-2">{currentModule.title}</h1>
          <p className="text-slate-600">{currentModule.description}</p>
          <p className="text-xs text-slate-400 mt-2">~{currentModule.estimatedMinutes} min read</p>
        </div>

        {/* Module content sections */}
        <div className="space-y-12">
          {currentModule.sections.map((section, idx) => (
            <div key={idx} className="border-l-4 border-[#0EA5E9] pl-6">
              <h2 className="text-xl font-bold text-[#0F172A] mb-4">{section.title}</h2>
              <div className="prose prose-slate max-w-none">
                {section.content.split('\n\n').map((paragraph, pIdx) => {
                  // Handle bold headings
                  if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                    const text = paragraph.slice(2, -2)
                    return <p key={pIdx} className="font-bold text-[#0F172A] text-lg mt-6 mb-3">{text}</p>
                  }

                  // Handle list items
                  if (paragraph.includes('\n- ') || paragraph.startsWith('- ')) {
                    const lines = paragraph.split('\n')
                    const title = !lines[0].startsWith('- ') ? lines[0] : null
                    const items = lines.filter(l => l.startsWith('- '))
                    return (
                      <div key={pIdx} className="my-3">
                        {title && <p className="mb-2" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(title) }} />}
                        <ul className="space-y-1.5">
                          {items.map((item, iIdx) => (
                            <li key={iIdx} className="flex gap-2 text-slate-700">
                              <span className="text-[#0EA5E9] mt-1 shrink-0">•</span>
                              <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item.slice(2)) }} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  }

                  // Handle numbered items
                  if (/^\d+\.\s/.test(paragraph.trim()) || paragraph.includes('\n1. ')) {
                    const lines = paragraph.split('\n').filter(Boolean)
                    return (
                      <div key={pIdx} className="my-3 space-y-2">
                        {lines.map((line, lIdx) => (
                          <p key={lIdx} className="text-slate-700" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
                        ))}
                      </div>
                    )
                  }

                  // Regular paragraph
                  return (
                    <p key={pIdx} className="text-slate-700 leading-relaxed my-3" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(paragraph) }} />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Completion section */}
        <div className="mt-12 pt-8 border-t-2 border-[#0F172A]">
          {!completed ? (
            <div className="text-center">
              <button
                onClick={handleCompleteModule}
                disabled={completing}
                className="bg-emerald-500 text-white font-semibold py-3 px-8 hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {completing ? 'Saving...' : 'Mark Module as Complete'}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border-2 border-emerald-500 text-emerald-700 font-semibold text-sm mb-6">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Module Complete
              </div>

              <div className="flex items-center justify-center gap-4">
                {nextModule && (
                  <button
                    onClick={() => router.push(`/course/learn/${nextModule.slug}`)}
                    className="bg-[#0EA5E9] text-white font-semibold py-3 px-6 hover:bg-[#0284C7] transition-colors flex items-center gap-2"
                  >
                    Next: {nextModule.title}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                {!nextModule && allComplete && (
                  <button
                    onClick={() => router.push('/course/assessment?type=final')}
                    className="bg-[#0EA5E9] text-white font-semibold py-3 px-6 hover:bg-[#0284C7] transition-colors"
                  >
                    Take Final Assessment
                  </button>
                )}
                {!nextModule && !allComplete && (
                  <button
                    onClick={() => router.push('/course/learn')}
                    className="bg-[#0F172A] text-white font-semibold py-3 px-6 hover:bg-slate-800 transition-colors"
                  >
                    Back to Modules
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Previous/Next navigation */}
        <div className="mt-8 flex items-center justify-between">
          {prevModule ? (
            <button
              onClick={() => router.push(`/course/learn/${prevModule.slug}`)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0F172A] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {prevModule.title}
            </button>
          ) : <div />}
          {nextModule ? (
            <button
              onClick={() => router.push(`/course/learn/${nextModule.slug}`)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#0F172A] transition-colors"
            >
              {nextModule.title}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : <div />}
        </div>
      </div>
    </main>
  )
}

// Simple inline markdown formatter
function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-[#0F172A]">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-100 px-1 py-0.5 text-sm font-mono">$1</code>')
    .replace(/❌/g, '<span class="text-red-500">❌</span>')
    .replace(/✅/g, '<span class="text-emerald-500">✅</span>')
}
