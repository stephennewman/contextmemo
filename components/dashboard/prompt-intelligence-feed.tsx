'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Lightbulb, 
  TrendingUp, 
  Users, 
  Target,
  ChevronRight,
  Zap,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react'

interface PromptIntelligenceItem {
  id: string
  category: 'trending' | 'competitor_win' | 'emerging' | 'declining'
  prompt_text: string
  insight_title: string
  insight_description: string
  competitors_winning: string[]
  opportunity_score: number
  action_suggestion: string
  status: 'new' | 'reviewed' | 'actioned' | 'dismissed'
  created_at: string
}

interface PromptIntelligenceFeedProps {
  items: PromptIntelligenceItem[]
  brandName: string
  onAction?: (itemId: string, action: 'review' | 'action' | 'dismiss') => void
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'trending':
      return <TrendingUp className="h-4 w-4 text-[#10B981]" />
    case 'competitor_win':
      return <Users className="h-4 w-4 text-[#EF4444]" />
    case 'emerging':
      return <Zap className="h-4 w-4 text-[#F59E0B]" />
    case 'declining':
      return <AlertTriangle className="h-4 w-4 text-[#6B7280]" />
    default:
      return <Lightbulb className="h-4 w-4 text-[#8B5CF6]" />
  }
}

function getCategoryLabel(category: string) {
  switch (category) {
    case 'trending':
      return 'Trending'
    case 'competitor_win':
      return 'Competitor Win'
    case 'emerging':
      return 'Emerging'
    case 'declining':
      return 'Declining'
    default:
      return category
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'trending':
      return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
    case 'competitor_win':
      return 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20'
    case 'emerging':
      return 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20'
    case 'declining':
      return 'bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/20'
    default:
      return 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20'
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-[#10B981]'
  if (score >= 60) return 'text-[#F59E0B]'
  if (score >= 40) return 'text-[#0EA5E9]'
  return 'text-[#6B7280]'
}

export function PromptIntelligenceFeed({ items, brandName, onAction }: PromptIntelligenceFeedProps) {
  const [filter, setFilter] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredItems = filter 
    ? items.filter(item => item.category === filter)
    : items

  const newItems = items.filter(i => i.status === 'new').length

  // Group by category for summary
  const categoryCounts = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Prompt Intelligence
          </CardTitle>
          <CardDescription>
            Trending prompts and competitor opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No intelligence data yet.</p>
            <p className="text-sm mt-2">
              Run scans to generate prompt intelligence and identify opportunities.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card 
          className={`cursor-pointer hover:bg-muted/50 transition-colors ${filter === null ? 'ring-2 ring-[#0EA5E9]' : ''}`}
          onClick={() => setFilter(null)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">ALL INSIGHTS</p>
                <p className="text-3xl font-bold">{items.length}</p>
              </div>
              <Target className="h-8 w-8 text-[#0EA5E9]" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:bg-muted/50 transition-colors ${filter === 'competitor_win' ? 'ring-2 ring-[#EF4444]' : ''}`}
          onClick={() => setFilter(filter === 'competitor_win' ? null : 'competitor_win')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">COMPETITOR WINS</p>
                <p className="text-3xl font-bold text-[#EF4444]">{categoryCounts['competitor_win'] || 0}</p>
              </div>
              <Users className="h-8 w-8 text-[#EF4444]" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:bg-muted/50 transition-colors ${filter === 'emerging' ? 'ring-2 ring-[#F59E0B]' : ''}`}
          onClick={() => setFilter(filter === 'emerging' ? null : 'emerging')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">EMERGING</p>
                <p className="text-3xl font-bold text-[#F59E0B]">{categoryCounts['emerging'] || 0}</p>
              </div>
              <Zap className="h-8 w-8 text-[#F59E0B]" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer hover:bg-muted/50 transition-colors ${filter === 'trending' ? 'ring-2 ring-[#10B981]' : ''}`}
          onClick={() => setFilter(filter === 'trending' ? null : 'trending')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">TRENDING</p>
                <p className="text-3xl font-bold text-[#10B981]">{categoryCounts['trending'] || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-[#10B981]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Intelligence Feed */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Intelligence Feed
              </CardTitle>
              <CardDescription>
                Actionable insights from your scan data
              </CardDescription>
            </div>
            {newItems > 0 && (
              <Badge variant="secondary" className="bg-[#0EA5E9] text-white">
                {newItems} new
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div 
                key={item.id}
                className={`p-4 border-2 rounded-lg transition-all ${
                  item.status === 'new' ? 'border-[#0F172A] bg-[#FAFAFA]' : 'border-zinc-200'
                } ${expandedId === item.id ? 'ring-2 ring-[#0EA5E9]' : ''}`}
              >
                <div 
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{item.insight_title}</p>
                        {item.status === 'new' && (
                          <Badge className="bg-[#0EA5E9] text-white text-[10px]">NEW</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.insight_description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={`text-[10px] ${getCategoryColor(item.category)}`}>
                          {getCategoryLabel(item.category)}
                        </Badge>
                        {item.competitors_winning.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            vs {item.competitors_winning.slice(0, 2).join(', ')}
                            {item.competitors_winning.length > 2 && ` +${item.competitors_winning.length - 2}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getScoreColor(item.opportunity_score)}`}>
                        {item.opportunity_score}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">score</p>
                    </div>
                    <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${
                      expandedId === item.id ? 'rotate-90' : ''
                    }`} />
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === item.id && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {item.prompt_text && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">TARGET PROMPT</p>
                        <p className="text-sm bg-muted p-2 rounded italic">"{item.prompt_text}"</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">RECOMMENDED ACTION</p>
                      <p className="text-sm">{item.action_suggestion}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation()
                          onAction?.(item.id, 'action')
                        }}
                      >
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                        Create Content
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAction?.(item.id, 'dismiss')
                        }}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
