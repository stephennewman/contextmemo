'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle2, Loader2, Circle, Terminal, ChevronRight, ArrowRight, X, Minimize2, Maximize2 } from 'lucide-react'

interface OnboardingFlowProps {
  brandId: string
  brandName: string
  brandDomain: string
  hasContext: boolean
  hasQueries: boolean
  queryCount: number
}

type Phase = 'setup' | 'reveal' | 'memos' | 'done'
type SetupStep = 'extract' | 'queries' | 'scan'

interface ProgressLine {
  text: string
  type: 'info' | 'success' | 'working' | 'header' | 'result' | 'action'
}

interface ScanSummary {
  totalScans: number
  mentionRate: number
  citationRate: number
  mentioned: number
  brandCited: number
  gapCount: number
  totalCitations: number
  uniqueDomains: number
  topDomains: { domain: string; count: number }[]
}

interface BrandDetails {
  companyName: string
  description: string
  products: string[]
  personas: string[]
  markets: string[]
}

interface PromptSamples {
  top_funnel: string[]
  mid_funnel: string[]
  bottom_funnel: string[]
  counts: { top: number; mid: number; bottom: number }
}

interface GapQuery {
  id: string
  text: string
  funnel: string
}

interface TopCitedUrl {
  url: string
  domain: string
  count: number
}

interface StatusResponse {
  hasContext: boolean
  hasQueries: boolean
  hasScans: boolean
  queryCount: number
  scanCount: number
  contextSummary: string
  brandDetails: BrandDetails | null
  promptSamples: PromptSamples
  memoCount: number
  competitorCount: number
  competitors: string[]
  entities: { name: string; domain: string; type: string }[]
  entityGroups: Record<string, string[]>
  topCitedUrls: TopCitedUrl[]
  scanSummary: ScanSummary | null
  gapQueries: GapQuery[]
}

// Setup step configurations
const STEP_CONFIGS: Record<SetupStep, {
  action: string
  title: string
  shortTitle: string
  progressMessages: string[]
}> = {
  extract: {
    action: 'extract_context',
    title: 'Scanning Brand Website',
    shortTitle: 'Brand Scan',
    progressMessages: [
      'Crawling site and extracting brand context...',
      'Processing products, personas, positioning...',
    ],
  },
  queries: {
    action: 'generate_queries',
    title: 'Generating Prompts',
    shortTitle: 'Prompts',
    progressMessages: [
      'Building buyer queries across funnel stages...',
      'Prioritizing by intent...',
    ],
  },
  scan: {
    action: 'run_scan',
    title: 'Running AI Scan',
    shortTitle: 'AI Scan',
    progressMessages: [
      'Querying AI models and extracting citations...',
      'Classifying entities and scoring visibility...',
    ],
  },
}

// Narrative steps shown in the terminal after scan
const REVEAL_STEPS = [
  'brand',     // 1. Here's your brand
  'prompts',   // 2. Here's your prompts
  'citations', // 3. Here's the citations (plus how you did)
  'entities',  // 4. Here's the entities in those citations
  'gaps',      // 5. Here's your content gaps
  'memos',     // 6. Generate memos to fill them
] as const

export function OnboardingFlow({
  brandId,
  brandName,
  brandDomain,
  hasContext,
  hasQueries,
}: OnboardingFlowProps) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [currentStep, setCurrentStep] = useState<SetupStep | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<SetupStep>>(new Set())
  const [progressLines, setProgressLines] = useState<ProgressLine[]>([])
  const [hasError, setHasError] = useState(false)
  const [statusData, setStatusData] = useState<StatusResponse | null>(null)
  const [revealStep, setRevealStep] = useState(0)
  const [revealAnimating, setRevealAnimating] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const messageIndexRef = useRef(0)
  const hasStartedRef = useRef(false)

  // Auto-scroll progress
  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight
    }
  }, [progressLines])

  const addLine = useCallback((text: string, type: ProgressLine['type'] = 'info') => {
    setProgressLines(prev => [...prev, { text, type }])
  }, [])

  // Add a line with a delay (for streaming effect in async flows)
  const addLineDelayed = useCallback(async (text: string, type: ProgressLine['type'] = 'info', ms = 80) => {
    await new Promise(r => setTimeout(r, ms))
    setProgressLines(prev => [...prev, { text, type }])
  }, [])

  const completeWorkingLines = useCallback(() => {
    setProgressLines(prev => prev.map(line =>
      line.type === 'working' ? { ...line, type: 'info' as const } : line
    ))
  }, [])

  const pollStatus = useCallback(async (): Promise<StatusResponse | null> => {
    try {
      const res = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_status' }),
      })
      if (res.ok) return await res.json()
    } catch { /* ignore */ }
    return null
  }, [brandId])

  // ── Phase 1: Setup Pipeline ──
  const runSetup = useCallback(async () => {
    addLine(`Initializing ${brandName}...`, 'info')

    const steps: SetupStep[] = ['extract', 'queries', 'scan']

    // Find first incomplete step
    let triggerStep: SetupStep | null = null
    for (const step of steps) {
      if (step === 'extract' && hasContext) {
        addLine(`✓ Brand context already extracted`, 'success')
        setCompletedSteps(prev => new Set([...prev, step]))
        continue
      }
      if (step === 'queries' && hasQueries) {
        addLine(`✓ Prompts already generated`, 'success')
        setCompletedSteps(prev => new Set([...prev, step]))
        continue
      }
      triggerStep = step
      break
    }

    if (!triggerStep) {
      // Check if scan data exists
      const status = await pollStatus()
      if (status?.hasScans && status.scanSummary) {
        setStatusData(status)
        setPhase('reveal')
        return
      }
      triggerStep = 'scan'
    }

    // Trigger the first incomplete step
    const triggerConfig = STEP_CONFIGS[triggerStep]
    setCurrentStep(triggerStep)
    addLine(``, 'info')
    addLine(`▶ ${triggerConfig.title}`, 'header')

    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: triggerConfig.action }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Action failed')
      }
    } catch (error) {
      completeWorkingLines()
      addLine(`⚠ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'info')
      setHasError(true)
      return
    }

    // Poll for ALL steps to complete
    for (const step of steps) {
      if (step === 'extract' && hasContext) continue
      if (step === 'queries' && hasQueries) continue

      setCurrentStep(step)
      const config = STEP_CONFIGS[step]

      if (step !== triggerStep) {
        addLine(``, 'info')
        addLine(`▶ ${config.title}`, 'header')
      }

      messageIndexRef.current = 0
      const showNextMessage = () => {
        if (messageIndexRef.current < config.progressMessages.length) {
          addLine(config.progressMessages[messageIndexRef.current], 'working')
          messageIndexRef.current++
        }
      }
      showNextMessage()

      const pollStart = Date.now()
      const maxPollTime = step === 'extract' ? 120000 : step === 'scan' ? 120000 : 90000

      let stepCompleted = false
      while (Date.now() - pollStart < maxPollTime) {
        await new Promise(r => setTimeout(r, 3000))
        showNextMessage()

        const status = await pollStatus()
        if (!status) continue

        let complete = false
        let summary = ''

        if (step === 'extract' && status.hasContext) {
          complete = true
          summary = status.contextSummary || 'Brand profile extracted'
        } else if (step === 'queries' && status.hasQueries) {
          complete = true
          summary = `Generated ${status.queryCount || 0} prompts`
        } else if (step === 'scan' && status.hasScans && status.scanCount > 0) {
          // Wait for a reasonable number of results
          const expectedMin = Math.max(10, (status.queryCount || 30) * 0.5)
          if (status.scanCount >= expectedMin || Date.now() - pollStart > 60000) {
            complete = true
            summary = `${status.scanCount} scans completed`
            if (status.scanSummary) {
              setStatusData(status)
            }
          }
        }

        if (complete) {
          completeWorkingLines()
          addLine(`✓ ${summary}`, 'success')
          setCompletedSteps(prev => new Set([...prev, step]))
          stepCompleted = true
          break
        }
      }

      if (!stepCompleted) {
        completeWorkingLines()
        if (step === 'scan') {
          // Try one more status check
          const finalStatus = await pollStatus()
          if (finalStatus?.scanSummary) {
            setStatusData(finalStatus)
          }
          addLine(`✓ Scan processing...`, 'success')
          setCompletedSteps(prev => new Set([...prev, step]))
        } else {
          addLine(`⚠ ${config.shortTitle} timed out`, 'info')
          setHasError(true)
          return
        }
      }
    }

    // Transition to results phase
    setCurrentStep(null)
    completeWorkingLines()
    
    // Small delay then show results
    await new Promise(r => setTimeout(r, 500))
    setPhase('reveal')
  }, [brandId, brandName, hasContext, hasQueries, addLine, completeWorkingLines, pollStatus])

  // Auto-start setup
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true
      runSetup()
    }
  }, [runSetup])

  // ── Phase 2: Progressive Reveal (6-step narrative) ──
  const advanceReveal = useCallback(async () => {
    if (!statusData) return
    const step = revealStep
    const s = statusData.scanSummary
    const b = statusData.brandDetails

    const lines: ProgressLine[] = []

    switch (REVEAL_STEPS[step]) {
      case 'brand': {
        lines.push({ text: '━━━ 1. YOUR BRAND ━━━', type: 'header' })
        if (b) {
          lines.push({ text: `  ${b.companyName}`, type: 'result' })
          if (b.description) {
            const desc = b.description.length > 80 ? b.description.slice(0, 77) + '...' : b.description
            lines.push({ text: `  ${desc}`, type: 'info' })
          }
          if (b.products.length > 0) lines.push({ text: `  Products: ${b.products.join(', ')}`, type: 'info' })
          if (b.personas.length > 0) lines.push({ text: `  Personas: ${b.personas.join(', ')}`, type: 'info' })
          if (b.markets.length > 0) lines.push({ text: `  Markets:  ${b.markets.join(', ')}`, type: 'info' })
        } else {
          lines.push({ text: `  ${brandName} — ${brandDomain}`, type: 'result' })
        }
        break
      }

      case 'prompts': {
        const ps = statusData.promptSamples
        lines.push({ text: '━━━ 2. YOUR PROMPTS ━━━', type: 'header' })
        lines.push({ text: `  ${statusData.queryCount} prompts: ${ps.counts.top} TOFU · ${ps.counts.mid} MOFU · ${ps.counts.bottom} BOFU`, type: 'result' })
        const samples = [...ps.top_funnel.slice(0, 1), ...ps.mid_funnel.slice(0, 1), ...ps.bottom_funnel.slice(0, 1)]
        for (const q of samples) {
          const text = q.length > 58 ? q.slice(0, 55) + '...' : q
          lines.push({ text: `    "${text}"`, type: 'info' })
        }
        break
      }

      case 'citations': {
        lines.push({ text: '━━━ 3. CITATIONS ━━━', type: 'header' })
        if (s) {
          lines.push({ text: `  ${s.totalScans} scans · ${s.totalCitations} citations · ${s.uniqueDomains} domains`, type: 'result' })
          lines.push({ text: `  Mention rate ${s.mentionRate}% · Citation rate ${s.citationRate}%`, type: s.mentionRate >= 30 ? 'success' : 'result' })
          if (s.mentionRate >= 40) {
            lines.push({ text: `  Strong baseline — AI knows about you.`, type: 'success' })
          } else if (s.mentionRate >= 15) {
            lines.push({ text: `  Moderate visibility — room to improve.`, type: 'info' })
          } else {
            lines.push({ text: `  Low visibility — memos will help AI discover you.`, type: 'info' })
          }
        } else {
          lines.push({ text: '  Scan still processing...', type: 'info' })
        }
        break
      }

      case 'entities': {
        lines.push({ text: '━━━ 4. ENTITIES ━━━', type: 'header' })
        
        // Show classified entities
        const groups = statusData.entityGroups || {}
        const hasGroups = Object.values(groups).some(names => names.length > 0)
        if (hasGroups) {
          for (const [label, names] of Object.entries(groups)) {
            if (names.length === 0) continue
            const preview = names.slice(0, 3).join(', ') + (names.length > 3 ? ` +${names.length - 3}` : '')
            lines.push({ text: `  ${label}: ${preview}`, type: label === 'Competitors' ? 'result' : 'info' })
          }
        }
        
        // Top cited domains
        if (s && s.topDomains.length > 0) {
          lines.push({ text: '  Top cited:', type: 'info' })
          for (const d of s.topDomains.slice(0, 5)) {
            const isBrand = d.domain.includes(brandDomain.replace(/^www\./, '').split('.')[0])
            lines.push({
              text: `    ${d.domain.padEnd(26)} ${d.count}x${isBrand ? ' ← you' : ''}`,
              type: isBrand ? 'success' : 'info',
            })
          }
        }
        break
      }

      case 'gaps': {
        lines.push({ text: '━━━ 5. CONTENT GAPS ━━━', type: 'header' })
        const gapCount = s?.gapCount || statusData.gapQueries.length
        lines.push({ text: `  ${gapCount} prompts where AI doesn't mention you`, type: 'result' })
        if (statusData.gapQueries.length > 0) {
          for (const g of statusData.gapQueries.slice(0, 3)) {
            const funnel = g.funnel === 'top_funnel' ? 'TOF' : g.funnel === 'mid_funnel' ? 'MOF' : 'BOF'
            const text = g.text.length > 50 ? g.text.slice(0, 47) + '...' : g.text
            lines.push({ text: `    [${funnel}] "${text}"`, type: 'info' })
          }
          if (statusData.gapQueries.length > 3) {
            lines.push({ text: `    + ${statusData.gapQueries.length - 3} more`, type: 'info' })
          }
        }
        break
      }

      case 'memos': {
        break
      }
    }

    // Animate lines one at a time
    setRevealAnimating(true)
    for (let i = 0; i < lines.length; i++) {
      await new Promise(r => setTimeout(r, i === 0 ? 0 : 80))
      setProgressLines(prev => [...prev, lines[i]])
    }
    setRevealAnimating(false)
    setRevealStep(step + 1)
  }, [statusData, revealStep, brandName, brandDomain])

  // Auto-advance reveal when phase changes to reveal
  useEffect(() => {
    if (phase === 'reveal' && statusData && revealStep === 0) {
      advanceReveal()
    }
  }, [phase, statusData, revealStep, advanceReveal])

  // ── Phase 3: Memo Generation (single best memo) ──
  const startMemoPhase = useCallback(async () => {
    setPhase('memos')
    addLine('━━━ 6. SAMPLE MEMO ━━━', 'header')
    addLine('Writing memo for your #1 gap...', 'working')

    try {
      const res = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_gap_memos', limit: 1 }),
      })

      if (!res.ok) throw new Error('Failed to generate memo')
      const result = await res.json()

      completeWorkingLines()

      if (result.memosGenerated === 0 && result.totalGaps === 0) {
        await addLineDelayed('No gaps found — AI already mentions you!', 'success')
      } else if (result.memosGenerated === 0) {
        await addLineDelayed('Memo generation failed. Try from the Memos tab.', 'info')
      } else {
        const q = result.gapQueries?.[0]
        if (q) {
          const funnel = q.funnel === 'top_funnel' ? 'TOF' : q.funnel === 'mid_funnel' ? 'MOF' : 'BOF'
          await addLineDelayed(`✓ Memo published`, 'success')
          await addLineDelayed(`  [${funnel}] "${q.text.length > 52 ? q.text.slice(0, 49) + '...' : q.text}"`, 'info')
          if (q.citationsFound > 0) {
            await addLineDelayed(`  Based on ${q.citationsFound} sources AI currently cites`, 'info')
          }
          await addLineDelayed(`  ${result.totalGaps - 1} more gaps → generate from Memos tab`, 'info')
        } else {
          await addLineDelayed(`✓ 1 memo published`, 'success')
        }
      }
    } catch (error) {
      completeWorkingLines()
      await addLineDelayed(`⚠ ${error instanceof Error ? error.message : 'Generation failed'}`, 'info')
    }

    await addLineDelayed('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'header', 120)
    await addLineDelayed('ONBOARDING COMPLETE', 'success')
    await addLineDelayed('  View your memo, then generate more from Memos tab.', 'info')
    await addLineDelayed('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'header')

    setPhase('done')
  }, [brandId, addLine, completeWorkingLines])

  // ── Render: Setup Phase Step Indicators ──
  const setupSteps = [
    { id: 'extract' as SetupStep, label: 'Brand Scan' },
    { id: 'queries' as SetupStep, label: 'Prompts' },
    { id: 'scan' as SetupStep, label: 'AI Scan' },
  ]

  // ── Render: Action Button for current phase ──
  const renderActionButton = () => {
    // During reveal: show "NEXT" to advance through steps 1-5
    if (phase === 'reveal' && revealStep > 0 && revealStep < REVEAL_STEPS.length - 1) {
      const nextLabel = ['Brand', 'Prompts', 'Citations', 'Entities', 'Gaps', 'Memos'][revealStep]
      return (
        <button
          onClick={advanceReveal}
          disabled={revealAnimating}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0F172A] text-white font-bold text-sm hover:bg-[#1E293B] transition-colors border border-slate-600 disabled:opacity-50"
        >
          NEXT: {nextLabel?.toUpperCase()}
          <ChevronRight className="h-4 w-4" />
        </button>
      )
    }

    // After step 5 (gaps): show the memo generation CTA
    if (phase === 'reveal' && revealStep >= REVEAL_STEPS.length - 1) {
      return (
        <button
          onClick={startMemoPhase}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0EA5E9] text-white font-bold text-sm hover:bg-[#0284C7] transition-colors"
        >
          GENERATE SAMPLE MEMO
          <ArrowRight className="h-4 w-4" />
        </button>
      )
    }

    // After memos are done
    if (phase === 'done') {
      return (
        <button
          onClick={() => { window.location.href = `/brands/${brandId}` }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#10B981] text-white font-bold text-sm hover:bg-[#059669] transition-colors"
        >
          GO TO DASHBOARD
          <ArrowRight className="h-4 w-4" />
        </button>
      )
    }

    return null
  }

  // ── Render: Main Terminal ──
  return (
    <div className="max-w-3xl mx-auto">
      <div className={`border-[3px] border-[#0F172A] overflow-hidden ${isMinimized ? 'max-h-12' : ''}`}>
        {/* Terminal Header */}
        <div className="bg-[#0F172A] text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#27ca40]" />
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-400 font-mono">
                {brandName} — {
                  phase === 'setup' ? 'Setting up...' :
                  phase === 'reveal' ? `Step ${revealStep} of 6` :
                  phase === 'memos' ? 'Generating memos...' :
                  'Complete'
                }
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Step Indicators (setup phase only) */}
            {phase === 'setup' && (
              <div className="px-4 py-3 border-b-2 border-[#0F172A] bg-zinc-50">
                <div className="flex items-center justify-between">
                  {setupSteps.map((step, index) => {
                    const isCompleted = completedSteps.has(step.id)
                    const isCurrent = currentStep === step.id
                    return (
                      <div key={step.id} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCompleted ? 'bg-[#10B981] text-white' :
                            isCurrent ? 'bg-[#F59E0B] text-white' :
                            'bg-zinc-200 text-zinc-400'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : isCurrent ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </div>
                          <span className={`text-xs mt-1 font-medium ${
                            isCompleted ? 'text-[#10B981]' :
                            isCurrent ? 'text-[#F59E0B]' :
                            'text-zinc-400'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                        {index < setupSteps.length - 1 && (
                          <div className={`w-12 h-0.5 mx-2 ${
                            completedSteps.has(setupSteps[index + 1].id) || currentStep === setupSteps[index + 1].id
                              ? 'bg-[#10B981]'
                              : 'bg-zinc-200'
                          }`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step indicator (reveal phase) */}
            {phase !== 'setup' && (
              <div className="px-4 py-2.5 border-b-2 border-[#0F172A] bg-zinc-50">
                <div className="flex items-center gap-1">
                  {['Brand', 'Prompts', 'Citations', 'Entities', 'Gaps', 'Memos'].map((label, i) => {
                    const isComplete = phase === 'done' || phase === 'memos' ? true : revealStep > i
                    const isCurrent = phase === 'reveal' && revealStep === i + 1
                    return (
                      <div key={label} className="flex items-center gap-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          isComplete ? 'bg-[#10B981] text-white' :
                          isCurrent ? 'bg-[#0EA5E9] text-white' :
                          'bg-zinc-200 text-zinc-400'
                        }`}>
                          {isComplete ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                        </div>
                        <span className={`text-[10px] font-medium hidden sm:inline ${
                          isComplete ? 'text-[#10B981]' :
                          isCurrent ? 'text-[#0EA5E9]' :
                          'text-zinc-400'
                        }`}>{label}</span>
                        {i < 5 && <div className="w-3 h-px bg-zinc-200" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Terminal Output */}
            <div
              ref={progressRef}
              className="h-72 overflow-y-auto bg-[#1a1b26] p-4 font-mono text-sm"
            >
              {progressLines.map((line, i) => (
                <div key={i} className="py-0.5 font-mono text-sm whitespace-pre">
                  {line.type === 'working' && (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 text-[#0EA5E9] animate-spin inline" />
                      <span className="text-slate-300">{line.text}</span>
                    </span>
                  )}
                  {line.type === 'success' && (
                    <span className="text-[#10B981]">{line.text}</span>
                  )}
                  {line.type === 'header' && line.text && (
                    <span className="text-[#7aa2f7] font-bold">{line.text}</span>
                  )}
                  {line.type === 'result' && (
                    <span className="text-[#0EA5E9]">{line.text}</span>
                  )}
                  {line.type === 'action' && (
                    <span className="text-[#F59E0B] font-bold">{line.text}</span>
                  )}
                  {line.type === 'info' && line.text && (
                    <span className="text-slate-400">{line.text}</span>
                  )}
                  {line.type === 'info' && !line.text && (
                    <span>&nbsp;</span>
                  )}
                </div>
              ))}

              {/* Blinking cursor */}
              {(phase === 'setup' || phase === 'memos') && !hasError && currentStep && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-4 bg-[#0EA5E9] animate-pulse" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-[#0F172A] px-4 py-3 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className={`font-mono text-sm ${
                  phase === 'done' ? 'text-[#10B981]' :
                  hasError ? 'text-[#F59E0B]' :
                  'text-[#0EA5E9]'
                }`}>
                  {phase === 'setup' ? '● PROCESSING' :
                   phase === 'reveal' ? `● STEP ${revealStep}/6` :
                   phase === 'memos' ? '● GENERATING' :
                   phase === 'done' ? '● COMPLETE' :
                   hasError ? '● ERROR' : '● PROCESSING'}
                </span>

                <div className="flex items-center gap-3">
                  {renderActionButton()}

                  {hasError && (
                    <button
                      onClick={() => {
                        setHasError(false)
                        setProgressLines([])
                        setCompletedSteps(new Set())
                        hasStartedRef.current = false
                        runSetup()
                      }}
                      className="px-4 py-1.5 bg-[#F59E0B] text-white font-bold text-xs hover:bg-[#D97706] transition-colors"
                    >
                      RETRY
                    </button>
                  )}

                  {phase === 'setup' && !hasError && (
                    <span className="text-slate-400 text-xs">
                      Fully automated
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Info card */}
      {phase === 'setup' && !isMinimized && (
        <div className="mt-6 p-4 bg-zinc-50 border-2 border-zinc-200 rounded-lg">
          <p className="text-sm text-zinc-600">
            <strong>What&apos;s happening?</strong> We&apos;re scanning your website, reverse-engineering buyer prompts, and running your first AI visibility scan. This typically takes 2-3 minutes.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Terminal Widget: Persistent floating terminal ──
export function TerminalWidget({
  brandId,
  brandName,
}: {
  brandId: string
  brandName: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [lines, setLines] = useState<ProgressLine[]>([])
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight
    }
  }, [lines])

  // Load recent activity on open
  useEffect(() => {
    if (!isOpen || lines.length > 0) return

    const loadActivity = async () => {
      try {
        const res = await fetch(`/api/brands/${brandId}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_status' }),
        })
        if (res.ok) {
          const status = await res.json()
          const newLines: ProgressLine[] = [
            { text: `${brandName} — Status`, type: 'header' },
            { text: '', type: 'info' },
            { text: `Prompts tracked    ${status.queryCount}`, type: 'result' },
            { text: `Scans completed    ${status.scanCount}`, type: 'result' },
            { text: `Memos generated    ${status.memoCount}`, type: 'result' },
            { text: `Competitors        ${status.competitorCount}`, type: 'result' },
          ]
          if (status.scanSummary) {
            newLines.push(
              { text: '', type: 'info' },
              { text: `Mention rate       ${status.scanSummary.mentionRate}%`, type: status.scanSummary.mentionRate >= 30 ? 'success' : 'result' },
              { text: `Citation rate      ${status.scanSummary.citationRate}%`, type: status.scanSummary.citationRate >= 20 ? 'success' : 'result' },
            )
          }
          setLines(newLines)
        }
      } catch { /* ignore */ }
    }
    loadActivity()
  }, [isOpen, brandId, brandName, lines.length])

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] text-white text-xs font-mono border-2 border-slate-600 hover:border-[#0EA5E9] transition-colors shadow-lg"
      >
        <Terminal className="h-4 w-4 text-[#0EA5E9]" />
        Terminal
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 border-[3px] border-[#0F172A] shadow-2xl">
      {/* Header */}
      <div className="bg-[#0F172A] px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#27ca40]" />
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            <Terminal className="h-3 w-3 inline mr-1" />
            {brandName}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div
        ref={progressRef}
        className="h-48 overflow-y-auto bg-[#1a1b26] p-3 font-mono text-xs"
      >
        {lines.map((line, i) => (
          <div key={i} className="py-0.5">
            {line.type === 'header' && <span className="text-[#7aa2f7] font-bold">{line.text}</span>}
            {line.type === 'result' && <span className="text-[#0EA5E9] whitespace-pre">{line.text}</span>}
            {line.type === 'success' && <span className="text-[#10B981] whitespace-pre">{line.text}</span>}
            {line.type === 'info' && line.text && <span className="text-slate-400 whitespace-pre">{line.text}</span>}
            {!line.text && <br />}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-[#0F172A] px-3 py-1.5 border-t border-slate-700">
        <span className="text-[10px] text-[#10B981] font-mono">● CONNECTED</span>
      </div>
    </div>
  )
}
