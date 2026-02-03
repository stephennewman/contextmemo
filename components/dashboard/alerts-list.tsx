'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  CheckCircle,
  XCircle,
  FileText,
  Search,
  Zap,
  AlertCircle,
  CreditCard,
  ChevronRight,
} from 'lucide-react'
import { AlertDetail } from './alert-detail'

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

interface AlertsListProps {
  alerts: Alert[]
  unreadCount: number
}

// Get icon and color for alert type
function getAlertIcon(type: string) {
  switch (type) {
    case 'scan_complete':
    case 'discovery_complete':
    case 'ai_overview_scan_complete':
      return <Search className="h-4 w-4 text-[#0EA5E9]" />
    case 'memo_published':
    case 'content_generated':
      return <FileText className="h-4 w-4 text-[#8B5CF6]" />
    case 'setup_complete':
    case 'enrichment_complete':
      return <Zap className="h-4 w-4 text-[#10B981]" />
    case 'google_sync_complete':
    case 'bing_sync_complete':
      return <CheckCircle className="h-4 w-4 text-[#10B981]" />
    case 'payment_failed':
      return <CreditCard className="h-4 w-4 text-[#EF4444]" />
    default:
      return <AlertCircle className="h-4 w-4 text-[#F59E0B]" />
  }
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function AlertsList({ alerts, unreadCount }: AlertsListProps) {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
            <CardDescription>
              System alerts and activity updates
            </CardDescription>
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-[#F59E0B] text-white">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 border-2 cursor-pointer hover:bg-muted/50 transition-colors group ${
                  alert.read ? 'border-zinc-200 bg-white' : 'border-[#0F172A] bg-[#FAFAFA]'
                }`}
                style={{ borderLeft: alert.read ? '4px solid #E5E7EB' : '4px solid #F59E0B' }}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getAlertIcon(alert.alert_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-semibold text-sm ${alert.read ? 'text-zinc-600' : 'text-[#0F172A]'}`}>
                        {alert.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 whitespace-nowrap">
                          {formatRelativeTime(alert.created_at)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    {alert.message && (
                      <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                        {alert.message}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                        {alert.alert_type.replace(/_/g, ' ')}
                      </Badge>
                      {!alert.read && (
                        <Badge className="bg-[#F59E0B] text-white text-[10px]">
                          NEW
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">No alerts yet</p>
            <p className="text-sm text-zinc-400 mt-1">
              Alerts will appear here when scans complete, memos are published, and more.
            </p>
          </div>
        )}
      </CardContent>

      {/* Alert Detail Drawer */}
      <AlertDetail
        alert={selectedAlert}
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
      />
    </Card>
  )
}
