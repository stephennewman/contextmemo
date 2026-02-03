'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Trophy,
  Users,
  Target,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { QueryDetail } from './query-detail'

interface Query {
  id: string
  query_text: string
  query_type: string | null
  priority: number
}

interface ScanResult {
  id: string
  query_id: string
  model: string
  brand_mentioned: boolean
  competitors_mentioned: string[] | null
  scanned_at: string
}

interface QueryBattle {
  queryId: string
  queryText: string
  queryType: string | null
  brandMentioned: boolean
  competitorsMentioned: string[]
  winner: 'brand' | 'competitor' | 'both' | 'neither'
}

interface QueriesListDrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  type: 'wins' | 'ties' | 'losses'
  queries: QueryBattle[]
  allQueries: Query[]
  scanResults: ScanResult[]
  brandName: string
}

export function QueriesListDrawer({
  isOpen,
  onClose,
  title,
  description,
  type,
  queries,
  allQueries,
  scanResults,
  brandName,
}: QueriesListDrawerProps) {
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null)

  // Get the icon and color based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'wins':
        return { 
          icon: Trophy, 
          color: 'text-green-500', 
          bgColor: 'bg-green-50 dark:bg-green-950/30',
          borderColor: 'border-green-200 dark:border-green-900'
        }
      case 'ties':
        return { 
          icon: Users, 
          color: 'text-amber-500', 
          bgColor: 'bg-amber-50 dark:bg-amber-950/30',
          borderColor: 'border-amber-200 dark:border-amber-900'
        }
      case 'losses':
        return { 
          icon: Target, 
          color: 'text-red-500', 
          bgColor: 'bg-red-50 dark:bg-red-950/30',
          borderColor: 'border-red-200 dark:border-red-900'
        }
    }
  }

  const config = getTypeConfig()
  const Icon = config.icon

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
          {/* Header */}
          <div className="p-6 border-b bg-muted/30">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${config.bgColor}`}>
                <Icon className={`h-6 w-6 ${config.color}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-3">
            {queries.length > 0 ? (
              queries.map((battle) => {
                const query = allQueries.find(q => q.id === battle.queryId)
                return (
                  <div 
                    key={battle.queryId}
                    className={`p-4 border rounded-xl cursor-pointer hover:shadow-sm transition-all group ${config.borderColor} ${config.bgColor}`}
                    onClick={() => query && setSelectedQuery(query)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          {type === 'wins' ? (
                            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          ) : type === 'losses' ? (
                            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                          ) : (
                            <Users className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-snug">"{battle.queryText}"</p>
                            <div className="flex items-center gap-3 mt-3">
                              <Badge variant="outline" className="text-xs">
                                {battle.queryType || 'general'}
                              </Badge>
                              {type !== 'wins' && battle.competitorsMentioned.length > 0 && (
                                <span className="text-sm text-muted-foreground">
                                  {type === 'losses' ? 'Winner: ' : 'Also: '}
                                  {battle.competitorsMentioned.slice(0, 2).join(', ')}
                                  {battle.competitorsMentioned.length > 2 && ` +${battle.competitorsMentioned.length - 2}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-base">No prompts in this category yet.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Query Detail Drawer */}
      <QueryDetail
        query={selectedQuery}
        isOpen={!!selectedQuery}
        onClose={() => setSelectedQuery(null)}
        brandName={brandName}
        scanResults={scanResults}
      />
    </>
  )
}
