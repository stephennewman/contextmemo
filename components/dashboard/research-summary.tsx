'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Lightbulb, Shield, Users, Search, BarChart3 } from 'lucide-react'

interface ResearchSummaryProps {
  summary: {
    totalMarkets: number
    totalEntities: number
    totalQueries: number
    totalScans: number
    strongestMarket: { vertical: string; brandSov: number } | null
    weakestMarket: { vertical: string; brandSov: number } | null
    biggestOpportunity: { vertical: string; reason: string } | null
  }
}

export function ResearchSummary({ summary }: ResearchSummaryProps) {
  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Markets</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{summary.totalMarkets}</p>
            <p className="text-xs text-slate-500">industries discovered</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Entities</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{summary.totalEntities}</p>
            <p className="text-xs text-slate-500">competitors tracked</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Search className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Queries</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{summary.totalQueries}</p>
            <p className="text-xs text-slate-500">monitored</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Scans</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{summary.totalScans}</p>
            <p className="text-xs text-slate-500">analyzed</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {summary.strongestMarket && (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-emerald-700 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wide">Strongest Market</span>
              </div>
              <p className="font-semibold text-slate-900">{summary.strongestMarket.vertical}</p>
              <p className="text-sm text-slate-600">
                {Math.round(summary.strongestMarket.brandSov * 100)}% share of voice
              </p>
            </CardContent>
          </Card>
        )}
        {summary.weakestMarket && (
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wide">Weakest Market</span>
              </div>
              <p className="font-semibold text-slate-900">{summary.weakestMarket.vertical}</p>
              <p className="text-sm text-slate-600">
                {summary.weakestMarket.brandSov === 0
                  ? 'Invisible across all models'
                  : `${Math.round(summary.weakestMarket.brandSov * 100)}% share of voice`}
              </p>
            </CardContent>
          </Card>
        )}
        {summary.biggestOpportunity && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-700 mb-2">
                <Lightbulb className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wide">Biggest Opportunity</span>
              </div>
              <p className="font-semibold text-slate-900">{summary.biggestOpportunity.vertical}</p>
              <p className="text-sm text-slate-600">{summary.biggestOpportunity.reason}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
