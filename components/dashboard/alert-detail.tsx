'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  CheckCircle,
  XCircle,
  FileText,
  Globe,
  Search,
  Zap,
  Calendar,
  AlertCircle,
  CreditCard,
  ExternalLink,
  Clock,
} from 'lucide-react'

interface Alert {
  id: string
  brand_id: string
  alert_type: string
  title: string
  message: string | null
  read: boolean
  data: Record<string, unknown> | null
  created_at: string
}

interface AlertDetailProps {
  alert: Alert | null
  isOpen: boolean
  onClose: () => void
  onMarkRead?: (alertId: string) => void
}

// Get icon and color for alert type
function getAlertMeta(type: string) {
  switch (type) {
    case 'scan_complete':
    case 'discovery_complete':
    case 'ai_overview_scan_complete':
      return { icon: Search, color: 'text-cyan-500', bgColor: 'bg-cyan-50 dark:bg-cyan-950/30' }
    case 'memo_published':
    case 'content_generated':
      return { icon: FileText, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950/30' }
    case 'setup_complete':
    case 'enrichment_complete':
      return { icon: Zap, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-950/30' }
    case 'google_sync_complete':
    case 'bing_sync_complete':
      return { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-950/30' }
    case 'payment_failed':
      return { icon: CreditCard, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-950/30' }
    case 'visibility_change':
      return { icon: Globe, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950/30' }
    default:
      return { icon: AlertCircle, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950/30' }
  }
}

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return formatDateTime(dateStr)
}

export function AlertDetail({ alert, isOpen, onClose, onMarkRead }: AlertDetailProps) {
  if (!alert) return null

  const { icon: Icon, color, bgColor } = getAlertMeta(alert.alert_type)
  const data = alert.data as Record<string, unknown> | null

  // Extract useful data from alert.data based on alert type
  const renderAlertData = () => {
    if (!data) return null

    switch (alert.alert_type) {
      case 'scan_complete':
      case 'discovery_complete':
        const hasStats = data.totalScans || data.totalMentions !== undefined || data.mentionRate !== undefined || data.totalQueries
        return (
          <>
            {hasStats && (
              <div className="p-5 border rounded-xl bg-background">
                <h4 className="text-sm font-medium mb-4">Scan Statistics</h4>
                <div className="space-y-4">
                  {data.totalScans != null && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Total Scans</span>
                      <span className="text-lg font-semibold">{String(data.totalScans)}</span>
                    </div>
                  )}
                  {data.totalMentions != null && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Brand Mentions</span>
                      <span className="text-lg font-semibold">{String(data.totalMentions)}</span>
                    </div>
                  )}
                  {data.mentionRate != null && (
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Mention Rate</span>
                      <span className="text-lg font-semibold">{String(data.mentionRate)}%</span>
                    </div>
                  )}
                  {data.totalQueries != null && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Queries Tested</span>
                      <span className="text-lg font-semibold">{String(data.totalQueries)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {data.byCategory && Array.isArray(data.byCategory) && (
              <div className="p-5 border rounded-xl bg-background">
                <h4 className="text-sm font-medium mb-4">Results by Category</h4>
                <div className="space-y-3">
                  {(data.byCategory as Array<{ category: string; mentions: number; total: number; rate: number }>).map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm capitalize">{cat.category.replace('_', ' ')}</span>
                      <span className={`text-sm font-medium ${cat.rate >= 50 ? 'text-green-600' : cat.rate >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                        {cat.rate}% ({cat.mentions}/{cat.total})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.winningQueries && Array.isArray(data.winningQueries) && data.winningQueries.length > 0 && (
              <div className="p-5 border rounded-xl bg-background">
                <h4 className="text-sm font-medium mb-4">Top Performing Queries</h4>
                <div className="space-y-3">
                  {(data.winningQueries as Array<{ query: string; category: string }>).slice(0, 5).map((q, i) => (
                    <div key={i} className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                      <p className="text-sm font-medium">"{q.query}"</p>
                      <p className="text-xs text-muted-foreground capitalize mt-1">{q.category}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      
      case 'memo_published':
      case 'content_generated':
        return (
          <div className="p-5 border rounded-xl bg-background space-y-4">
            {data.memoTitle != null && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Memo Title</p>
                <p className="text-base font-medium">{String(data.memoTitle)}</p>
              </div>
            )}
            {data.memoId != null && (
              <Button asChild variant="outline" className="w-full h-11">
                <Link href={`/brands/${alert.brand_id}/memos/${data.memoId}`}>
                  View Memo
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            )}
          </div>
        )
      
      case 'google_sync_complete':
      case 'bing_sync_complete':
        return (
          <div className="p-5 border rounded-xl bg-background">
            <h4 className="text-sm font-medium mb-4">Sync Results</h4>
            <div className="space-y-4">
              {data.queriesAdded != null && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Queries Added</span>
                  <span className="text-lg font-semibold">{String(data.queriesAdded)}</span>
                </div>
              )}
              {data.totalImpressions != null && (
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Total Impressions</span>
                  <span className="text-lg font-semibold">{Number(data.totalImpressions).toLocaleString()}</span>
                </div>
              )}
              {data.totalClicks != null && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Total Clicks</span>
                  <span className="text-lg font-semibold">{Number(data.totalClicks).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )
      
      default:
        // Generic data display for unknown types
        if (Object.keys(data).length > 0) {
          return (
            <div className="p-5 border rounded-xl bg-background">
              <p className="text-sm font-medium mb-3">Additional Details</p>
              <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-[200px]">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )
        }
        return null
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        {/* Header */}
        <div className="p-6 border-b bg-muted/30">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${bgColor}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold leading-snug pr-6">{alert.title}</h2>
                {!alert.read && (
                  <Badge className="bg-amber-500 text-white shrink-0">NEW</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs uppercase tracking-wide">
                  {alert.alert_type.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Timestamp */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground p-4 bg-muted/50 rounded-xl">
            <Clock className="h-5 w-5" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="font-medium">{formatRelativeTime(alert.created_at)}</span>
              <span className="hidden sm:inline text-muted-foreground/50">•</span>
              <span className="text-xs sm:text-sm">{formatDateTime(alert.created_at)}</span>
            </div>
          </div>

          {/* Message */}
          {alert.message && (
            <div className="p-5 border rounded-xl bg-background">
              <p className="text-base leading-relaxed">{alert.message}</p>
            </div>
          )}

          {/* Alert-specific data */}
          {renderAlertData()}

          {/* Mark as Read */}
          {!alert.read && onMarkRead && (
            <Button 
              variant="outline" 
              className="w-full h-12 text-base"
              onClick={() => {
                onMarkRead(alert.id)
                onClose()
              }}
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Mark as Read
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
