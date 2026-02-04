'use client'

import { RefreshCw, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { WORKFLOW_META, type FeedWorkflow, type FeedSeverity } from '@/lib/feed/types'

interface FeedFiltersProps {
  workflow: FeedWorkflow | 'all'
  setWorkflow: (workflow: FeedWorkflow | 'all') => void
  severity: FeedSeverity | 'all'
  setSeverity: (severity: FeedSeverity | 'all') => void
  unreadOnly: boolean
  setUnreadOnly: (unreadOnly: boolean) => void
  unreadCount: number
  onRefresh: () => void
}

export function FeedFilters({
  workflow,
  setWorkflow,
  severity,
  setSeverity,
  unreadOnly,
  setUnreadOnly,
  unreadCount,
  onRefresh,
}: FeedFiltersProps) {
  return (
    <div className="px-6 py-4 border-b bg-white">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Filters */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          {/* Workflow filter */}
          <Select value={workflow} onValueChange={(v) => setWorkflow(v as FeedWorkflow | 'all')}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All workflows" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All workflows</SelectItem>
              {Object.values(WORKFLOW_META).filter(w => w.id !== 'system').map(w => (
                <SelectItem key={w.id} value={w.id}>
                  {w.shortName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Severity filter */}
          <Select value={severity} onValueChange={(v) => setSeverity(v as FeedSeverity | 'all')}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="action_required">Action needed</SelectItem>
              <SelectItem value="warning">Warnings</SelectItem>
              <SelectItem value="success">Successes</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Unread only toggle */}
          <div className="flex items-center gap-2 ml-2">
            <Switch
              id="unread-only"
              checked={unreadOnly}
              onCheckedChange={setUnreadOnly}
            />
            <Label htmlFor="unread-only" className="text-sm cursor-pointer">
              Unread only
            </Label>
            {unreadCount > 0 && (
              <button
                onClick={() => setUnreadOnly(!unreadOnly)}
                className="px-2 py-0.5 bg-[#0EA5E9] text-white text-xs font-medium rounded-full hover:bg-[#0284C7] transition-colors"
                title={`${unreadCount} total unread (all workflows) - click to ${unreadOnly ? 'show all' : 'filter'}`}
              >
                {unreadCount}
              </button>
            )}
          </div>
        </div>
        
        {/* Right: Refresh */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="text-muted-foreground"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  )
}
