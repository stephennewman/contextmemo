'use client'

import { useState } from 'react'
import { VoiceInsight, formatVoiceInsightCitation, VOICE_INSIGHT_TOPIC_LABELS } from '@/lib/supabase/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Mic, Quote, MapPin, Clock, User, Trash2, Edit2, 
  CheckCircle2, Copy, ExternalLink, MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface VoiceInsightCardProps {
  insight: VoiceInsight
  onEdit?: (insight: VoiceInsight) => void
  onDelete?: (insightId: string) => void
  showCitation?: boolean
}

export function VoiceInsightCard({ 
  insight, 
  onEdit, 
  onDelete,
  showCitation = true 
}: VoiceInsightCardProps) {
  const [copied, setCopied] = useState(false)
  
  const citation = formatVoiceInsightCitation(insight)
  
  const copyAsQuote = () => {
    const quote = `"${insight.transcript}"\n\n${citation}`
    navigator.clipboard.writeText(quote)
    setCopied(true)
    toast.success('Quote copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">
                {VOICE_INSIGHT_TOPIC_LABELS[insight.topic]}
              </Badge>
              {insight.audio_url && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Mic className="h-3 w-3" />
                  Voice
                </Badge>
              )}
              {insight.citation_count > 0 && (
                <Badge variant="default" className="text-xs gap-1 bg-green-600">
                  <Quote className="h-3 w-3" />
                  Cited {insight.citation_count}x
                </Badge>
              )}
            </div>
            <h4 className="font-medium text-sm line-clamp-1">{insight.title}</h4>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyAsQuote}>
                <Copy className="h-4 w-4 mr-2" />
                Copy as quote
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(insight)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {insight.recorded_by_linkedin_url && (
                <DropdownMenuItem asChild>
                  <a href={insight.recorded_by_linkedin_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View LinkedIn
                  </a>
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(insight.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Transcript */}
        <div className="relative">
          <Quote className="absolute -left-1 -top-1 h-4 w-4 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground pl-4 italic line-clamp-3">
            {insight.transcript}
          </p>
        </div>
        
        {/* Verification metadata */}
        {showCitation && (
          <div className="pt-2 border-t space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="font-medium">{insight.recorded_by_name}</span>
              {insight.recorded_by_title && (
                <span>• {insight.recorded_by_title}</span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(insight.recorded_at)}
              </div>
              
              {insight.geolocation?.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {insight.geolocation.city}
                  {insight.geolocation.region && `, ${insight.geolocation.region}`}
                </div>
              )}
            </div>
            
            {insight.ip_address && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Verified source
              </div>
            )}
          </div>
        )}
        
        {/* Tags */}
        {insight.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {insight.tags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
