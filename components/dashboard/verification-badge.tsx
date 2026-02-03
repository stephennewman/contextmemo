'use client'

import { Badge } from '@/components/ui/badge'
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Loader2,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface VerificationData {
  verified?: boolean
  verified_at?: string
  time_to_citation_hours?: number | null
  citation_rate?: number
  mention_rate?: number
  models_citing?: string[]
}

interface VerificationBadgeProps {
  schemaJson: {
    verification?: VerificationData
    source_gap_id?: string
    hubspot_synced_at?: string
  } | null
  status: string
  publishedAt: string | null
}

export function VerificationBadge({ schemaJson, status, publishedAt }: VerificationBadgeProps) {
  const verification = schemaJson?.verification
  const sourceGapId = schemaJson?.source_gap_id

  // Only show for gap-fill memos that were published to HubSpot
  if (!sourceGapId) return null

  // Not yet published
  if (status !== 'published' || !publishedAt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[10px] gap-1">
              <Clock className="h-3 w-3" />
              Pending
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Publish to start verification</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Verified - brand is being cited!
  if (verification?.verified) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-[#10B981] text-white text-[10px] gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Cited
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p className="font-semibold">✓ Verified as being cited</p>
              {verification.time_to_citation_hours && (
                <p>Time to citation: {verification.time_to_citation_hours}h</p>
              )}
              {verification.citation_rate !== undefined && (
                <p>Citation rate: {verification.citation_rate}%</p>
              )}
              {verification.models_citing && verification.models_citing.length > 0 && (
                <p>Models citing: {verification.models_citing.join(', ')}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Published but awaiting verification
  const publishedDate = new Date(publishedAt).getTime()
  const now = Date.now()
  const hoursSincePublish = Math.floor((now - publishedDate) / (1000 * 60 * 60))

  if (hoursSincePublish < 24) {
    // Too soon to verify
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Indexing
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Verification in {24 - hoursSincePublish}h</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Verified but not cited yet
  if (verification && !verification.verified) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[10px] gap-1 border-orange-300 text-orange-600">
              <AlertCircle className="h-3 w-3" />
              Not cited
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p>Not yet being cited by AI models</p>
              {verification.mention_rate !== undefined && verification.mention_rate > 0 && (
                <p>But mentioned in {verification.mention_rate}% of responses</p>
              )}
              <p className="text-muted-foreground">Will re-check automatically</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Waiting for first verification check
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Clock className="h-3 w-3" />
            Verifying
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Checking if AI models now cite this content</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
