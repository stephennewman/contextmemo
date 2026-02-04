'use client'

import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'
import { 
  Search, 
  Network, 
  Swords, 
  CheckCircle, 
  Sparkles,
  Bell,
  Loader2,
  ExternalLink,
  Flame,
  TrendingUp,
  TrendingDown,
  Ban,
  Trophy,
  AlertTriangle,
  PartyPopper,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CostBadge } from '../actions/cost-badge'
import type { FeedEvent, FeedWorkflow, FeedSeverity, FeedAction, ACTION_CREDITS } from '@/lib/feed/types'

const workflowIcons: Record<FeedWorkflow, React.ComponentType<{ className?: string }>> = {
  core_discovery: Search,
  network_expansion: Network,
  competitive_response: Swords,
  verification: CheckCircle,
  greenspace: Sparkles,
  system: Bell,
}

const workflowColors: Record<FeedWorkflow, string> = {
  core_discovery: 'bg-blue-500',
  network_expansion: 'bg-purple-500',
  competitive_response: 'bg-orange-500',
  verification: 'bg-green-500',
  greenspace: 'bg-emerald-500',
  system: 'bg-slate-500',
}

const severityStyles: Record<FeedSeverity, { border: string; bg: string; icon: string }> = {
  action_required: { border: 'border-l-red-500', bg: 'bg-red-50', icon: 'text-red-500' },
  warning: { border: 'border-l-amber-500', bg: 'bg-amber-50', icon: 'text-amber-500' },
  success: { border: 'border-l-green-500', bg: 'bg-green-50', icon: 'text-green-500' },
  info: { border: 'border-l-slate-300', bg: 'bg-white', icon: 'text-slate-400' },
}

const actionLabels: Record<FeedAction, string> = {
  generate_memo: 'Generate Memo',
  dismiss: 'Dismiss',
  expand_network: 'Analyze',
  view_details: 'View Details',
  view_scan: 'View Scan',
  view_memo: 'View Memo',
  view_competitor: 'View Competitor',
  add_to_prompts: 'Add to Prompts',
  upgrade_plan: 'Upgrade Plan',
  mark_reviewed: 'Mark Reviewed',
  retry_verification: 'Retry',
  push_to_hubspot: 'Push to HubSpot',
  exclude_prompt: 'Exclude',
  reenable_prompt: 'Re-enable',
}

interface FeedItemProps {
  event: FeedEvent
  onMarkRead: () => void
  onDismiss: () => void
  onAction: (action: FeedAction) => Promise<void>
  onViewDetails: () => void
}

export function FeedItem({ event, onMarkRead, onDismiss, onAction, onViewDetails }: FeedItemProps) {
  const [loading, setLoading] = useState<FeedAction | null>(null)
  
  const Icon = workflowIcons[event.workflow]
  const styles = severityStyles[event.severity]
  const createdDate = new Date(event.created_at)
  const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true })
  const fullTimestamp = format(createdDate, 'MMM d, h:mm a')
  
  // Determine origin label
  const getOriginLabel = () => {
    // For prompt events, use source_type
    if (event.data?.prompt?.source_type) {
      const sourceLabels: Record<string, string> = {
        original: 'Original',
        expanded: 'Expanded',
        competitor_inspired: 'Competitor-inspired',
        greenspace: 'Greenspace',
        manual: 'Manual',
        auto: 'Auto-generated',
      }
      return sourceLabels[event.data.prompt.source_type] || null
    }
    if (event.data?.competitor_content) return 'Competitor-inspired'
    if (event.data?.gap) return 'Gap-fill'
    if (event.data?.opportunity) return 'Greenspace'
    if (event.data?.verification) return 'Verification'
    return null
  }
  const originLabel = getOriginLabel()
  
  // Check if this is a prompt event
  const isPromptEvent = !!event.data?.prompt
  const promptData = event.data?.prompt
  
  const handleAction = async (action: FeedAction) => {
    if (action === 'dismiss') {
      onDismiss()
      return
    }
    
    if (action === 'view_details') {
      onViewDetails()
      return
    }
    
    setLoading(action)
    try {
      await onAction(action)
    } finally {
      setLoading(null)
    }
  }
  
  // Get primary and secondary actions
  const actions = event.action_available || []
  const primaryAction = actions.find(a => a !== 'dismiss' && a !== 'view_details')
  const secondaryActions = actions.filter(a => a !== primaryAction && a !== 'view_details')

  return (
    <div 
      className={cn(
        'border-l-4 rounded-r-lg shadow-sm transition-all',
        styles.border,
        event.read ? 'bg-white' : styles.bg,
        !event.read && 'ring-1 ring-slate-200'
      )}
    >
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Workflow icon */}
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
            workflowColors[event.workflow]
          )}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  'text-sm font-medium truncate',
                  !event.read && 'font-semibold'
                )}>
                  {event.title}
                </h4>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
              
              {/* Time and unread indicator */}
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <div className="flex items-center gap-2">
                  {!event.read && (
                    <div className="w-2 h-2 rounded-full bg-[#0EA5E9]" />
                  )}
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/70">
                  {fullTimestamp}
                </span>
              </div>
            </div>
            
            {/* Prompt-specific metadata row */}
            {isPromptEvent && promptData && (
              <div className="flex items-center flex-wrap gap-2 mt-2">
                {/* Scan number */}
                <Badge variant="outline" className="text-[10px] h-5 bg-slate-50 font-mono">
                  Scan #{promptData.scan_number}
                </Badge>
                
                {/* Streak badge */}
                {promptData.streak >= 3 && (
                  <Badge className="text-[10px] h-5 bg-orange-100 text-orange-700 hover:bg-orange-100">
                    <Flame className="h-3 w-3 mr-0.5" />
                    {promptData.streak}x streak
                  </Badge>
                )}
                
                {/* First citation celebration */}
                {promptData.is_first_citation && (
                  <Badge className="text-[10px] h-5 bg-green-100 text-green-700 hover:bg-green-100">
                    <PartyPopper className="h-3 w-3 mr-0.5" />
                    First citation!
                  </Badge>
                )}
                
                {/* Citation lost warning */}
                {promptData.is_citation_lost && (
                  <Badge className="text-[10px] h-5 bg-red-100 text-red-700 hover:bg-red-100">
                    <AlertTriangle className="h-3 w-3 mr-0.5" />
                    Lost citation
                  </Badge>
                )}
                
                {/* Position change indicator */}
                {promptData.position_change !== null && promptData.position_change !== 0 && (
                  <Badge 
                    className={cn(
                      "text-[10px] h-5",
                      promptData.position_change > 0 
                        ? "bg-green-100 text-green-700 hover:bg-green-100" 
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                    )}
                  >
                    {promptData.position_change > 0 ? (
                      <><TrendingUp className="h-3 w-3 mr-0.5" />+{promptData.position_change}</>
                    ) : (
                      <><TrendingDown className="h-3 w-3 mr-0.5" />{promptData.position_change}</>
                    )}
                  </Badge>
                )}
                
                {/* Citation status */}
                <Badge 
                  className={cn(
                    "text-[10px] h-5",
                    promptData.cited 
                      ? "bg-green-100 text-green-700 hover:bg-green-100"
                      : promptData.mentioned
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                  )}
                >
                  {promptData.cited ? (
                    <><CheckCircle className="h-3 w-3 mr-0.5" />Cited</>
                  ) : promptData.mentioned ? (
                    <>Mentioned</>
                  ) : (
                    <>Gap</>
                  )}
                </Badge>
                
                {/* Winner if gap */}
                {!promptData.cited && promptData.winner_name && (
                  <Badge variant="outline" className="text-[10px] h-5 bg-slate-50">
                    <Trophy className="h-3 w-3 mr-0.5 text-amber-500" />
                    {promptData.winner_name}
                  </Badge>
                )}
                
                {/* Persona if available */}
                {promptData.persona && (
                  <Badge variant="outline" className="text-[10px] h-5 bg-slate-50">
                    {promptData.persona}
                  </Badge>
                )}
              </div>
            )}
            
            {/* Origin badge + link to memo (for non-prompt events) */}
            {!isPromptEvent && (originLabel || event.related_memo_id) && (
              <div className="flex items-center gap-2 mt-1">
                {originLabel && (
                  <Badge variant="outline" className="text-[10px] h-5 bg-slate-50">
                    {originLabel}
                  </Badge>
                )}
                {event.related_memo_id && (
                  <Link 
                    href={`/brands/${event.brand_id}/memos/${event.related_memo_id}`}
                    className="text-xs text-[#0EA5E9] hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View memo
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}
            
            {/* For prompt events, show origin + memo link */}
            {isPromptEvent && (originLabel || event.related_memo_id) && (
              <div className="flex items-center gap-2 mt-1">
                {originLabel && (
                  <span className="text-[10px] text-muted-foreground">
                    Source: {originLabel}
                  </span>
                )}
                {event.related_memo_id && (
                  <Link 
                    href={`/brands/${event.brand_id}/memos/${event.related_memo_id}`}
                    className="text-xs text-[#0EA5E9] hover:underline flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View memo
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            )}
            
            {/* Actions */}
            {actions.length > 0 && !event.action_taken && (
              <div className="flex items-center gap-2 mt-3">
                {/* Primary action */}
                {primaryAction && (
                  <Button
                    size="sm"
                    onClick={() => handleAction(primaryAction)}
                    disabled={loading !== null}
                    className="bg-[#0EA5E9] hover:bg-[#0284C7]"
                  >
                    {loading === primaryAction ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    {actionLabels[primaryAction]}
                    {event.action_cost_credits > 0 && (
                      <CostBadge credits={event.action_cost_credits} className="ml-2" />
                    )}
                  </Button>
                )}
                
                {/* Secondary actions */}
                {secondaryActions.filter(a => a !== 'dismiss').map(action => (
                  <Button
                    key={action}
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(action)}
                    disabled={loading !== null}
                  >
                    {loading === action ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : null}
                    {actionLabels[action]}
                  </Button>
                ))}
                
                {/* View Details */}
                {event.data && Object.keys(event.data).length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onViewDetails}
                  >
                    View Details
                  </Button>
                )}
                
                {/* Dismiss */}
                {actions.includes('dismiss') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAction('dismiss')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </Button>
                )}
              </div>
            )}
            
            {/* Action taken indicator */}
            {event.action_taken && (
              <div className="mt-3">
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {actionLabels[event.action_taken as FeedAction] || event.action_taken}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
