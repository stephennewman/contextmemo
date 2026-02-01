'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OnboardingTerminal } from './onboarding-terminal'
import { CheckCircle2 } from 'lucide-react'

interface OnboardingFlowProps {
  brandId: string
  brandName: string
  hasContext: boolean
  hasCompetitors: boolean
  hasQueries: boolean
  competitorCount: number
  queryCount: number
}

type OnboardingStep = 'extract' | 'competitors' | 'queries'

export function OnboardingFlow({
  brandId,
  brandName,
  hasContext,
  hasCompetitors,
  hasQueries,
  competitorCount,
  queryCount,
}: OnboardingFlowProps) {
  // Track which step is currently showing the terminal
  const [activeTerminal, setActiveTerminal] = useState<OnboardingStep | null>(null)

  // Determine current step
  const getCurrentStep = (): OnboardingStep => {
    if (!hasContext) return 'extract'
    if (!hasCompetitors) return 'competitors'
    if (!hasQueries) return 'queries'
    return 'queries' // All done (shouldn't happen in onboarding flow)
  }

  const currentStep = getCurrentStep()

  const steps: {
    id: OnboardingStep
    title: string
    description: string
    completedDescription: string
  }[] = [
    {
      id: 'extract',
      title: 'Extract Brand Context',
      description: `Scan ${brandName}'s website to understand products and target audience`,
      completedDescription: 'Extracted products, personas, and positioning',
    },
    {
      id: 'competitors',
      title: 'Discover Competitors',
      description: 'Find who you\'re competing with in AI conversations',
      completedDescription: `Found ${competitorCount} competitors to track`,
    },
    {
      id: 'queries',
      title: 'Generate Prompts',
      description: 'Create the prompts your buyers ask AI assistants',
      completedDescription: `Generated ${queryCount} prompts to monitor`,
    },
  ]

  const isStepComplete = (stepId: OnboardingStep): boolean => {
    switch (stepId) {
      case 'extract': return hasContext
      case 'competitors': return hasCompetitors
      case 'queries': return hasQueries
      default: return false
    }
  }

  const isStepActive = (stepId: OnboardingStep): boolean => {
    return stepId === currentStep
  }

  const isStepLocked = (stepId: OnboardingStep): boolean => {
    const stepOrder: OnboardingStep[] = ['extract', 'competitors', 'queries']
    const stepIndex = stepOrder.indexOf(stepId)
    const currentIndex = stepOrder.indexOf(currentStep)
    return stepIndex > currentIndex
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-[3px] border-[#0F172A] overflow-hidden">
        <CardHeader className="border-b-[3px] border-[#0F172A] bg-[#0F172A] text-white">
          <CardTitle className="text-lg tracking-wide">GET STARTED</CardTitle>
          <CardDescription className="text-slate-300">
            Complete these steps to start tracking your AI visibility
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {steps.map((step, index) => {
            const complete = isStepComplete(step.id)
            const active = isStepActive(step.id)
            const locked = isStepLocked(step.id)
            const showTerminal = activeTerminal === step.id || (active && activeTerminal === null)

            return (
              <div
                key={step.id}
                className={`border-b-2 last:border-b-0 border-[#0F172A] transition-all ${
                  complete ? 'bg-[#F0FDF4]' :
                  active ? 'bg-[#FFFBEB]' :
                  'bg-zinc-50 opacity-50'
                }`}
              >
                {/* Step Header */}
                <div className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                      complete ? 'bg-[#10B981] text-white' :
                      active ? 'bg-[#F59E0B] text-white' :
                      'bg-zinc-200 text-zinc-400'
                    }`}>
                      {complete ? <CheckCircle2 className="h-6 w-6" /> : index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#0F172A] text-lg">{step.title}</p>
                      <p className="text-sm text-zinc-600">
                        {complete ? step.completedDescription : step.description}
                      </p>
                    </div>
                    {complete && (
                      <span className="text-sm font-medium text-[#10B981]">Complete</span>
                    )}
                    {active && !complete && !showTerminal && (
                      <span className="text-sm font-medium text-[#F59E0B]">Ready</span>
                    )}
                    {locked && (
                      <span className="text-sm text-zinc-400">Waiting</span>
                    )}
                  </div>
                </div>

                {/* Terminal (only for active step) */}
                {active && !complete && (
                  <div className="px-5 pb-5">
                    <OnboardingTerminal
                      brandId={brandId}
                      step={step.id}
                      onComplete={() => setActiveTerminal(null)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* What happens next */}
      <div className="mt-6 p-4 bg-zinc-50 border-2 border-zinc-200 rounded-lg">
        <p className="text-sm text-zinc-600">
          <strong>What happens next?</strong> After setup, we&apos;ll run your first visibility scan across 6 AI models (ChatGPT, Claude, Gemini, Perplexity, Llama, Mistral) to see how often your brand is mentioned.
        </p>
      </div>
    </div>
  )
}
