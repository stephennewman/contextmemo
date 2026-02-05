'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Network, 
  Search, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Minus,
  Zap,
  Target,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lightbulb,
  Users,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'

interface FanOutQuery {
  query: string
  angle: string
  coverage?: {
    brandCited: boolean
    brandMentioned: boolean
    competitorsCited: string[]
    topEntities: string[]
    response?: string
  }
  scanning?: boolean
}

interface FanOutResult {
  originalQuery: string
  fanOutQueries: FanOutQuery[]
  coverageSummary?: {
    totalQueries: number
    brandCoverage: number
    gaps: number
    competitorWins: number
  }
}

interface QueryFanOutProps {
  brandId: string
  brandName: string
  existingPrompts?: Array<{ id: string; query_text: string }>
}

export function QueryFanOut({ brandId, brandName, existingPrompts = [] }: QueryFanOutProps) {
  const [inputQuery, setInputQuery] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [fanOutResult, setFanOutResult] = useState<FanOutResult | null>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(true)
  const [generatingCluster, setGeneratingCluster] = useState(false)

  // Generate fan-out queries for a prompt
  const generateFanOut = async (query: string) => {
    setIsGenerating(true)
    setFanOutResult(null)
    
    try {
      const response = await fetch(`/api/brands/${brandId}/qfo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', query }),
      })
      
      if (!response.ok) throw new Error('Failed to generate fan-out')
      
      const data = await response.json()
      setFanOutResult(data)
    } catch (error) {
      console.error('Failed to generate fan-out:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Scan coverage for all fan-out queries
  const scanCoverage = async () => {
    if (!fanOutResult) return
    
    setIsScanning(true)
    
    try {
      const response = await fetch(`/api/brands/${brandId}/qfo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'scan', 
          queries: fanOutResult.fanOutQueries.map(q => q.query) 
        }),
      })
      
      if (!response.ok) throw new Error('Failed to scan coverage')
      
      const data = await response.json()
      setFanOutResult(prev => prev ? { ...prev, ...data } : data)
    } catch (error) {
      console.error('Failed to scan coverage:', error)
    } finally {
      setIsScanning(false)
    }
  }

  // Generate memo cluster for gaps
  const generateCluster = async () => {
    if (!fanOutResult) return
    
    setGeneratingCluster(true)
    
    try {
      const gaps = fanOutResult.fanOutQueries
        .filter(q => q.coverage && !q.coverage.brandCited)
        .map(q => q.query)
      
      const response = await fetch(`/api/brands/${brandId}/qfo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'generate-cluster', 
          queries: gaps,
          originalQuery: fanOutResult.originalQuery,
        }),
      })
      
      if (!response.ok) throw new Error('Failed to generate cluster')
      
      const data = await response.json()
      // Show success message or redirect
      alert(`Created ${data.memosGenerated} memos for the content cluster!`)
    } catch (error) {
      console.error('Failed to generate cluster:', error)
    } finally {
      setGeneratingCluster(false)
    }
  }

  // Calculate coverage stats
  const coverageStats = fanOutResult?.fanOutQueries.reduce(
    (acc, q) => {
      if (!q.coverage) return acc
      return {
        total: acc.total + 1,
        cited: acc.cited + (q.coverage.brandCited ? 1 : 0),
        mentioned: acc.mentioned + (q.coverage.brandMentioned ? 1 : 0),
        gaps: acc.gaps + (!q.coverage.brandCited && !q.coverage.brandMentioned ? 1 : 0),
        competitorWins: acc.competitorWins + (q.coverage.competitorsCited.length > 0 && !q.coverage.brandCited ? 1 : 0),
      }
    },
    { total: 0, cited: 0, mentioned: 0, gaps: 0, competitorWins: 0 }
  )

  return (
    <div className="space-y-6">
      {/* Header with explanation */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Network className="h-5 w-5 text-[#8B5CF6]" />
            Query Fan-Out Analysis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Discover what sub-queries LLMs actually search for
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setShowExplanation(!showExplanation)}
        >
          {showExplanation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showExplanation ? 'Hide' : 'Show'} Explanation
        </Button>
      </div>

      {/* Explanation Card */}
      {showExplanation && (
        <Card className="bg-gradient-to-r from-[#8B5CF6]/5 to-[#0EA5E9]/5 border-[#8B5CF6]/20">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#8B5CF6] font-semibold">
                  <Lightbulb className="h-4 w-4" />
                  What is Query Fan-Out?
                </div>
                <p className="text-sm text-muted-foreground">
                  When you ask an AI &quot;What&apos;s the best CRM?&quot;, it doesn&apos;t just search for that phrase. 
                  It internally expands to 5-10 sub-queries like &quot;CRM pricing comparison&quot;, 
                  &quot;CRM features for small business&quot;, etc.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#0EA5E9] font-semibold">
                  <Target className="h-4 w-4" />
                  Why It Matters
                </div>
                <p className="text-sm text-muted-foreground">
                  You might rank #1 for your main query in Google, but if you don&apos;t rank for 
                  the fan-out sub-queries, AI won&apos;t cite you. Each sub-query is a 
                  separate chance to be cited.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#10B981] font-semibold">
                  <FileText className="h-4 w-4" />
                  The Strategy
                </div>
                <p className="text-sm text-muted-foreground">
                  Create a <strong>content cluster</strong> — multiple focused articles, each targeting 
                  one fan-out query, all interlinked. More articles = more chances to be cited 
                  in one AI response.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Input Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Analyze a Prompt</CardTitle>
          <CardDescription>
            Enter a prompt to see its fan-out queries and your coverage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Textarea
              placeholder="e.g., What's the best temperature monitoring solution for food safety?"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="min-h-[80px] flex-1"
            />
          </div>
          
          {/* Quick select from existing prompts */}
          {existingPrompts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Or select from your prompts:</p>
              <div className="flex flex-wrap gap-2">
                {existingPrompts.slice(0, 8).map((prompt) => (
                  <Button
                    key={prompt.id}
                    variant={selectedPrompt === prompt.id ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      setSelectedPrompt(prompt.id)
                      setInputQuery(prompt.query_text)
                    }}
                  >
                    {prompt.query_text.length > 50 
                      ? prompt.query_text.slice(0, 50) + '...' 
                      : prompt.query_text}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => generateFanOut(inputQuery)}
              disabled={!inputQuery.trim() || isGenerating}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Fan-Out...
                </>
              ) : (
                <>
                  <Network className="h-4 w-4 mr-2" />
                  Generate Fan-Out
                </>
              )}
            </Button>
            
            {fanOutResult && !fanOutResult.fanOutQueries[0]?.coverage && (
              <Button
                onClick={scanCoverage}
                disabled={isScanning}
                variant="outline"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning Coverage...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Scan Coverage
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fan-Out Results */}
      {fanOutResult && (
        <>
          {/* Coverage Summary */}
          {coverageStats && coverageStats.total > 0 && (
            <div className="grid gap-4 md:grid-cols-5">
              <Card className="bg-slate-900 text-white">
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs font-bold tracking-widest text-slate-400 mb-1">FAN-OUT QUERIES</div>
                  <div className="text-3xl font-bold">{fanOutResult.fanOutQueries.length}</div>
                </CardContent>
              </Card>
              <Card style={{ borderLeft: '4px solid #10B981' }}>
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs font-bold tracking-widest text-slate-500 mb-1">CITED</div>
                  <div className="text-3xl font-bold text-[#10B981]">{coverageStats.cited}</div>
                  <div className="text-xs text-muted-foreground">{Math.round((coverageStats.cited / coverageStats.total) * 100)}% coverage</div>
                </CardContent>
              </Card>
              <Card style={{ borderLeft: '4px solid #F59E0B' }}>
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs font-bold tracking-widest text-slate-500 mb-1">MENTIONED</div>
                  <div className="text-3xl font-bold text-[#F59E0B]">{coverageStats.mentioned}</div>
                </CardContent>
              </Card>
              <Card style={{ borderLeft: '4px solid #EF4444' }}>
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs font-bold tracking-widest text-slate-500 mb-1">GAPS</div>
                  <div className="text-3xl font-bold text-[#EF4444]">{coverageStats.gaps}</div>
                </CardContent>
              </Card>
              <Card style={{ borderLeft: '4px solid #8B5CF6' }}>
                <CardContent className="pt-4 pb-4">
                  <div className="text-xs font-bold tracking-widest text-slate-500 mb-1">COMPETITOR WINS</div>
                  <div className="text-3xl font-bold text-[#8B5CF6]">{coverageStats.competitorWins}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Fan-Out Query List */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Fan-Out Queries</CardTitle>
                  <CardDescription>
                    Sub-queries the AI generates from: &quot;{fanOutResult.originalQuery}&quot;
                  </CardDescription>
                </div>
                {coverageStats && coverageStats.gaps > 0 && (
                  <Button
                    onClick={generateCluster}
                    disabled={generatingCluster}
                    className="bg-[#10B981] hover:bg-[#059669]"
                  >
                    {generatingCluster ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Generate Cluster ({coverageStats.gaps} memos)
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fanOutResult.fanOutQueries.map((query, index) => (
                  <div 
                    key={index}
                    className={`p-4 border rounded-lg ${
                      query.coverage?.brandCited 
                        ? 'border-[#10B981]/50 bg-[#10B981]/5' 
                        : query.coverage?.brandMentioned
                          ? 'border-[#F59E0B]/50 bg-[#F59E0B]/5'
                          : query.coverage
                            ? 'border-[#EF4444]/50 bg-[#EF4444]/5'
                            : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-400">#{index + 1}</span>
                          <Badge variant="outline" className="text-xs">
                            {query.angle}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{query.query}</p>
                        
                        {/* Coverage details */}
                        {query.coverage && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <div className="flex items-center gap-4 text-xs">
                              {query.coverage.brandCited ? (
                                <span className="flex items-center gap-1 text-[#10B981]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {brandName} cited
                                </span>
                              ) : query.coverage.brandMentioned ? (
                                <span className="flex items-center gap-1 text-[#F59E0B]">
                                  <Minus className="h-3 w-3" />
                                  {brandName} mentioned (not cited)
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[#EF4444]">
                                  <XCircle className="h-3 w-3" />
                                  {brandName} not found
                                </span>
                              )}
                            </div>
                            
                            {query.coverage.competitorsCited.length > 0 && (
                              <div className="flex items-center gap-2 text-xs">
                                <Users className="h-3 w-3 text-slate-400" />
                                <span className="text-slate-500">Competitors cited:</span>
                                <div className="flex flex-wrap gap-1">
                                  {query.coverage.competitorsCited.slice(0, 5).map((comp, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs h-5">
                                      {comp}
                                    </Badge>
                                  ))}
                                  {query.coverage.competitorsCited.length > 5 && (
                                    <Badge variant="secondary" className="text-xs h-5">
                                      +{query.coverage.competitorsCited.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Status indicator */}
                      <div className="flex-shrink-0">
                        {query.scanning ? (
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        ) : query.coverage ? (
                          query.coverage.brandCited ? (
                            <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                          ) : query.coverage.brandMentioned ? (
                            <Minus className="h-5 w-5 text-[#F59E0B]" />
                          ) : (
                            <XCircle className="h-5 w-5 text-[#EF4444]" />
                          )
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-dashed border-slate-300" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Strategy Recommendations */}
          {coverageStats && coverageStats.gaps > 0 && (
            <Card className="border-[#8B5CF6]/30 bg-[#8B5CF6]/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#8B5CF6]" />
                  Content Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-[#8B5CF6] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        You have {coverageStats.gaps} gaps in this fan-out cluster
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Creating content for these gaps will increase your chances of being cited 
                        when someone asks the original question. Each gap is a missed citation opportunity.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Network className="h-5 w-5 text-[#0EA5E9] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        Recommended: Create a linked content cluster
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Generate {coverageStats.gaps} focused articles (one per gap), then interlink them. 
                        This gives you {coverageStats.gaps} separate chances to be cited for the same user question.
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={generateCluster}
                    disabled={generatingCluster}
                    className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED]"
                    size="lg"
                  >
                    {generatingCluster ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Content Cluster...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Generate {coverageStats.gaps}-Article Content Cluster
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty state */}
      {!fanOutResult && !isGenerating && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Network className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-semibold mb-2">No Fan-Out Analysis Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Enter a prompt above to see how LLMs expand it into sub-queries, 
              and discover where you&apos;re missing citation opportunities.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
