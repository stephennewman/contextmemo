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
    entities: number
    discovery: number
  }
  internalBreakdown: {
    scanning: number
    memos: number
    entities: number
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
  const [selectedTier, setSelectedTier] = useState<'starter' | 'growth' | 'pro' | 'scale' | 'custom'>('growth')
  const [calcPrompts, setCalcPrompts] = useState(50)
  const [calcModels, setCalcModels] = useState(2)
  const [calcFrequency, setCalcFrequency] = useState<keyof typeof SCAN_FREQUENCY>('2x-week')
  const [calcMemos, setCalcMemos] = useState(15)
  const [calcEntities, setCalcEntities] = useState(10)
  const [showInternalCosts, setShowInternalCosts] = useState(false)
  
  // Tier configurations
  const TIERS = {
    starter: { prompts: 25, models: 1, frequency: 'weekly' as const, memos: 5, entities: 5, price: 29 },
    growth: { prompts: 50, models: 2, frequency: '2x-week' as const, memos: 15, entities: 10, price: 79 },
    pro: { prompts: 100, models: 3, frequency: '3x-week' as const, memos: 30, entities: 20, price: 149 },
    scale: { prompts: 200, models: 4, frequency: 'daily' as const, memos: 50, entities: 50, price: 349 },
  }
  
  // Apply tier settings
  const applyTier = (tier: keyof typeof TIERS) => {
    const config = TIERS[tier]
    setCalcPrompts(config.prompts)
    setCalcModels(config.models)
    setCalcFrequency(config.frequency)
    setCalcMemos(config.memos)
    setCalcEntities(config.entities)
    setSelectedTier(tier)
  }

  // Calculate costs based on inputs
  const calculateMonthlyCost = (): CostCalculation => {
    // Scanning costs
    const scansPerMonth = SCAN_FREQUENCY[calcFrequency]
    const modelsUsed = ['gpt-4o-mini', 'claude-haiku', 'grok-fast', 'perplexity'].slice(0, calcModels) as (keyof typeof COSTS.scanPerPrompt)[]
    const scanCostPerPrompt = modelsUsed.reduce((sum, model) => sum + COSTS.scanPerPrompt[model], 0)
    const totalScanCost = (calcPrompts * scanCostPerPrompt * scansPerMonth) / 100 // Convert cents to dollars
    
    // Memo generation costs
    const memoCost = (calcMemos * COSTS.memoGeneration) / 100
    
    // Entity monitoring costs (assume ~20 articles/month per entity analyzed, 10% get responses)
    const articlesPerMonth = calcEntities * 20
    const classificationCost = (articlesPerMonth * COSTS.competitorAnalysis) / 100
    const responsesPerMonth = Math.ceil(articlesPerMonth * 0.1)
    const responseCost = (responsesPerMonth * COSTS.competitorResponse) / 100
    const entityCost = classificationCost + responseCost
    
    // Discovery costs (weekly discovery = 4x/month, ~10 calls each)
    const discoveryCost = (4 * 10 * COSTS.discovery) / 100
    
    const rawCost = totalScanCost + memoCost + entityCost + discoveryCost
    const price = rawCost * MARGIN_MULTIPLIER
    
    return {
      rawCost: Math.round(rawCost * 100) / 100,
      price: Math.round(price * 100) / 100,
      breakdown: {
        scanning: Math.round(totalScanCost * MARGIN_MULTIPLIER * 100) / 100,
        memos: Math.round(memoCost * MARGIN_MULTIPLIER * 100) / 100,
        entities: Math.round(entityCost * MARGIN_MULTIPLIER * 100) / 100,
        discovery: Math.round(discoveryCost * MARGIN_MULTIPLIER * 100) / 100,
      },
      // Internal costs (raw, without margin)
      internalBreakdown: {
        scanning: Math.round(totalScanCost * 100) / 100,
        memos: Math.round(memoCost * 100) / 100,
        entities: Math.round(entityCost * 100) / 100,
        discovery: Math.round(discoveryCost * 100) / 100,
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

      {/* Pricing Tiers Grid */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing Plans
          </CardTitle>
          <CardDescription>
            Choose a plan or customize your own. All plans include AI visibility monitoring, content generation, and competitor intelligence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 5-Tier Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Starter */}
            <button
              onClick={() => applyTier('starter')}
              className={`p-4 border-2 rounded-xl transition-all text-left relative ${
                selectedTier === 'starter' 
                  ? 'border-[#0EA5E9] bg-[#0EA5E9]/5 ring-2 ring-[#0EA5E9]/20' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {selectedTier === 'starter' && (
                <div className="absolute -top-2 -right-2 bg-[#0EA5E9] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  SELECTED
                </div>
              )}
              <div className="text-lg font-bold">Starter</div>
              <div className="text-3xl font-bold text-[#0EA5E9] mt-2">$29<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  25 prompts
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  1 AI model
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Weekly scans
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  5 memos/mo
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  5 entities
                </div>
              </div>
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Best for: Testing AI visibility
              </div>
            </button>

            {/* Growth */}
            <button
              onClick={() => applyTier('growth')}
              className={`p-4 border-2 rounded-xl transition-all text-left relative ${
                selectedTier === 'growth' 
                  ? 'border-[#0EA5E9] bg-[#0EA5E9]/5 ring-2 ring-[#0EA5E9]/20' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {selectedTier === 'growth' && (
                <div className="absolute -top-2 -right-2 bg-[#0EA5E9] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  SELECTED
                </div>
              )}
              <Badge className="absolute -top-2 left-3 bg-green-500 text-[10px]">POPULAR</Badge>
              <div className="text-lg font-bold mt-2">Growth</div>
              <div className="text-3xl font-bold text-[#0EA5E9] mt-2">$79<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  50 prompts
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  2 AI models
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  2x/week scans
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  15 memos/mo
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  10 entities
                </div>
              </div>
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Best for: Growing brands
              </div>
            </button>

            {/* Pro */}
            <button
              onClick={() => applyTier('pro')}
              className={`p-4 border-2 rounded-xl transition-all text-left relative ${
                selectedTier === 'pro' 
                  ? 'border-[#0EA5E9] bg-[#0EA5E9]/5 ring-2 ring-[#0EA5E9]/20' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {selectedTier === 'pro' && (
                <div className="absolute -top-2 -right-2 bg-[#0EA5E9] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  SELECTED
                </div>
              )}
              <div className="text-lg font-bold">Pro</div>
              <div className="text-3xl font-bold text-[#0EA5E9] mt-2">$149<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  100 prompts
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  3 AI models
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  3x/week scans
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  30 memos/mo
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  20 entities
                </div>
              </div>
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Best for: Market leaders
              </div>
            </button>

            {/* Scale */}
            <button
              onClick={() => applyTier('scale')}
              className={`p-4 border-2 rounded-xl transition-all text-left relative ${
                selectedTier === 'scale' 
                  ? 'border-[#0EA5E9] bg-[#0EA5E9]/5 ring-2 ring-[#0EA5E9]/20' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {selectedTier === 'scale' && (
                <div className="absolute -top-2 -right-2 bg-[#0EA5E9] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  SELECTED
                </div>
              )}
              <div className="text-lg font-bold">Scale</div>
              <div className="text-3xl font-bold text-[#0EA5E9] mt-2">$349<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  200 prompts
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  4 AI models
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Daily scans
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  50 memos/mo
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  50 entities
                </div>
              </div>
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Best for: Enterprises
              </div>
            </button>

            {/* Custom */}
            <button
              onClick={() => setSelectedTier('custom')}
              className={`p-4 border-2 rounded-xl transition-all text-left relative ${
                selectedTier === 'custom' 
                  ? 'border-[#8B5CF6] bg-[#8B5CF6]/5 ring-2 ring-[#8B5CF6]/20' 
                  : 'border-dashed border-gray-300 hover:border-gray-400'
              }`}
            >
              {selectedTier === 'custom' && (
                <div className="absolute -top-2 -right-2 bg-[#8B5CF6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  SELECTED
                </div>
              )}
              <div className="text-lg font-bold">Custom</div>
              <div className="text-3xl font-bold text-[#8B5CF6] mt-2">${costs.price.toFixed(0)}<span className="text-sm text-muted-foreground font-normal">/mo</span></div>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-[#8B5CF6]" />
                  {calcPrompts} prompts
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-[#8B5CF6]" />
                  {calcModels} AI model{calcModels > 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-[#8B5CF6]" />
                  {calcFrequency.replace('-', '/')} scans
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-[#8B5CF6]" />
                  {calcMemos} memos/mo
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-[#8B5CF6]" />
                  {calcEntities} entities
                </div>
              </div>
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Build your own plan
              </div>
            </button>
          </div>

          {/* Custom Plan Sliders - Only show when Custom is selected */}
          {selectedTier === 'custom' && (
            <div className="border-2 border-[#8B5CF6]/30 rounded-xl p-6 bg-[#8B5CF6]/5">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-[#8B5CF6]" />
                <span className="font-bold">Customize Your Plan</span>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Prompts */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label className="text-sm font-medium">Prompts Tracked</Label>
                    <span className="text-sm font-bold text-[#8B5CF6]">{calcPrompts}</span>
                  </div>
                  <Slider
                    value={[calcPrompts]}
                    onValueChange={(v) => setCalcPrompts(v[0])}
                    min={10}
                    max={300}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10</span>
                    <span>300</span>
                  </div>
                </div>

                {/* Models */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label className="text-sm font-medium">AI Models</Label>
                    <span className="text-sm font-bold text-[#8B5CF6]">{calcModels}</span>
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
                    <span>1 (GPT)</span>
                    <span>4 (All)</span>
                  </div>
                </div>

                {/* Scan Frequency */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label className="text-sm font-medium">Scan Frequency</Label>
                  </div>
                  <div className="flex gap-2">
                    {(['weekly', '2x-week', '3x-week', 'daily'] as const).map((freq) => (
                      <Button
                        key={freq}
                        variant={calcFrequency === freq ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCalcFrequency(freq)}
                        className={`flex-1 text-xs ${calcFrequency === freq ? 'bg-[#8B5CF6] hover:bg-[#8B5CF6]/90' : ''}`}
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
                    <span className="text-sm font-bold text-[#8B5CF6]">{calcMemos}</span>
                  </div>
                  <Slider
                    value={[calcMemos]}
                    onValueChange={(v) => setCalcMemos(v[0])}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Entities Monitored */}
                <div className="space-y-3 md:col-span-2">
                  <div className="flex justify-between">
                    <Label className="text-sm font-medium">Entities Monitored</Label>
                    <span className="text-sm font-bold text-[#8B5CF6]">{calcEntities}</span>
                  </div>
                  <Slider
                    value={[calcEntities]}
                    onValueChange={(v) => setCalcEntities(v[0])}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cost Breakdown */}
          <div className="border-t pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Monthly Price Summary */}
              <div className="p-6 bg-[#0F172A] text-white rounded-lg">
                <div className="text-xs font-bold tracking-widest text-slate-400 mb-2">
                  {selectedTier === 'custom' ? 'CUSTOM PLAN' : `${selectedTier.toUpperCase()} PLAN`}
                </div>
                <div className="text-4xl font-bold text-[#0EA5E9]">
                  ${selectedTier === 'custom' ? costs.price.toFixed(0) : TIERS[selectedTier as keyof typeof TIERS].price}
                  <span className="text-lg text-slate-400">/mo</span>
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  {selectedTier === 'custom' 
                    ? `Based on ${calcPrompts} prompts × ${calcModels} models × ${SCAN_FREQUENCY[calcFrequency]} scans/mo`
                    : `Includes ${TIERS[selectedTier as keyof typeof TIERS].prompts} prompts, ${TIERS[selectedTier as keyof typeof TIERS].models} model${TIERS[selectedTier as keyof typeof TIERS].models > 1 ? 's' : ''}`
                  }
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <button 
                    onClick={() => setShowInternalCosts(!showInternalCosts)}
                    className="text-xs text-slate-400 hover:text-slate-300 underline"
                  >
                    {showInternalCosts ? 'Hide' : 'Show'} internal costs
                  </button>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold tracking-widest text-muted-foreground">
                    {showInternalCosts ? 'INTERNAL COST (API)' : 'PRICE BREAKDOWN'}
                  </div>
                  {showInternalCosts && (
                    <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                      Internal Only
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm">Prompt Scanning</span>
                  <span className="font-medium">
                    ${showInternalCosts ? costs.internalBreakdown.scanning.toFixed(2) : costs.breakdown.scanning.toFixed(2)}
                  </span>
                </div>
                <Progress value={(costs.breakdown.scanning / Math.max(costs.price, 1)) * 100} className="h-1" />
                
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm">Content Generation</span>
                  <span className="font-medium">
                    ${showInternalCosts ? costs.internalBreakdown.memos.toFixed(2) : costs.breakdown.memos.toFixed(2)}
                  </span>
                </div>
                <Progress value={(costs.breakdown.memos / Math.max(costs.price, 1)) * 100} className="h-1" />
                
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm">Entity Intel</span>
                  <span className="font-medium">
                    ${showInternalCosts ? costs.internalBreakdown.entities.toFixed(2) : costs.breakdown.entities.toFixed(2)}
                  </span>
                </div>
                <Progress value={(costs.breakdown.entities / Math.max(costs.price, 1)) * 100} className="h-1" />
                
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm">Discovery</span>
                  <span className="font-medium">
                    ${showInternalCosts ? costs.internalBreakdown.discovery.toFixed(2) : costs.breakdown.discovery.toFixed(2)}
                  </span>
                </div>
                <Progress value={(costs.breakdown.discovery / Math.max(costs.price, 1)) * 100} className="h-1" />
                
                {/* Total row */}
                <div className="flex justify-between items-center py-2 border-t mt-2 font-bold">
                  <span className="text-sm">{showInternalCosts ? 'Total API Cost' : 'Total Price'}</span>
                  <span className={showInternalCosts ? 'text-amber-600' : 'text-primary'}>
                    ${showInternalCosts ? costs.rawCost.toFixed(2) : costs.price.toFixed(2)}/mo
                  </span>
                </div>
                {showInternalCosts && (
                  <div className="text-xs text-muted-foreground">
                    Margin: ${(costs.price - costs.rawCost).toFixed(2)} ({MARGIN_MULTIPLIER}x markup = {Math.round((MARGIN_MULTIPLIER - 1) * 100)}% margin)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Value Comparison */}
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-start gap-2">
              <Gauge className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <strong>ROI Context:</strong> A single B2B content piece costs $500-2,000 to produce. 
                At ${selectedTier === 'custom' ? costs.price.toFixed(0) : TIERS[selectedTier as keyof typeof TIERS].price}/mo, you get {calcMemos} AI-optimized pieces + monitoring across {calcPrompts} prompts.
                {calcMemos > 0 && ` That's $${((selectedTier === 'custom' ? costs.price : TIERS[selectedTier as keyof typeof TIERS].price) / calcMemos).toFixed(0)}/piece vs $1,000+ traditional.`}
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
