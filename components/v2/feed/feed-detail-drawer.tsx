'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ExternalLink, 
  Loader2, 
  FileText, 
  CheckCircle,
  X,
  Zap,
  Flame,
  Trophy,
  TrendingUp,
  TrendingDown,
  PartyPopper,
  AlertTriangle,
  Hash,
  Users,
  Target,
  GitBranch,
  Ban,
} from 'lucide-react'
import type { FeedEvent, FeedAction } from '@/lib/feed/types'
import { isBlockedCompetitorName } from '@/lib/config/competitor-blocklist'

interface FeedDetailDrawerProps {
  event: FeedEvent | null
  open: boolean
  onClose: () => void
  onAction: (eventId: string, action: FeedAction) => Promise<void>
}

export function FeedDetailDrawer({ event, open, onClose, onAction }: FeedDetailDrawerProps) {
  const [loading, setLoading] = useState<string | null>(null)

  if (!event) return null

  const handleAction = async (action: FeedAction) => {
    setLoading(action)
    try {
      await onAction(event.id, action)
      if (action === 'dismiss') {
        onClose()
      }
    } finally {
      setLoading(null)
    }
  }

  const { data } = event

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-left">{event.title}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
              </p>
            </div>
            <Badge variant={
              event.severity === 'action_required' ? 'destructive' :
              event.severity === 'success' ? 'default' :
              'secondary'
            }>
              {event.severity.replace('_', ' ')}
            </Badge>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Description */}
          {event.description && (
            <p className="text-sm text-muted-foreground">{event.description}</p>
          )}

          <Separator />

          {/* Prompt Journey Details */}
          {data.prompt && (
            <div className="space-y-4">
              <h4 className="font-medium">Prompt Journey</h4>
              
              {/* The Prompt */}
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-medium">"{data.prompt.query_text}"</p>
              </div>
              
              {/* Status Summary Row */}
              <div className="flex flex-wrap gap-2">
                <Badge 
                  className={
                    data.prompt.cited 
                      ? "bg-green-100 text-green-700"
                      : data.prompt.mentioned
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  }
                >
                  {data.prompt.cited ? (
                    <><CheckCircle className="h-3 w-3 mr-1" />Cited</>
                  ) : data.prompt.mentioned ? (
                    <>Mentioned</>
                  ) : (
                    <>Gap</>
                  )}
                </Badge>
                
                {data.prompt.streak >= 1 && (
                  <Badge className="bg-orange-100 text-orange-700">
                    <Flame className="h-3 w-3 mr-1" />
                    {data.prompt.streak}x streak
                  </Badge>
                )}
                
                {data.prompt.is_first_citation && (
                  <Badge className="bg-green-100 text-green-700">
                    <PartyPopper className="h-3 w-3 mr-1" />
                    First citation!
                  </Badge>
                )}
                
                {data.prompt.is_citation_lost && (
                  <Badge className="bg-red-100 text-red-700">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Lost citation
                  </Badge>
                )}
              </div>
              
              {/* All 10 Questions Answered */}
              <div className="space-y-3">
                {/* 1. Origin */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <GitBranch className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Origin</p>
                    <p className="font-medium capitalize">
                      {(data.prompt.source_type || 'auto').replace('_', ' ')}
                    </p>
                  </div>
                </div>
                
                {/* 2. Cited/Mentioned Status */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Citation Status</p>
                    <p className="font-medium">
                      {data.prompt.cited ? 'Cited' : data.prompt.mentioned ? 'Mentioned (not cited)' : 'Not mentioned (gap)'}
                      {data.prompt.position && ` • Position #${data.prompt.position}`}
                    </p>
                  </div>
                </div>
                
                {/* 3. Competitors on this prompt */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-muted-foreground">Competitors mentioned</p>
                    {data.prompt.competitors_mentioned?.filter(c => !isBlockedCompetitorName(c)).length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {data.prompt.competitors_mentioned.filter(c => !isBlockedCompetitorName(c)).map((c, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="font-medium">None</p>
                    )}
                  </div>
                </div>
                
                {/* 4. Scan count */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Hash className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Scan Number</p>
                    <p className="font-medium">#{data.prompt.scan_number}</p>
                  </div>
                </div>
                
                {/* 5. Streak */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Flame className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Citation Streak</p>
                    <p className="font-medium">
                      {data.prompt.streak}x current
                      {data.prompt.longest_streak > data.prompt.streak && ` • ${data.prompt.longest_streak}x best`}
                    </p>
                  </div>
                </div>
                
                {/* 6. New findings */}
                {data.prompt.new_competitors?.length > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-muted-foreground">New this scan</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {data.prompt.new_competitors.map((c, i) => (
                          <Badge key={i} className="bg-blue-100 text-blue-700 text-xs">
                            New: {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 7. First citation milestone */}
                {data.prompt.first_cited_at && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <PartyPopper className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">First Cited</p>
                      <p className="font-medium">
                        {formatDistanceToNow(new Date(data.prompt.first_cited_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* 8. Citation lost warning */}
                {data.prompt.citation_lost_at && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Citation Lost</p>
                      <p className="font-medium">
                        {formatDistanceToNow(new Date(data.prompt.citation_lost_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Winner */}
                {data.prompt.winner_name && !data.prompt.cited && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Trophy className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Currently Winning</p>
                      <p className="font-medium">{data.prompt.winner_name}</p>
                    </div>
                  </div>
                )}
                
                {/* 10. Persona */}
                {data.prompt.persona && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Target className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Target Persona</p>
                      <p className="font-medium">{data.prompt.persona}</p>
                    </div>
                  </div>
                )}
                
                {/* Model used */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Zap className="h-4 w-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">AI Model</p>
                    <p className="font-medium">{data.prompt.model}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Gap Details */}
          {data.gap && (
            <div className="space-y-4">
              <h4 className="font-medium">Query Details</h4>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">"{data.gap.query_text}"</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Visibility: {data.gap.visibility_rate}%</span>
                  {data.gap.winner_name && (
                    <span>Winner: {data.gap.winner_name}</span>
                  )}
                </div>
              </div>

              {data.gap.winner_citation_url && (
                <a 
                  href={data.gap.winner_citation_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#0EA5E9] hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View winning content
                </a>
              )}

              {data.gap.models_checked && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Models checked:</p>
                  <div className="flex flex-wrap gap-1">
                    {data.gap.models_checked.map(model => (
                      <Badge key={model} variant="outline" className="text-xs">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Verification Details */}
          {data.verification && (
            <div className="space-y-4">
              <h4 className="font-medium">Verification Details</h4>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-medium text-green-900">{data.verification.memo_title}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Time to citation</p>
                    <p className="font-medium">{data.verification.time_to_citation_hours}h</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Citation rate</p>
                    <p className="font-medium">{data.verification.citation_rate}%</p>
                  </div>
                </div>
              </div>

              {data.verification.citing_models && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Cited by:</p>
                  <div className="flex flex-wrap gap-1">
                    {data.verification.citing_models.map(model => (
                      <Badge key={model} className="bg-green-100 text-green-700">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Competitor Content Details */}
          {data.competitor_content && (
            <div className="space-y-4">
              <h4 className="font-medium">Competitor Content</h4>
              
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="font-medium text-orange-900 mb-1">
                  {data.competitor_content.competitor_name}
                </p>
                <p className="text-sm mb-2">{data.competitor_content.article_title}</p>
                <p className="text-sm text-muted-foreground">
                  Relevance: {Math.round(data.competitor_content.relevance_score * 100)}%
                </p>
              </div>

              <a 
                href={data.competitor_content.article_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[#0EA5E9] hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View article
              </a>

              {data.competitor_content.matched_prompts?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Matched prompts:</p>
                  <ul className="text-sm space-y-1">
                    {data.competitor_content.matched_prompts.slice(0, 5).map((prompt, i) => (
                      <li key={i} className="text-muted-foreground">• {prompt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Scan Summary */}
          {data.scan && (
            <div className="space-y-4">
              <h4 className="font-medium">Scan Summary</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-[#0EA5E9]">{data.scan.citation_rate}%</p>
                  <p className="text-xs text-muted-foreground">Citation Rate</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{data.scan.gaps_found}</p>
                  <p className="text-xs text-muted-foreground">Gaps Found</p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>{data.scan.prompts_scanned} prompts scanned</p>
                <p>{data.scan.mention_rate}% mention rate</p>
              </div>
            </div>
          )}

          {/* Opportunity Details */}
          {data.opportunity && (
            <div className="space-y-4">
              <h4 className="font-medium">Opportunity Details</h4>
              
              <div className="bg-emerald-50 rounded-lg p-4">
                <p className="font-medium text-emerald-900 mb-2">{data.opportunity.topic}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span>Volume: {data.opportunity.estimated_volume}</span>
                  <Badge variant={data.opportunity.competitor_coverage ? 'destructive' : 'secondary'}>
                    {data.opportunity.competitor_coverage ? 'Competitors covering' : 'Untapped'}
                  </Badge>
                </div>
              </div>

              {data.opportunity.related_queries?.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Related queries:</p>
                  <ul className="text-sm space-y-1">
                    {data.opportunity.related_queries.slice(0, 5).map((q, i) => (
                      <li key={i} className="text-muted-foreground">• {q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Related Items - always show if we have IDs */}
          {(event.related_memo_id || event.related_query_id || event.related_competitor_id) && (
            <div className="space-y-3">
              <h4 className="font-medium">Related Items</h4>
              <div className="space-y-2">
                {event.related_memo_id && (
                  <Link 
                    href={`/brands/${event.brand_id}/memos/${event.related_memo_id}`}
                    className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">View Generated Memo</span>
                    <ExternalLink className="h-4 w-4 text-purple-600 ml-auto" />
                  </Link>
                )}
                {event.related_query_id && (
                  <Link 
                    href={`/v2/brands/${event.brand_id}/prompts`}
                    className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">View Related Prompt</span>
                    <ExternalLink className="h-4 w-4 text-blue-600 ml-auto" />
                  </Link>
                )}
                {event.related_competitor_id && (
                  <Link 
                    href={`/v2/brands/${event.brand_id}/competitors`}
                    className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">View Related Competitor</span>
                    <ExternalLink className="h-4 w-4 text-orange-600 ml-auto" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Fallback for events without detailed data */}
          {!data.gap && !data.verification && !data.competitor_content && !data.scan && !data.opportunity && !data.system && (
            <div className="space-y-4">
              <h4 className="font-medium">Event Details</h4>
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground">Workflow</p>
                    <p className="font-medium capitalize">{event.workflow.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Event Type</p>
                    <p className="font-medium capitalize">{event.event_type.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Actions */}
          {event.action_available && !event.action_taken && (
            <div className="space-y-3">
              <h4 className="font-medium">Actions</h4>
              
              <div className="flex flex-wrap gap-2">
                {event.action_available.includes('generate_memo') && (
                  <Button
                    onClick={() => handleAction('generate_memo')}
                    disabled={loading !== null}
                    className="bg-[#0EA5E9] hover:bg-[#0284C7]"
                  >
                    {loading === 'generate_memo' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Generate Memo
                    {event.action_cost_credits > 0 && (
                      <span className="ml-2 flex items-center gap-0.5 text-xs bg-white/20 px-1.5 py-0.5 rounded">
                        <Zap className="h-3 w-3" />
                        {event.action_cost_credits}
                      </span>
                    )}
                  </Button>
                )}

                {event.action_available.includes('view_memo') && event.related_memo_id && (
                  <Button variant="outline" asChild>
                    <Link href={`/brands/${event.brand_id}/memos/${event.related_memo_id}`}>
                      <FileText className="h-4 w-4 mr-2" />
                      View Memo
                    </Link>
                  </Button>
                )}

                {event.action_available.includes('exclude_prompt') && (
                  <Button
                    variant="outline"
                    onClick={() => handleAction('exclude_prompt')}
                    disabled={loading !== null}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {loading === 'exclude_prompt' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Ban className="h-4 w-4 mr-2" />
                    )}
                    Exclude Prompt
                  </Button>
                )}

                {event.action_available.includes('reenable_prompt') && (
                  <Button
                    variant="outline"
                    onClick={() => handleAction('reenable_prompt')}
                    disabled={loading !== null}
                  >
                    {loading === 'reenable_prompt' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Re-enable Prompt
                  </Button>
                )}

                {event.action_available.includes('dismiss') && (
                  <Button
                    variant="ghost"
                    onClick={() => handleAction('dismiss')}
                    disabled={loading !== null}
                  >
                    {loading === 'dismiss' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Action Taken */}
          {event.action_taken && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Action taken</p>
                  <p className="text-sm text-muted-foreground">
                    {event.action_taken.replace('_', ' ')} • {formatDistanceToNow(new Date(event.action_taken_at!), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
