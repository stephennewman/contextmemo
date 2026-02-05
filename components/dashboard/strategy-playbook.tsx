'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Target,
  Search,
  FileText,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Zap,
  BarChart3,
  RefreshCw,
  Sparkles,
  Clock,
  DollarSign,
  ArrowRight,
  Lightbulb,
  AlertCircle,
} from 'lucide-react'

interface StrategyPlaybookProps {
  brandId: string
  brandName: string
  // Current metrics to show progress
  metrics?: {
    totalPrompts: number
    gapsIdentified: number
    memosGenerated: number
    visibilityScore: number
    aiTrafficVisits?: number
    daysActive: number
  }
}

interface Phase {
  id: string
  name: string
  duration: string
  description: string
  goal: string
  icon: React.ReactNode
  color: string
  activities: Activity[]
  milestones: string[]
  expectedOutcome: string
}

interface Activity {
  name: string
  frequency: string
  cost: string
  description: string
}

const PHASES: Phase[] = [
  {
    id: 'discovery',
    name: 'Phase 1: Discovery',
    duration: 'Weeks 1-4',
    description: 'Map your AI visibility landscape. Discover gaps, competitors, and opportunities.',
    goal: 'Build a comprehensive library of 100-200 prompts and identify all content gaps',
    icon: <Search className="h-5 w-5" />,
    color: 'blue',
    activities: [
      {
        name: 'Prompt Generation',
        frequency: '10-20 new prompts/day',
        cost: '~$0.01/day (Perplexity)',
        description: 'AI generates high-intent buyer questions relevant to your space',
      },
      {
        name: 'Initial Baseline Scan',
        frequency: 'Once at start',
        cost: '~$6 (100 prompts × 3 models)',
        description: 'Full scan across GPT, Claude, Grok to establish baseline visibility',
      },
      {
        name: 'Competitor Discovery',
        frequency: 'Automatic',
        cost: 'Included',
        description: 'Identify who appears when AI answers questions about your space',
      },
      {
        name: 'Gap Analysis',
        frequency: 'Weekly review',
        cost: 'Free',
        description: 'Review which prompts show gaps (not mentioned, competitors cited)',
      },
    ],
    milestones: [
      '100+ prompts discovered',
      'Top 10 competitors identified',
      'Baseline visibility score established',
      'Gap categories mapped (by topic, intent, competitor)',
    ],
    expectedOutcome: 'Clear understanding of where you\'re visible, where you\'re not, and who\'s winning the prompts you should own.',
  },
  {
    id: 'foundation',
    name: 'Phase 2: Foundation Building',
    duration: 'Weeks 5-8',
    description: 'Create citable content to fill your highest-priority gaps.',
    goal: 'Generate 30-50 memos covering your top gaps and publish to your resources',
    icon: <FileText className="h-5 w-5" />,
    color: 'green',
    activities: [
      {
        name: 'Priority Gap Selection',
        frequency: 'Weekly',
        cost: 'Free',
        description: 'Select top 10 gaps per week based on intent, volume, and competitor presence',
      },
      {
        name: 'Memo Generation',
        frequency: '5-10 memos/week',
        cost: '~$0.15-0.30/week',
        description: 'AI generates comprehensive, citable content for each gap',
      },
      {
        name: 'Content Publishing',
        frequency: 'As generated',
        cost: 'Free',
        description: 'Publish memos to your website/resources page for AI indexing',
      },
      {
        name: 'Verification Scans',
        frequency: 'Weekly',
        cost: '~$2/week',
        description: 'Re-scan filled gaps to verify content is being picked up',
      },
    ],
    milestones: [
      '30+ memos published',
      'Top 20 gaps addressed',
      'Comparison pages for top 5 competitors',
      'Industry/use-case coverage complete',
    ],
    expectedOutcome: 'Foundation of citable content that AI can reference. Initial visibility improvements on key prompts.',
  },
  {
    id: 'optimization',
    name: 'Phase 3: Optimization',
    duration: 'Months 3-4',
    description: 'Refine content based on what\'s working. Double down on wins.',
    goal: 'Achieve 50%+ mention rate on core prompts, see measurable AI traffic',
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'purple',
    activities: [
      {
        name: 'Core Prompt Monitoring',
        frequency: '2x/week',
        cost: '~$4/week (100 prompts × 1 model)',
        description: 'Track your top 100 prompts to measure progress',
      },
      {
        name: 'Content Refinement',
        frequency: 'As needed',
        cost: '~$0.03/memo',
        description: 'Update memos that aren\'t getting cited - add specificity, data, examples',
      },
      {
        name: 'Competitor Response',
        frequency: 'Daily monitoring',
        cost: '~$0.50/day',
        description: 'Monitor competitor content and generate differentiated responses',
      },
      {
        name: 'New Prompt Discovery',
        frequency: '5-10/week',
        cost: '~$0.05/week',
        description: 'Continue discovering new relevant prompts to expand coverage',
      },
    ],
    milestones: [
      '50%+ mention rate on core prompts',
      'Citation rate improving week-over-week',
      'Competitor win rate decreasing',
      'First AI-attributed traffic visible in analytics',
    ],
    expectedOutcome: 'Measurable improvement in AI visibility. Traffic starting to flow from AI search.',
  },
  {
    id: 'scale',
    name: 'Phase 4: Scale & Maintain',
    duration: 'Month 5+',
    description: 'Systematic ongoing optimization. Defend and expand your AI presence.',
    goal: 'Sustainable AI visibility with measurable business impact',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'amber',
    activities: [
      {
        name: 'Weekly Monitoring',
        frequency: '1x/week',
        cost: '~$2/week',
        description: 'Track core prompts weekly to catch regressions early',
      },
      {
        name: 'Monthly Full Scan',
        frequency: '1x/month',
        cost: '~$6/month',
        description: 'Comprehensive scan across all models for full picture',
      },
      {
        name: 'Content Freshness',
        frequency: 'Monthly',
        cost: '~$1/month',
        description: 'Update dated content, add new data points, refresh examples',
      },
      {
        name: 'Expansion Discovery',
        frequency: 'Ongoing',
        cost: '~$1/month',
        description: 'Continuously discover new prompts and adjacent opportunities',
      },
    ],
    milestones: [
      'Consistent 60%+ visibility score',
      'Growing AI traffic month-over-month',
      'Winning majority of brand comparison prompts',
      'Recognized as authority in key topics',
    ],
    expectedOutcome: 'AI visibility becomes a consistent, measurable marketing channel driving qualified traffic.',
  },
]

export function StrategyPlaybook({ brandId, brandName, metrics }: StrategyPlaybookProps) {
  const [expandedPhase, setExpandedPhase] = useState<string>('discovery')
  const [showCostBreakdown, setShowCostBreakdown] = useState(false)

  // Determine current phase based on metrics
  const getCurrentPhase = () => {
    if (!metrics) return 'discovery'
    if (metrics.daysActive < 28) return 'discovery'
    if (metrics.daysActive < 56) return 'foundation'
    if (metrics.daysActive < 120) return 'optimization'
    return 'scale'
  }

  const currentPhase = getCurrentPhase()

  // Calculate total estimated costs
  const costBreakdown = {
    phase1: { min: 15, max: 25, description: 'Discovery (4 weeks)' },
    phase2: { min: 20, max: 35, description: 'Foundation (4 weeks)' },
    phase3: { min: 25, max: 40, description: 'Optimization (8 weeks)' },
    phase4: { min: 10, max: 15, description: 'Maintenance (per month)' },
  }

  const totalFirstYear = 
    costBreakdown.phase1.max + 
    costBreakdown.phase2.max + 
    costBreakdown.phase3.max + 
    (costBreakdown.phase4.max * 8) // 8 months of maintenance

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Visibility Strategy</h2>
          <p className="text-muted-foreground mt-1">
            Your roadmap to becoming the cited authority in AI search
          </p>
        </div>
        <Badge 
          variant="outline" 
          className={`
            ${currentPhase === 'discovery' ? 'border-blue-500 text-blue-600' : ''}
            ${currentPhase === 'foundation' ? 'border-green-500 text-green-600' : ''}
            ${currentPhase === 'optimization' ? 'border-purple-500 text-purple-600' : ''}
            ${currentPhase === 'scale' ? 'border-amber-500 text-amber-600' : ''}
          `}
        >
          Currently: {PHASES.find(p => p.id === currentPhase)?.name}
        </Badge>
      </div>

      {/* Quick Stats */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{metrics.totalPrompts}</div>
              <div className="text-xs text-muted-foreground">Prompts Tracked</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{metrics.gapsIdentified}</div>
              <div className="text-xs text-muted-foreground">Gaps Identified</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{metrics.memosGenerated}</div>
              <div className="text-xs text-muted-foreground">Memos Created</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{metrics.visibilityScore}%</div>
              <div className="text-xs text-muted-foreground">Visibility Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{metrics.aiTrafficVisits || '—'}</div>
              <div className="text-xs text-muted-foreground">AI Traffic/Month</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* The Big Picture */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            The Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">
            Transform <strong>{brandName}</strong> into the{' '}
            <span className="text-primary font-semibold">cited authority</span> that AI assistants 
            reference when users ask questions about your space.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <Target className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <div className="font-medium">Visibility</div>
                <div className="text-sm text-muted-foreground">
                  Be mentioned in 60%+ of relevant AI responses
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BarChart3 className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <div className="font-medium">Traffic</div>
                <div className="text-sm text-muted-foreground">
                  Measurable AI-attributed visits to your site
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <div className="font-medium">Authority</div>
                <div className="text-sm text-muted-foreground">
                  Win comparisons against competitors
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          The Playbook
        </h3>

        {PHASES.map((phase, index) => {
          const isExpanded = expandedPhase === phase.id
          const isCurrent = currentPhase === phase.id
          const isComplete = PHASES.findIndex(p => p.id === currentPhase) > index

          return (
            <Card 
              key={phase.id}
              className={`
                transition-all cursor-pointer
                ${isCurrent ? 'ring-2 ring-primary' : ''}
                ${isComplete ? 'opacity-75' : ''}
              `}
              onClick={() => setExpandedPhase(isExpanded ? '' : phase.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`
                      p-2 rounded-lg
                      ${phase.color === 'blue' ? 'bg-blue-100 text-blue-600' : ''}
                      ${phase.color === 'green' ? 'bg-green-100 text-green-600' : ''}
                      ${phase.color === 'purple' ? 'bg-purple-100 text-purple-600' : ''}
                      ${phase.color === 'amber' ? 'bg-amber-100 text-amber-600' : ''}
                    `}>
                      {phase.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {phase.name}
                        {isComplete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {isCurrent && <Badge variant="default" className="text-xs">Current</Badge>}
                      </CardTitle>
                      <CardDescription>{phase.duration}</CardDescription>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  <p className="text-muted-foreground">{phase.description}</p>
                  
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Goal
                    </div>
                    <p className="text-sm mt-1">{phase.goal}</p>
                  </div>

                  {/* Activities */}
                  <div>
                    <div className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Activities
                    </div>
                    <div className="grid gap-2">
                      {phase.activities.map((activity, i) => (
                        <div 
                          key={i}
                          className="flex items-start justify-between p-2 rounded-lg bg-muted/30"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">{activity.name}</div>
                            <div className="text-xs text-muted-foreground">{activity.description}</div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-xs font-medium">{activity.frequency}</div>
                            <div className="text-xs text-muted-foreground">{activity.cost}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Milestones */}
                  <div>
                    <div className="font-medium text-sm mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Milestones
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {phase.milestones.map((milestone, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Circle className="h-3 w-3 text-muted-foreground" />
                          {milestone}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expected Outcome */}
                  <div className="border-t pt-3">
                    <div className="font-medium text-sm flex items-center gap-2 text-green-600">
                      <ArrowRight className="h-4 w-4" />
                      Expected Outcome
                    </div>
                    <p className="text-sm mt-1">{phase.expectedOutcome}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Cost Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Investment Summary
            </span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowCostBreakdown(!showCostBreakdown)}
            >
              {showCostBreakdown ? 'Hide Details' : 'Show Details'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-2xl font-bold">${costBreakdown.phase1.max}</div>
              <div className="text-xs text-muted-foreground">Phase 1 (4 weeks)</div>
            </div>
            <div>
              <div className="text-2xl font-bold">${costBreakdown.phase2.max}</div>
              <div className="text-xs text-muted-foreground">Phase 2 (4 weeks)</div>
            </div>
            <div>
              <div className="text-2xl font-bold">${costBreakdown.phase3.max}</div>
              <div className="text-xs text-muted-foreground">Phase 3 (8 weeks)</div>
            </div>
            <div>
              <div className="text-2xl font-bold">${costBreakdown.phase4.max}/mo</div>
              <div className="text-xs text-muted-foreground">Ongoing</div>
            </div>
          </div>

          {showCostBreakdown && (
            <div className="border-t pt-4 space-y-2">
              <div className="text-sm text-muted-foreground">
                <strong>Year 1 Total:</strong> ~${totalFirstYear} 
                <span className="ml-2">(~${Math.round(totalFirstYear / 12)}/month average)</span>
              </div>
              <div className="text-sm text-muted-foreground">
                These costs are for AI API usage only. They scale with:
              </div>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                <li>Number of prompts monitored (main driver)</li>
                <li>Frequency of scans (daily vs weekly)</li>
                <li>Number of models scanned (1 vs 3)</li>
                <li>Volume of content generated</li>
              </ul>
            </div>
          )}

          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <strong>Compare to:</strong> A single B2B content piece typically costs $500-2,000. 
                AI visibility strategy generates 30-50+ optimized pieces for under $100 in AI costs.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Do This
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Focus on gaps where competitors are cited</li>
                <li>• Generate content for high-intent buyer questions</li>
                <li>• Include specific data, examples, and comparisons</li>
                <li>• Keep content fresh with current year references</li>
                <li>• Monitor weekly, not daily (AI doesn&apos;t change that fast)</li>
                <li>• Use single-model scans for cost efficiency</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                Avoid This
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Scanning the same prompts daily (wasteful)</li>
                <li>• Generating generic, thin content</li>
                <li>• Ignoring competitor comparison prompts</li>
                <li>• Expecting instant results (AI indexes slowly)</li>
                <li>• Over-optimizing for one AI model</li>
                <li>• Neglecting to verify if content is being cited</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recommended Weekly Schedule
          </CardTitle>
          <CardDescription>
            Optimal cadence for steady-state monitoring (Phase 4)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="font-medium py-1 border-b">{day}</div>
            ))}
            {/* Monday */}
            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-blue-600">
              <div className="font-medium">Scan</div>
              <div className="text-[10px]">Core prompts</div>
            </div>
            {/* Tuesday */}
            <div className="p-2 bg-green-50 dark:bg-green-950 rounded text-green-600">
              <div className="font-medium">Create</div>
              <div className="text-[10px]">2-3 memos</div>
            </div>
            {/* Wednesday */}
            <div className="p-2 bg-muted/30 rounded text-muted-foreground">
              <div className="font-medium">—</div>
            </div>
            {/* Thursday */}
            <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded text-purple-600">
              <div className="font-medium">Discover</div>
              <div className="text-[10px]">New prompts</div>
            </div>
            {/* Friday */}
            <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded text-amber-600">
              <div className="font-medium">Review</div>
              <div className="text-[10px]">Competitors</div>
            </div>
            {/* Weekend */}
            <div className="p-2 bg-muted/30 rounded text-muted-foreground col-span-2">
              <div className="font-medium">—</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            This schedule runs automatically. Review results weekly to guide content priorities.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
