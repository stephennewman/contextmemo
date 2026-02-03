'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Cpu, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Target,
  BarChart3,
} from 'lucide-react'

interface ModelPerformance {
  model: string
  displayName: string
  totalScans: number
  brandMentions: number
  brandCitations: number
  mentionRate: number
  citationRate: number
  avgPosition: number | null
  topQueryTypes: Array<{ type: string; successRate: number }>
  contentPreferences: Array<{ pattern: string; score: number }>
}

interface ModelRecommendation {
  model: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionItems: string[]
}

interface ModelInsightsPanelProps {
  models: ModelPerformance[]
  recommendations: ModelRecommendation[]
  overallCitationRate: number
  totalScans: number
}

function getModelColor(model: string): string {
  const colors: Record<string, string> = {
    'gpt-4o-mini': '#10B981',
    'claude-3-5-haiku': '#F97316',
    'grok-4-fast': '#8B5CF6',
    'perplexity-sonar': '#0EA5E9',
    'gemini-2-flash': '#3B82F6',
  }
  return colors[model] || '#6B7280'
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
    case 'medium':
      return 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20'
    case 'low':
      return 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/20'
    default:
      return 'bg-muted'
  }
}

export function ModelInsightsPanel({ 
  models, 
  recommendations, 
  overallCitationRate,
  totalScans,
}: ModelInsightsPanelProps) {
  if (models.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Per-Model Insights
          </CardTitle>
          <CardDescription>
            How each AI model responds to your content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Cpu className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No model insights yet.</p>
            <p className="text-sm mt-2">
              Run scans to see how different AI models cite your content.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort models by citation rate
  const sortedModels = [...models].sort((a, b) => b.citationRate - a.citationRate)
  const topModel = sortedModels[0]
  const worstModel = sortedModels[sortedModels.length - 1]

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #0EA5E9' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">OVERALL CITATION RATE</p>
                <p className="text-3xl font-bold text-[#0EA5E9]">{overallCitationRate}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-[#0EA5E9]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: `8px solid ${getModelColor(topModel?.model || '')}` }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">TOP MODEL</p>
                <p className="text-xl font-bold">{topModel?.displayName}</p>
                <p className="text-sm text-muted-foreground">{topModel?.citationRate}% citations</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-[#10B981]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: `8px solid ${getModelColor(worstModel?.model || '')}` }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">NEEDS WORK</p>
                <p className="text-xl font-bold">{worstModel?.displayName}</p>
                <p className="text-sm text-muted-foreground">{worstModel?.citationRate}% citations</p>
              </div>
              <Target className="h-8 w-8 text-[#F59E0B]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Model Performance Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Citation Rate by Model</CardTitle>
            <CardDescription>How often each AI model cites your content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedModels.map((model) => {
                const color = getModelColor(model.model)
                return (
                  <div key={model.model} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium">{model.displayName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">
                          {model.brandCitations}/{model.totalScans} scans
                        </span>
                        <span className="font-bold" style={{ color }}>
                          {model.citationRate}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${model.citationRate}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    {/* Content preferences */}
                    {model.contentPreferences.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {model.contentPreferences.slice(0, 3).map((pref) => (
                          <Badge 
                            key={pref.pattern} 
                            variant="outline" 
                            className="text-[9px] px-1.5 py-0"
                          >
                            {pref.pattern} ({pref.score}%)
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#F59E0B]" />
              Optimization Recommendations
            </CardTitle>
            <CardDescription>Model-specific improvements to make</CardDescription>
          </CardHeader>
          <CardContent>
            {recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.slice(0, 4).map((rec, i) => (
                  <div key={i} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`text-[10px] ${getPriorityColor(rec.priority)}`}>
                        {rec.priority}
                      </Badge>
                      <span className="font-medium text-sm">{rec.model}</span>
                    </div>
                    <p className="text-sm font-semibold mb-1">{rec.title}</p>
                    <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
                    <ul className="text-xs space-y-1">
                      {rec.actionItems.slice(0, 2).map((item, j) => (
                        <li key={j} className="flex items-start gap-1">
                          <span className="text-[#10B981]">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-[#10B981]" />
                <p className="text-sm">No urgent recommendations!</p>
                <p className="text-xs">Your content is performing well across models.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
