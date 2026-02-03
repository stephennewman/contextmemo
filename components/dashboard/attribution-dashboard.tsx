'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  ArrowRight,
  Bot,
  UserPlus,
  Briefcase,
  Trophy,
} from 'lucide-react'
import { AI_SOURCE_LABELS, AI_SOURCE_COLORS, AIReferrerSource } from '@/lib/supabase/types'

interface AttributionEvent {
  id: string
  event_type: 'traffic' | 'contact' | 'deal' | 'closed_won'
  ai_source: string | null
  memo_id: string | null
  deal_value: number | null
  created_at: string
  metadata?: Record<string, unknown>
}

interface AttributionDashboardProps {
  events: AttributionEvent[]
  brandName: string
  hubspotEnabled: boolean
}

export function AttributionDashboard({ events, brandName, hubspotEnabled }: AttributionDashboardProps) {
  // Calculate funnel metrics
  const contacts = events.filter(e => e.event_type === 'contact')
  const deals = events.filter(e => e.event_type === 'deal' || e.event_type === 'closed_won')
  const closedWon = events.filter(e => e.event_type === 'closed_won')

  const totalPipeline = deals.reduce((sum, d) => sum + (d.deal_value || 0), 0)
  const totalRevenue = closedWon.reduce((sum, d) => sum + (d.deal_value || 0), 0)

  const conversionRate = contacts.length > 0 
    ? Math.round((closedWon.length / contacts.length) * 100) 
    : 0

  const avgDealSize = closedWon.length > 0 
    ? Math.round(totalRevenue / closedWon.length) 
    : 0

  // Group by AI source
  const revenueBySource: Record<string, number> = {}
  const contactsBySource: Record<string, number> = {}
  
  for (const event of events) {
    const source = event.ai_source || 'unknown'
    if (event.event_type === 'contact') {
      contactsBySource[source] = (contactsBySource[source] || 0) + 1
    }
    if (event.event_type === 'closed_won') {
      revenueBySource[source] = (revenueBySource[source] || 0) + (event.deal_value || 0)
    }
  }

  const topSources = Object.entries(revenueBySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Recent conversions
  const recentConversions = closedWon
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  if (!hubspotEnabled) {
    return (
      <Card className="border-2 border-dashed border-zinc-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Attribution
          </CardTitle>
          <CardDescription>
            Connect HubSpot to track revenue from AI citations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">HubSpot Not Connected</p>
            <p className="text-sm mt-2">
              Connect HubSpot in Settings to track which AI-generated content creates revenue.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Attribution
          </CardTitle>
          <CardDescription>
            Track revenue from AI-generated content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No attribution data yet.</p>
            <p className="text-sm mt-2">
              As AI traffic converts to contacts and deals, attribution will appear here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #10B981' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">ATTRIBUTED REVENUE</p>
                <p className="text-3xl font-bold text-[#10B981]">${totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-[#10B981]" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #8B5CF6' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">PIPELINE VALUE</p>
                <p className="text-3xl font-bold">${totalPipeline.toLocaleString()}</p>
              </div>
              <Briefcase className="h-8 w-8 text-[#8B5CF6]" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #0EA5E9' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">AI CONTACTS</p>
                <p className="text-3xl font-bold">{contacts.length}</p>
              </div>
              <UserPlus className="h-8 w-8 text-[#0EA5E9]" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #F59E0B' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">CONVERSION RATE</p>
                <p className="text-3xl font-bold">{conversionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-[#F59E0B]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Attribution Funnel</CardTitle>
          <CardDescription>From AI citation to closed revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-4">
            {/* AI Traffic */}
            <div className="text-center flex-1">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#0EA5E9]/10 flex items-center justify-center mb-2">
                <Bot className="h-8 w-8 text-[#0EA5E9]" />
              </div>
              <p className="text-2xl font-bold">{Object.values(contactsBySource).reduce((a, b) => a + b, 0) || '-'}</p>
              <p className="text-xs text-muted-foreground">AI Visitors</p>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground" />

            {/* Contacts */}
            <div className="text-center flex-1">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#8B5CF6]/10 flex items-center justify-center mb-2">
                <UserPlus className="h-8 w-8 text-[#8B5CF6]" />
              </div>
              <p className="text-2xl font-bold">{contacts.length}</p>
              <p className="text-xs text-muted-foreground">Contacts</p>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground" />

            {/* Deals */}
            <div className="text-center flex-1">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#F59E0B]/10 flex items-center justify-center mb-2">
                <Briefcase className="h-8 w-8 text-[#F59E0B]" />
              </div>
              <p className="text-2xl font-bold">{deals.length}</p>
              <p className="text-xs text-muted-foreground">Deals</p>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground" />

            {/* Closed Won */}
            <div className="text-center flex-1">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#10B981]/10 flex items-center justify-center mb-2">
                <Trophy className="h-8 w-8 text-[#10B981]" />
              </div>
              <p className="text-2xl font-bold">{closedWon.length}</p>
              <p className="text-xs text-muted-foreground">Won</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue by AI Source */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue by AI Source</CardTitle>
            <CardDescription>Which AI platforms drive the most revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {topSources.length > 0 ? (
              <div className="space-y-3">
                {topSources.map(([source, revenue]) => {
                  const color = AI_SOURCE_COLORS[source as AIReferrerSource] || '#6B7280'
                  const percentage = totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0
                  return (
                    <div key={source} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {AI_SOURCE_LABELS[source as AIReferrerSource] || source}
                        </span>
                        <span className="font-semibold">${revenue.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No closed deals yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Closed Deals</CardTitle>
            <CardDescription>Latest revenue from AI citations</CardDescription>
          </CardHeader>
          <CardContent>
            {recentConversions.length > 0 ? (
              <div className="space-y-2">
                {recentConversions.map((deal) => {
                  const color = AI_SOURCE_COLORS[deal.ai_source as AIReferrerSource] || '#6B7280'
                  return (
                    <div key={deal.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <div>
                          <p className="text-sm font-medium">
                            ${(deal.deal_value || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            from {AI_SOURCE_LABELS[deal.ai_source as AIReferrerSource] || deal.ai_source}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(deal.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No closed deals yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
