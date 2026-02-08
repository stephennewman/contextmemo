'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle2, Loader2, Circle, Zap, Terminal, ChevronRight, ArrowRight, X, Minimize2, Maximize2 } from 'lucide-react'

interface OnboardingFlowProps {
  brandId: string
  brandName: string
  brandDomain: string
  hasContext: boolean
  hasQueries: boolean
  queryCount: number
}

type Phase = 'setup' | 'results' | 'memos' | 'monitoring' | 'tutorial' | 'done'
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
  gapEstimate: number
  totalCitations: number
  uniqueDomains: number
  topDomains: { domain: string; count: number }[]
}

interface StatusResponse {
  hasContext: boolean
  hasQueries: boolean
  hasScans: boolean
  queryCount: number
  scanCount: number
  contextSummary: string
  memoCount: number
  competitorCount: number
  competitors: string[]
  scanSummary: ScanSummary | null
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
      'Connecting to website...',
      'Crawling site pages...',
      'Extracting products & services...',
      'Identifying target personas...',
      'Analyzing brand positioning...',
      'Processing with AI...',
    ],
  },
  queries: {
    action: 'generate_queries',
    title: 'Reverse-Engineering Prompts',
    shortTitle: 'Prompts',
    progressMessages: [
      'Analyzing buyer intent patterns...',
      'Generating top-of-funnel queries...',
      'Generating mid-funnel queries...',
      'Generating bottom-funnel queries...',
      'Prioritizing by relevance...',
    ],
  },
  scan: {
    action: 'run_scan',
    title: 'Running First AI Scan',
    shortTitle: 'AI Scan',
    progressMessages: [
      'Querying AI models...',
      'Analyzing responses for mentions...',
      'Extracting citations...',
      'Identifying competitors from citations...',
      'Calculating visibility scores...',
    ],
  },
}

// Tutorial steps
const TUTORIAL_STEPS = [
  {
    title: 'Prompts',
    description: 'The queries buyers ask AI. We track which ones mention you.',
    tab: 'prompts',
  },
  {
    title: 'Citations',
    description: 'See which domains AI models cite — and where you rank.',
    tab: 'citations',
  },
  {
    title: 'Memos',
    description: 'Factual content generated to fill your visibility gaps.',
    tab: 'memos',
  },
  {
    title: 'Entities',
    description: 'Competitors and domains discovered from AI responses.',
    tab: 'entities',
  },
  {
    title: 'Automations',
    description: 'Control what runs, how often, and your spend.',
    tab: '/automations',
  },
]

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
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null)
  const [memoCount, setMemoCount] = useState(0)
  const [competitorCount, setCompetitorCount] = useState(0)
  const [competitors, setCompetitors] = useState<string[]>([])
  const [tutorialStep, setTutorialStep] = useState(0)
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
        setScanSummary(status.scanSummary)
        setCompetitorCount(status.competitorCount)
        setCompetitors(status.competitors)
        setMemoCount(status.memoCount)
        setPhase('results')
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
              setScanSummary(status.scanSummary)
              setCompetitorCount(status.competitorCount)
              setCompetitors(status.competitors)
              setMemoCount(status.memoCount)
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
            setScanSummary(finalStatus.scanSummary)
            setCompetitorCount(finalStatus.competitorCount)
            setCompetitors(finalStatus.competitors)
            setMemoCount(finalStatus.memoCount)
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
    setPhase('results')
  }, [brandId, brandName, hasContext, hasQueries, addLine, completeWorkingLines, pollStatus])

  // Auto-start setup
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true
      runSetup()
    }
  }, [runSetup])

  // ── Phase 2: Show Results + Transition to Memos ──
  const showResultsInTerminal = useCallback(() => {
    if (!scanSummary) return

    setProgressLines(prev => [
      ...prev,
      { text: '', type: 'info' },
      { text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', type: 'header' },
      { text: '  SCAN RESULTS', type: 'header' },
      { text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', type: 'header' },
      { text: '', type: 'info' },
      { text: `  Scans completed     ${scanSummary.totalScans}`, type: 'result' },
      { text: `  Mention rate        ${scanSummary.mentionRate}%`, type: scanSummary.mentionRate >= 30 ? 'success' : 'result' },
      { text: `  Citation rate       ${scanSummary.citationRate}%`, type: scanSummary.citationRate >= 20 ? 'success' : 'result' },
      { text: `  Total citations     ${scanSummary.totalCitations}`, type: 'result' },
      { text: `  Unique domains      ${scanSummary.uniqueDomains}`, type: 'result' },
      { text: `  Competitors found   ${competitorCount}`, type: 'result' },
      { text: '', type: 'info' },
    ])

    if (scanSummary.topDomains.length > 0) {
      setProgressLines(prev => [
        ...prev,
        { text: '  TOP CITED DOMAINS', type: 'header' },
        ...scanSummary.topDomains.map(d => ({
          text: `    ${d.domain.padEnd(30)} ${d.count}x`,
          type: 'info' as const,
        })),
        { text: '', type: 'info' },
      ])
    }

    if (competitors.length > 0) {
      setProgressLines(prev => [
        ...prev,
        { text: '  COMPETITORS DISCOVERED', type: 'header' },
        ...competitors.map(c => ({
          text: `    → ${c}`,
          type: 'info' as const,
        })),
        { text: '', type: 'info' },
      ])
    }

    // Assessment
    const assessment = scanSummary.mentionRate >= 40
      ? 'Strong baseline visibility. Memos will strengthen your position.'
      : scanSummary.mentionRate >= 15
      ? 'Moderate visibility. Memos will help fill the gaps.'
      : 'Low visibility — generating memos will help AI models discover you.'

    setProgressLines(prev => [
      ...prev,
      { text: `  ${assessment}`, type: scanSummary.mentionRate >= 40 ? 'success' : 'info' },
      { text: '', type: 'info' },
      { text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', type: 'header' },
    ])
  }, [scanSummary, competitorCount, competitors])

  useEffect(() => {
    if (phase === 'results' && scanSummary) {
      showResultsInTerminal()
    }
  }, [phase, scanSummary, showResultsInTerminal])

  // ── Phase 3: Memo Generation ──
  const startMemoPhase = useCallback(async () => {
    setPhase('memos')
    addLine('', 'info')
    addLine('▶ STEP 2: Generating Memos', 'header')
    addLine('  Creating factual content for your visibility gaps...', 'info')
    addLine('  Memos are AI-optimized reference content that helps', 'info')
    addLine('  AI models cite your brand when answering queries.', 'info')
    addLine('', 'info')

    // Memos are already being auto-generated by the scan (autoGenerateMemos: true)
    // We just need to poll and show progress
    addLine('Generating memos for top gaps...', 'working')

    const pollStart = Date.now()
    const maxWait = 120000 // 2 minutes

    while (Date.now() - pollStart < maxWait) {
      await new Promise(r => setTimeout(r, 5000))

      const status = await pollStatus()
      if (!status) continue

      if (status.memoCount > memoCount) {
        completeWorkingLines()
        setMemoCount(status.memoCount)
        addLine(`  ${status.memoCount} memo${status.memoCount !== 1 ? 's' : ''} generated`, 'success')

        // If we've been waiting a while and memos are appearing, good enough
        if (status.memoCount >= 2 || Date.now() - pollStart > 30000) {
          break
        }
        addLine('Generating more...', 'working')
      }
    }

    completeWorkingLines()
    
    // Final memo count check
    const finalStatus = await pollStatus()
    const finalMemoCount = finalStatus?.memoCount || memoCount

    if (finalMemoCount > 0) {
      addLine('', 'info')
      addLine(`✓ ${finalMemoCount} memo${finalMemoCount !== 1 ? 's' : ''} ready`, 'success')
      addLine('  Published to your subdomain for AI crawling.', 'info')
    } else {
      addLine('  Memos are generating in the background.', 'info')
      addLine('  Check the MEMOS tab shortly.', 'info')
    }

    addLine('', 'info')
    addLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'header')

    // Move to monitoring phase
    setPhase('monitoring')
  }, [addLine, completeWorkingLines, pollStatus, memoCount])

  // ── Phase 4: Monitoring ──
  const startMonitoring = useCallback(async () => {
    addLine('', 'info')
    addLine('▶ STEP 3: Daily Monitoring Active', 'header')
    addLine('', 'info')
    addLine('  Your brand is now being monitored automatically:', 'info')
    addLine('    • Daily AI visibility scans', 'success')
    addLine('    • Competitor content monitoring', 'success')
    addLine('    • Auto-memo generation for new gaps', 'success')
    addLine('    • Citation verification', 'success')
    addLine('', 'info')
    addLine('  Configure frequency and budget in Automations.', 'info')
    addLine('', 'info')
    addLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'header')
    addLine('  SETUP COMPLETE', 'success')
    addLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'header')

    // Small delay then show tutorial
    await new Promise(r => setTimeout(r, 1000))
    setPhase('tutorial')
  }, [addLine])

  // ── Render: Setup Phase Step Indicators ──
  const setupSteps = [
    { id: 'extract' as SetupStep, label: 'Brand Scan' },
    { id: 'queries' as SetupStep, label: 'Prompts' },
    { id: 'scan' as SetupStep, label: 'AI Scan' },
  ]

  // ── Render: Action Button for current phase ──
  const renderActionButton = () => {
    if (phase === 'results') {
      return (
        <button
          onClick={startMemoPhase}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0EA5E9] text-white font-bold text-sm hover:bg-[#0284C7] transition-colors"
        >
          STEP 2: GENERATE MEMOS
          <ChevronRight className="h-4 w-4" />
        </button>
      )
    }

    if (phase === 'monitoring') {
      return (
        <button
          onClick={startMonitoring}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#10B981] text-white font-bold text-sm hover:bg-[#059669] transition-colors"
        >
          STEP 3: ACTIVATE MONITORING
          <ChevronRight className="h-4 w-4" />
        </button>
      )
    }

    if (phase === 'tutorial') {
      return (
        <button
          onClick={() => {
            window.location.href = `/brands/${brandId}`
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#F59E0B] text-white font-bold text-sm hover:bg-[#D97706] transition-colors"
        >
          GO TO DASHBOARD
          <ArrowRight className="h-4 w-4" />
        </button>
      )
    }

    return null
  }

  // ── Render: Tutorial Cards ──
  if (phase === 'tutorial' && !isMinimized) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Tutorial */}
        <div className="border-[3px] border-[#0F172A] overflow-hidden">
          <div className="bg-[#0F172A] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#F59E0B] rounded-lg">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold tracking-wide">QUICK TOUR</h2>
                <p className="text-sm text-slate-300">Here&apos;s where to find things</p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = `/brands/${brandId}`}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            {TUTORIAL_STEPS.map((step, i) => {
              const isActive = tutorialStep === i
              const isComplete = tutorialStep > i
              return (
                <button
                  key={step.tab}
                  onClick={() => setTutorialStep(i)}
                  className={`w-full text-left flex items-center gap-4 p-4 border-2 transition-all ${
                    isActive
                      ? 'border-[#0EA5E9] bg-sky-50'
                      : isComplete
                      ? 'border-[#10B981] bg-emerald-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isComplete ? 'bg-[#10B981] text-white' :
                    isActive ? 'bg-[#0EA5E9] text-white' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {isComplete ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-bold">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${isActive ? 'text-[#0EA5E9]' : 'text-[#0F172A]'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#0EA5E9]' : 'text-slate-300'}`} />
                </button>
              )
            })}
          </div>

          <div className="bg-[#0F172A] px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-400">
              {tutorialStep + 1} of {TUTORIAL_STEPS.length}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMinimized(true)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Show Terminal
              </button>
              <button
                onClick={() => window.location.href = `/brands/${brandId}`}
                className="px-4 py-1.5 bg-[#F59E0B] text-white font-bold text-xs hover:bg-[#D97706] transition-colors"
              >
                GO TO DASHBOARD →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
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
                  phase === 'results' ? 'Scan complete' :
                  phase === 'memos' ? 'Generating memos...' :
                  phase === 'monitoring' ? 'Ready' :
                  phase === 'tutorial' ? 'Setup complete' :
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

            {/* Phase indicator (post-setup) */}
            {phase !== 'setup' && (
              <div className="px-4 py-2.5 border-b-2 border-[#0F172A] bg-zinc-50">
                <div className="flex items-center gap-4">
                  {['Scan', 'Memos', 'Monitor'].map((label, i) => {
                    const phaseOrder: Phase[] = ['results', 'memos', 'monitoring']
                    const phaseIndex = phaseOrder.indexOf(phase)
                    const isComplete = i < phaseIndex || phase === 'tutorial' || phase === 'done'
                    const isCurrent = i === phaseIndex
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isComplete ? 'bg-[#10B981] text-white' :
                          isCurrent ? 'bg-[#0EA5E9] text-white' :
                          'bg-zinc-200 text-zinc-400'
                        }`}>
                          {isComplete ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                        </div>
                        <span className={`text-xs font-medium ${
                          isComplete ? 'text-[#10B981]' :
                          isCurrent ? 'text-[#0EA5E9]' :
                          'text-zinc-400'
                        }`}>{label}</span>
                        {i < 2 && <div className="w-6 h-px bg-zinc-200" />}
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
                <div key={i} className="flex items-start gap-2 py-0.5">
                  {line.type === 'working' && (
                    <Loader2 className="h-4 w-4 text-[#0EA5E9] animate-spin shrink-0 mt-0.5" />
                  )}
                  {line.type === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                  )}
                  {line.type === 'header' && line.text && (
                    <span className="text-[#7aa2f7] font-bold whitespace-pre">{line.text}</span>
                  )}
                  {line.type === 'result' && (
                    <span className="text-[#0EA5E9] whitespace-pre">{line.text}</span>
                  )}
                  {line.type === 'action' && (
                    <span className="text-[#F59E0B] font-bold">{line.text}</span>
                  )}
                  {line.type === 'info' && line.text && (
                    <>
                      <span className="text-slate-500 shrink-0">→</span>
                      <span className="text-slate-400 whitespace-pre">{line.text}</span>
                    </>
                  )}
                  {line.type === 'working' && (
                    <span className="text-slate-300">{line.text}</span>
                  )}
                  {line.type === 'success' && (
                    <span className="text-[#10B981]">{line.text}</span>
                  )}
                </div>
              ))}

              {/* Blinking cursor */}
              {(phase === 'setup' || phase === 'memos') && !hasError && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-4 bg-[#0EA5E9] animate-pulse" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-[#0F172A] px-4 py-3 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className={`font-mono text-sm ${
                  phase === 'tutorial' || phase === 'done' ? 'text-[#10B981]' :
                  hasError ? 'text-[#F59E0B]' :
                  'text-[#0EA5E9]'
                }`}>
                  {phase === 'setup' ? '● PROCESSING' :
                   phase === 'results' ? '● SCAN COMPLETE' :
                   phase === 'memos' ? '● GENERATING' :
                   phase === 'monitoring' ? '● READY' :
                   phase === 'tutorial' || phase === 'done' ? '● SETUP COMPLETE' :
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
