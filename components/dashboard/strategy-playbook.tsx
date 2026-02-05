'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
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
  Calculator,
  Gauge,
} from 'lucide-react'

// Cost constants (actual API costs in cents)
const COSTS = {
  // Per-prompt scan costs by model (in cents)
  scanPerPrompt: {
    'gpt-4o-mini': 2.6,      // $0.026
    'claude-haiku': 2.0,     // $0.020  
    'grok-fast': 1.4,        // $0.014
    'perplexity': 0.05,      // $0.0005
  },
  // Memo generation (GPT-4o, in cents)
  memoGeneration: 3,         // $0.03 per memo
  // Competitor content analysis (in cents)
  competitorAnalysis: 1,     // $0.01 per article classified
  // Competitor response generation (in cents)
  competitorResponse: 5,     // $0.05 per response article
  // Discovery/enrichment (Perplexity, in cents)
  discovery: 0.5,            // $0.005 per discovery call
}

// Margin multiplier (our markup)
const MARGIN_MULTIPLIER = 3  // 3x markup = 200% margin

// Scan frequency multipliers (scans per month)
const SCAN_FREQUENCY = {
  'weekly': 4,
  '2x-week': 8,
  '3x-week': 12,
  'daily': 30,
}

interface CostCalculation {
  rawCost: number          // Actual API cost
  price: number            // What we charge (with margin)
  breakdown: {
    scanning: number
    memos: number
    competitors: number
    discovery: number
  }
}

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
  
  // Cost calculator state
  const [calcPrompts, setCalcPrompts] = useState(50)
  const [calcModels, setCalcModels] = useState(1)
  const [calcFrequency, setCalcFrequency] = useState<keyof typeof SCAN_FREQUENCY>('weekly')
  const [calcMemos, setCalcMemos] = useState(10)
  const [calcCompetitors, setCalcCompetitors] = useState(10)

  // Calculate costs based on inputs
  const calculateMonthlyCost = (): CostCalculation => {
    // Scanning costs
    const scansPerMonth = SCAN_FREQUENCY[calcFrequency]
    const modelsUsed = ['gpt-4o-mini', 'claude-haiku', 'grok-fast', 'perplexity'].slice(0, calcModels) as (keyof typeof COSTS.scanPerPrompt)[]
    const scanCostPerPrompt = modelsUsed.reduce((sum, model) => sum + COSTS.scanPerPrompt[model], 0)
    const totalScanCost = (calcPrompts * scanCostPerPrompt * scansPerMonth) / 100 // Convert cents to dollars
    
    // Memo generation costs
    const memoCost = (calcMemos * COSTS.memoGeneration) / 100
    
    // Competitor monitoring costs (assume ~20 articles/month per competitor analyzed, 10% get responses)
    const articlesPerMonth = calcCompetitors * 20
    const classificationCost = (articlesPerMonth * COSTS.competitorAnalysis) / 100
    const responsesPerMonth = Math.ceil(articlesPerMonth * 0.1)
    const responseCost = (responsesPerMonth * COSTS.competitorResponse) / 100
    const competitorCost = classificationCost + responseCost
    
    // Discovery costs (weekly discovery = 4x/month, ~10 calls each)
    const discoveryCost = (4 * 10 * COSTS.discovery) / 100
    
    const rawCost = totalScanCost + memoCost + competitorCost + discoveryCost
    const price = rawCost * MARGIN_MULTIPLIER
    
    return {
      rawCost: Math.round(rawCost * 100) / 100,
      price: Math.round(price * 100) / 100,
      breakdown: {
        scanning: Math.round(totalScanCost * MARGIN_MULTIPLIER * 100) / 100,
        memos: Math.round(memoCost * MARGIN_MULTIPLIER * 100) / 100,
        competitors: Math.round(competitorCost * MARGIN_MULTIPLIER * 100) / 100,
        discovery: Math.round(discoveryCost * MARGIN_MULTIPLIER * 100) / 100,
      }
    }
  }
  
  const costs = calculateMonthlyCost()

  // Determine current phase based on metrics
  const getCurrentPhase = () => {
    if (!metrics) return 'discovery'
    if (metrics.daysActive < 28) return 'discovery'
    if (metrics.daysActive < 56) return 'foundation'
    if (metrics.daysActive < 120) return 'optimization'
    return 'scale'
  }

  const currentPhase = getCurrentPhase()
  
  // Get tier name based on usage
  const getTierName = () => {
    if (calcPrompts <= 25 && calcModels === 1 && calcMemos <= 5) return 'Starter'
    if (calcPrompts <= 50 && calcModels <= 2 && calcMemos <= 15) return 'Growth'
    if (calcPrompts <= 100 && calcModels <= 3 && calcMemos <= 30) return 'Pro'
    return 'Scale'
  }

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

      {/* Cost Calculator */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Cost Calculator
            </span>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {getTierName()} Tier
            </Badge>
          </CardTitle>
          <CardDescription>
            Adjust the sliders to see how costs scale with your usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sliders */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Prompts */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Prompts Tracked</Label>
                <span className="text-sm font-bold text-primary">{calcPrompts}</span>
              </div>
              <Slider
                value={[calcPrompts]}
                onValueChange={(v) => setCalcPrompts(v[0])}
                min={10}
                max={200}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10 (Starter)</span>
                <span>200 (Scale)</span>
              </div>
            </div>

            {/* Models */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">AI Models</Label>
                <span className="text-sm font-bold text-primary">{calcModels}</span>
              </div>
              <Slider
                value={[calcModels]}
                onValueChange={(v) => setCalcModels(v[0])}
                min={1}
                max={4}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 (GPT only)</span>
                <span>4 (All models)</span>
              </div>
            </div>

            {/* Scan Frequency */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Scan Frequency</Label>
                <span className="text-sm font-bold text-primary capitalize">{calcFrequency.replace('-', '/')}</span>
              </div>
              <div className="flex gap-2">
                {(['weekly', '2x-week', '3x-week', 'daily'] as const).map((freq) => (
                  <Button
                    key={freq}
                    variant={calcFrequency === freq ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCalcFrequency(freq)}
                    className="flex-1 text-xs"
                  >
                    {freq === 'weekly' ? 'Weekly' : freq === '2x-week' ? '2x/wk' : freq === '3x-week' ? '3x/wk' : 'Daily'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Memos per Month */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Memos / Month</Label>
                <span className="text-sm font-bold text-primary">{calcMemos}</span>
              </div>
              <Slider
                value={[calcMemos]}
                onValueChange={(v) => setCalcMemos(v[0])}
                min={0}
                max={50}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>50</span>
              </div>
            </div>

            {/* Competitors Monitored */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">Competitors Monitored</Label>
                <span className="text-sm font-bold text-primary">{calcCompetitors}</span>
              </div>
              <Slider
                value={[calcCompetitors]}
                onValueChange={(v) => setCalcCompetitors(v[0])}
                min={0}
                max={50}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 (None)</span>
                <span>50 (Comprehensive)</span>
              </div>
            </div>
          </div>

          {/* Cost Display */}
          <div className="border-t pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Monthly Price */}
              <div className="p-6 bg-[#0F172A] text-white rounded-lg">
                <div className="text-xs font-bold tracking-widest text-slate-400 mb-2">MONTHLY PRICE</div>
                <div className="text-4xl font-bold text-[#0EA5E9]">${costs.price.toFixed(0)}<span className="text-lg text-slate-400">/mo</span></div>
                <div className="text-xs text-slate-400 mt-2">
                  Includes {MARGIN_MULTIPLIER}x margin on ${costs.rawCost.toFixed(2)} API cost
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                <div className="text-xs font-bold tracking-widest text-muted-foreground mb-3">COST BREAKDOWN</div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm">Prompt Scanning</span>
                  <span className="font-medium">${costs.breakdown.scanning.toFixed(2)}</span>
                </div>
                <Progress value={(costs.breakdown.scanning / costs.price) * 100} className="h-1" />
                
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm">Content Generation</span>
                  <span className="font-medium">${costs.breakdown.memos.toFixed(2)}</span>
                </div>
                <Progress value={(costs.breakdown.memos / costs.price) * 100} className="h-1" />
                
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm">Competitor Intel</span>
                  <span className="font-medium">${costs.breakdown.competitors.toFixed(2)}</span>
                </div>
                <Progress value={(costs.breakdown.competitors / costs.price) * 100} className="h-1" />
                
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm">Discovery</span>
                  <span className="font-medium">${costs.breakdown.discovery.toFixed(2)}</span>
                </div>
                <Progress value={(costs.breakdown.discovery / costs.price) * 100} className="h-1" />
              </div>
            </div>
          </div>

          {/* Tier Suggestions */}
          <div className="border-t pt-4">
            <div className="text-xs font-bold tracking-widest text-muted-foreground mb-3">SUGGESTED TIERS</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => { setCalcPrompts(25); setCalcModels(1); setCalcFrequency('weekly'); setCalcMemos(5); setCalcCompetitors(5); }}
                className="p-3 border rounded-lg hover:border-primary transition-colors text-left"
              >
                <div className="font-bold text-sm">Starter</div>
                <div className="text-xs text-muted-foreground">25 prompts, 1 model</div>
                <div className="text-sm font-bold text-primary mt-1">~$15/mo</div>
              </button>
              <button
                onClick={() => { setCalcPrompts(50); setCalcModels(2); setCalcFrequency('2x-week'); setCalcMemos(15); setCalcCompetitors(10); }}
                className="p-3 border rounded-lg hover:border-primary transition-colors text-left"
              >
                <div className="font-bold text-sm">Growth</div>
                <div className="text-xs text-muted-foreground">50 prompts, 2 models</div>
                <div className="text-sm font-bold text-primary mt-1">~$49/mo</div>
              </button>
              <button
                onClick={() => { setCalcPrompts(100); setCalcModels(3); setCalcFrequency('3x-week'); setCalcMemos(25); setCalcCompetitors(20); }}
                className="p-3 border rounded-lg hover:border-primary transition-colors text-left"
              >
                <div className="font-bold text-sm">Pro</div>
                <div className="text-xs text-muted-foreground">100 prompts, 3 models</div>
                <div className="text-sm font-bold text-primary mt-1">~$99/mo</div>
              </button>
              <button
                onClick={() => { setCalcPrompts(200); setCalcModels(4); setCalcFrequency('daily'); setCalcMemos(50); setCalcCompetitors(50); }}
                className="p-3 border rounded-lg hover:border-primary transition-colors text-left"
              >
                <div className="font-bold text-sm">Scale</div>
                <div className="text-xs text-muted-foreground">200 prompts, 4 models</div>
                <div className="text-sm font-bold text-primary mt-1">~$299/mo</div>
              </button>
            </div>
          </div>

          {/* Value Comparison */}
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-start gap-2">
              <Gauge className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <strong>ROI Context:</strong> A single B2B content piece costs $500-2,000 to produce. 
                At ${costs.price.toFixed(0)}/mo, you get {calcMemos} AI-optimized pieces + monitoring across {calcPrompts} prompts.
                {costs.price > 0 && ` That's $${(costs.price / Math.max(calcMemos, 1)).toFixed(0)}/piece vs $1,000+ traditional.`}
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
