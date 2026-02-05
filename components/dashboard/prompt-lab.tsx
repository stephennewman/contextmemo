'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Play, 
  Square, 
  FlaskConical, 
  DollarSign, 
  Clock,
  Zap,
  BarChart3,
  Users,
  TrendingUp,
  Loader2,
  RefreshCw,
} from 'lucide-react'

interface LabRun {
  id: string
  status: 'pending' | 'running' | 'completed' | 'stopped' | 'cancelled' | 'error'
  duration_minutes: number
  budget_cents: number
  models_used: string[]
  stats: {
    promptsRun: number
    totalCostCents: number
    citationsByModel: Record<string, { total: number; cited: number }>
    topEntities: Record<string, number>
    startedAt: string
    lastUpdate: string
  }
  created_at: string
  completed_at: string | null
}

interface ModelComparison {
  model: string
  total: number
  cited: number
  mentioned: number
  citationRate: number
  mentionRate: number
}

interface EntityCount {
  entity: string
  count: number
  promptCount?: number
  prompts?: string[]
  gapPrompts?: string[]
}

interface Recommendation {
  type: 'comparison' | 'alternative' | 'how-to' | 'industry'
  title: string
  reason: string
  targetPrompts: string[]
  competingEntities: string[]
  priority: 'high' | 'medium' | 'low'
}

interface PromptStat {
  prompt: string
  total: number
  cited: number
  mentioned: number
  citationRate: number
}

interface LabSummary {
  totalScans: number
  totalCited: number
  totalMentioned: number
  citationRate: number
}

interface PromptLabProps {
  brandId: string
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'perplexity-sonar': 'Perplexity Sonar',
  'gpt-4o-mini': 'GPT-4o Mini',
  'claude-3-5-haiku': 'Claude 3.5 Haiku',
  'grok-4-fast': 'Grok 4 Fast',
}

const MODEL_COST_PER_PROMPT: Record<string, number> = {
  'perplexity-sonar': 1.0,
  'gpt-4o-mini': 2.5,
  'claude-3-5-haiku': 1.5,
  'grok-4-fast': 1.0,
}

export function PromptLab({ brandId }: PromptLabProps) {
  const [runs, setRuns] = useState<LabRun[]>([])
  const [modelComparison, setModelComparison] = useState<ModelComparison[]>([])
  const [topEntities, setTopEntities] = useState<EntityCount[]>([])
  const [topPrompts, setTopPrompts] = useState<PromptStat[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [summary, setSummary] = useState<LabSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  
  // Configuration
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [budgetDollars, setBudgetDollars] = useState(50)
  const [selectedModels, setSelectedModels] = useState<string[]>([
    'perplexity-sonar', 'gpt-4o-mini', 'claude-3-5-haiku', 'grok-4-fast'
  ])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/brands/${brandId}/lab`)
      const data = await res.json()
      setRuns(data.runs || [])
      setModelComparison(data.modelComparison || [])
      setTopEntities(data.topEntities || [])
      setTopPrompts(data.topPrompts || [])
      setRecommendations(data.recommendations || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error('Failed to fetch lab data:', error)
    } finally {
      setLoading(false)
    }
  }, [brandId])

  useEffect(() => {
    fetchData()
    
    // Poll for updates when there's a running lab
    const interval = setInterval(() => {
      const runningLab = runs.find(r => r.status === 'running')
      if (runningLab) {
        fetchData()
      }
    }, 5000) // Every 5 seconds
    
    return () => clearInterval(interval)
  }, [fetchData, runs])

  const runningLab = runs.find(r => r.status === 'running')

  const startLab = async () => {
    setStarting(true)
    try {
      const res = await fetch(`/api/brands/${brandId}/lab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          durationMinutes,
          budgetCents: budgetDollars * 100,
          modelsToUse: selectedModels,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to start lab')
        return
      }
      await fetchData()
    } catch (error) {
      console.error('Failed to start lab:', error)
      alert('Failed to start lab run')
    } finally {
      setStarting(false)
    }
  }

  const stopLab = async (labRunId: string) => {
    setStopping(true)
    try {
      await fetch(`/api/brands/${brandId}/lab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'stop',
          labRunId,
        }),
      })
      await fetchData()
    } catch (error) {
      console.error('Failed to stop lab:', error)
    } finally {
      setStopping(false)
    }
  }

  const estimatedCostPerPrompt = selectedModels.reduce(
    (sum, model) => sum + (MODEL_COST_PER_PROMPT[model] || 0), 0
  )
  const estimatedPromptsPerHour = Math.floor(3600 / 3) // ~3 seconds per prompt batch
  const estimatedCostPerHour = (estimatedPromptsPerHour * estimatedCostPerPrompt) / 100

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">Prompt Lab</h2>
            <p className="text-sm text-muted-foreground">
              High-volume citation research across multiple AI models
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Running Lab Status */}
      {runningLab && (
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <CardTitle className="text-lg">Lab Running</CardTitle>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => stopLab(runningLab.id)}
                disabled={stopping}
              >
                {stopping ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Square className="h-4 w-4 mr-1" />
                )}
                Stop
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{runningLab.stats.promptsRun}</div>
                <div className="text-xs text-muted-foreground">Prompts Run</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  ${(runningLab.stats.totalCostCents / 100).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  of ${(runningLab.budget_cents / 100).toFixed(0)} budget
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{runningLab.models_used.length}</div>
                <div className="text-xs text-muted-foreground">Models</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Object.values(runningLab.stats.citationsByModel).reduce((sum, m) => sum + m.cited, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Citations Found</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start New Lab */}
      {!runningLab && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Start New Lab Run</CardTitle>
            <CardDescription>
              Generate and run conversational prompts continuously to discover citation patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Duration */}
            <div>
              <label className="text-sm font-medium">Duration (minutes)</label>
              <div className="flex items-center gap-2 mt-1">
                {[15, 30, 60, 120].map(mins => (
                  <Button
                    key={mins}
                    variant={durationMinutes === mins ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDurationMinutes(mins)}
                  >
                    {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="text-sm font-medium">Budget</label>
              <div className="flex items-center gap-2 mt-1">
                {[10, 25, 50, 100].map(dollars => (
                  <Button
                    key={dollars}
                    variant={budgetDollars === dollars ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBudgetDollars(dollars)}
                  >
                    ${dollars}
                  </Button>
                ))}
              </div>
            </div>

            {/* Models */}
            <div>
              <label className="text-sm font-medium">Models</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(MODEL_DISPLAY_NAMES).map(([id, name]) => (
                  <Button
                    key={id}
                    variant={selectedModels.includes(id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (selectedModels.includes(id)) {
                        if (selectedModels.length > 1) {
                          setSelectedModels(selectedModels.filter(m => m !== id))
                        }
                      } else {
                        setSelectedModels([...selectedModels, id])
                      }
                    }}
                  >
                    {name}
                    <span className="ml-1 text-xs opacity-70">
                      ~{MODEL_COST_PER_PROMPT[id]}¢
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Cost estimate */}
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-sm text-muted-foreground">
                Estimated: ~{estimatedCostPerPrompt.toFixed(1)}¢ per prompt across {selectedModels.length} models
              </div>
              <div className="text-sm text-muted-foreground">
                Budget allows ~{Math.floor((budgetDollars * 100) / estimatedCostPerPrompt)} prompts
              </div>
            </div>

            <Button 
              className="w-full" 
              size="lg" 
              onClick={startLab}
              disabled={starting || selectedModels.length === 0}
            >
              {starting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Lab Run ({durationMinutes}min, ${budgetDollars} budget)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {summary && summary.totalScans > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Lab Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{summary.totalScans}</div>
                <div className="text-xs text-muted-foreground">Total Scans</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{summary.totalCited}</div>
                <div className="text-xs text-muted-foreground">Citations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">{summary.totalMentioned}</div>
                <div className="text-xs text-muted-foreground">Mentions</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{summary.citationRate}%</div>
                <div className="text-xs text-muted-foreground">Citation Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model Comparison */}
      {modelComparison.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Model Comparison</CardTitle>
            </div>
            <CardDescription>
              Citation rates across different AI models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {modelComparison
                .sort((a, b) => b.citationRate - a.citationRate)
                .map(model => (
                <div key={model.model} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium truncate">
                    {MODEL_DISPLAY_NAMES[model.model] || model.model}
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${model.citationRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-lg font-bold">{model.citationRate}%</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({model.cited}/{model.total})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Entities - Clickable to see prompts */}
      {topEntities.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Competing Entities</CardTitle>
            </div>
            <CardDescription>
              Click an entity to see which prompts mention them (and where you're losing)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {topEntities.slice(0, 20).map((entity, i) => (
                <Badge 
                  key={entity.entity} 
                  variant={selectedEntity === entity.entity ? 'default' : i < 3 ? 'outline' : 'secondary'}
                  className={`text-sm cursor-pointer transition-all ${selectedEntity === entity.entity ? 'ring-2 ring-primary' : 'hover:bg-primary/10'}`}
                  onClick={() => setSelectedEntity(selectedEntity === entity.entity ? null : entity.entity)}
                >
                  {entity.entity}
                  <span className="ml-1 opacity-70">({entity.count})</span>
                </Badge>
              ))}
            </div>
            
            {/* Selected entity details */}
            {selectedEntity && (
              <div className="border-t pt-4 mt-4">
                {(() => {
                  const entity = topEntities.find(e => e.entity === selectedEntity)
                  if (!entity) return null
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">{entity.entity}</h4>
                        <Badge variant="outline">{entity.promptCount || 0} unique prompts</Badge>
                      </div>
                      
                      {entity.gapPrompts && entity.gapPrompts.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-red-600">
                            Prompts where {entity.entity} wins but you don't:
                          </p>
                          <div className="space-y-2">
                            {entity.gapPrompts.map((prompt, idx) => (
                              <div key={idx} className="text-sm p-2 bg-red-50 rounded border border-red-100">
                                "{prompt}"
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {entity.prompts && entity.prompts.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            All prompts mentioning {entity.entity}:
                          </p>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {entity.prompts.map((prompt, idx) => (
                              <div key={idx} className="text-sm p-2 bg-muted/50 rounded">
                                "{prompt}"
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Recommended Memos</CardTitle>
            </div>
            <CardDescription>
              Based on gaps where competitors are winning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div key={idx} className={`p-4 rounded-lg border-2 ${
                  rec.priority === 'high' ? 'border-red-200 bg-red-50' : 
                  rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' : 
                  'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                          {rec.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {rec.type}
                        </Badge>
                      </div>
                      <h4 className="font-semibold">{rec.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{rec.reason}</p>
                      
                      {rec.competingEntities.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">Competing with:</span>
                          {rec.competingEntities.map(e => (
                            <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                          ))}
                        </div>
                      )}
                      
                      {rec.targetPrompts.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Target prompts:</p>
                          {rec.targetPrompts.slice(0, 2).map((p, i) => (
                            <p key={i} className="text-xs italic text-muted-foreground truncate">
                              "{p}"
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Prompts */}
      {topPrompts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Prompts That Get Citations</CardTitle>
            </div>
            <CardDescription>
              Conversational prompts sorted by citation rate across models
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPrompts.slice(0, 20).map((p, i) => (
                <div key={i} className="border-b pb-3 last:border-0">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm flex-1">{p.prompt}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.citationRate === 100 ? (
                        <Badge className="bg-green-500">100%</Badge>
                      ) : p.citationRate >= 75 ? (
                        <Badge className="bg-green-400">{p.citationRate}%</Badge>
                      ) : p.citationRate >= 50 ? (
                        <Badge className="bg-yellow-500">{p.citationRate}%</Badge>
                      ) : p.citationRate > 0 ? (
                        <Badge variant="secondary">{p.citationRate}%</Badge>
                      ) : (
                        <Badge variant="outline">0%</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {p.cited}/{p.total}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Runs */}
      {runs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Recent Lab Runs</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {runs.slice(0, 5).map(run => (
                <div 
                  key={run.id} 
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={
                        run.status === 'completed' ? 'default' :
                        run.status === 'running' ? 'outline' :
                        run.status === 'stopped' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {run.status}
                    </Badge>
                    <div className="text-sm">
                      {run.stats.promptsRun} prompts
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>${(run.stats.totalCostCents / 100).toFixed(2)}</span>
                    <span>
                      {new Date(run.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {runs.length === 0 && modelComparison.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No lab runs yet. Start one above to discover citation patterns.</p>
        </div>
      )}
    </div>
  )
}
