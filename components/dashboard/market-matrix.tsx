'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronRight } from 'lucide-react'

// Types matching the API response
interface MarketCompetitor {
  name: string
  domain: string | null
  entityType: string
  mentionCount: number
  sov: number
  strength: 'strong' | 'moderate' | 'weak'
  problemMentions: number
  solutionMentions: number
}

interface Market {
  vertical: string
  queryCount: number
  scanCount: number
  awareness: 'unaware' | 'problem_aware' | 'solution_aware' | 'product_aware'
  awarenessScore: number
  brandSov: number
  brandMentionCount: number
  competitors: MarketCompetitor[]
}

interface CompetitorSummary {
  name: string
  domain: string | null
  entityType: string
  totalMentionCount: number
  totalSov: number
  marketReach: number
  totalMarkets: number
  markets: string[]
}

interface MarketMatrixProps {
  markets: Market[]
  competitors: CompetitorSummary[]
  brandName: string
}

// Awareness stage display
const AWARENESS_CONFIG = {
  product_aware: { label: 'PRODUCT', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50', bars: 4 },
  solution_aware: { label: 'SOLUTION', color: 'bg-sky-500', textColor: 'text-sky-700', bgColor: 'bg-sky-50', bars: 3 },
  problem_aware: { label: 'PROBLEM', color: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50', bars: 2 },
  unaware: { label: 'UNAWARE', color: 'bg-slate-400', textColor: 'text-slate-500', bgColor: 'bg-slate-50', bars: 1 },
}

// Strength indicator
function StrengthDot({ strength, sov }: { strength: 'strong' | 'moderate' | 'weak'; sov: number }) {
  if (strength === 'strong') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <span className="inline-flex items-center justify-center w-6 h-6 text-base leading-none">
              <span className="text-emerald-600">●</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Strong: {Math.round(sov * 100)}% SOV</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  if (strength === 'moderate') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <span className="inline-flex items-center justify-center w-6 h-6 text-base leading-none">
              <span className="text-amber-500">◐</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Moderate: {Math.round(sov * 100)}% SOV</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 text-base leading-none">
      <span className="text-slate-300">○</span>
    </span>
  )
}

// Awareness bar indicator
function AwarenessBar({ awareness }: { awareness: 'unaware' | 'problem_aware' | 'solution_aware' | 'product_aware' }) {
  const config = AWARENESS_CONFIG[awareness]
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex flex-col items-center gap-1">
            <span className={`text-[10px] font-bold ${config.textColor}`}>{config.label}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`w-2 h-3 rounded-sm ${i <= config.bars ? config.color : 'bg-slate-200'}`}
                />
              ))}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p className="font-semibold">{config.label}-AWARE</p>
            {awareness === 'product_aware' && <p>Buyers comparing specific products</p>}
            {awareness === 'solution_aware' && <p>Buyers know solutions exist, evaluating</p>}
            {awareness === 'problem_aware' && <p>Buyers feel the pain, don&apos;t know solutions</p>}
            {awareness === 'unaware' && <p>Market doesn&apos;t recognize the problem</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Positioning label based on market reach
function getPositioning(marketReach: number, totalMarkets: number): string {
  const ratio = totalMarkets > 0 ? marketReach / totalMarkets : 0
  if (ratio >= 0.6) return 'Platform'
  if (ratio >= 0.3) return 'Multi-Vertical'
  if (marketReach >= 1) return 'Niche'
  return 'Invisible'
}

export function MarketMatrix({ markets, competitors, brandName }: MarketMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<{ market: string; competitor: string } | null>(null)

  if (markets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-500 text-sm">
            No market data available yet. Queries need vertical tags to populate this view.
          </p>
          <p className="text-slate-400 text-xs mt-2">
            Run the backfill script or regenerate queries to tag them with industry verticals.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Get top competitors across all markets (columns), sorted by total SOV
  const topCompetitors = competitors.slice(0, 8)

  // Calculate market reach per competitor (strong presence count)
  const competitorReach = new Map<string, number>()
  for (const market of markets) {
    for (const comp of market.competitors) {
      if (comp.strength === 'strong') {
        const current = competitorReach.get(comp.name.toLowerCase()) || 0
        competitorReach.set(comp.name.toLowerCase(), current + 1)
      }
    }
  }

  // Build the cell lookup: market -> competitor -> data
  const cellData = new Map<string, Map<string, MarketCompetitor>>()
  for (const market of markets) {
    const row = new Map<string, MarketCompetitor>()
    for (const comp of market.competitors) {
      row.set(comp.name.toLowerCase(), comp)
    }
    cellData.set(market.vertical, row)
  }

  // Find details for the drill-down
  const selectedMarket = selectedCell ? markets.find(m => m.vertical === selectedCell.market) : null
  const selectedCompData = selectedCell && selectedMarket
    ? selectedMarket.competitors.find(c => c.name.toLowerCase() === selectedCell.competitor.toLowerCase())
    : null

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Market x Competitor Matrix</CardTitle>
          <CardDescription>
            Where each competitor plays, based on AI scan results. Competitors ranked by total share-of-voice.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 pl-4 font-semibold text-slate-700 min-w-[160px] sticky left-0 bg-white z-10">
                    Market
                  </th>
                  <th className="text-center p-3 font-semibold text-slate-700 min-w-[80px]">
                    Awareness
                  </th>
                  {topCompetitors.map(comp => (
                    <th key={comp.name} className="text-center p-3 min-w-[80px]">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-semibold text-slate-700 text-xs truncate max-w-[90px]">
                          {comp.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          SOV: {Math.round(comp.totalSov * 100)}%
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="text-center p-3 min-w-[80px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-semibold text-sky-600 text-xs">{brandName}</span>
                      <span className="text-[10px] text-slate-400">You</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {markets.map((market, idx) => (
                  <tr
                    key={market.vertical}
                    className={`border-b border-slate-100 hover:bg-slate-50/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}
                  >
                    <td className="p-3 pl-4 sticky left-0 bg-inherit z-10">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{market.vertical}</span>
                        <span className="text-[10px] text-slate-400">{market.queryCount} queries</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <AwarenessBar awareness={market.awareness} />
                    </td>
                    {topCompetitors.map(comp => {
                      const cell = cellData.get(market.vertical)?.get(comp.name.toLowerCase())
                      const strength = cell?.strength || 'weak'
                      const sov = cell?.sov || 0
                      return (
                        <td
                          key={comp.name}
                          className="p-3 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => cell && setSelectedCell({ market: market.vertical, competitor: comp.name })}
                        >
                          <StrengthDot strength={strength} sov={sov} />
                        </td>
                      )
                    })}
                    <td className="p-3 text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className={`inline-flex items-center justify-center w-6 h-6 text-base leading-none ${market.brandSov >= 0.6 ? '' : market.brandSov >= 0.2 ? '' : ''}`}>
                              {market.brandSov >= 0.6 ? (
                                <span className="text-sky-600">●</span>
                              ) : market.brandSov >= 0.2 ? (
                                <span className="text-sky-400">◐</span>
                              ) : market.brandSov > 0 ? (
                                <span className="text-sky-300">◐</span>
                              ) : (
                                <span className="text-slate-300">○</span>
                              )}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {market.brandSov === 0
                                ? 'Not mentioned in this market'
                                : `${Math.round(market.brandSov * 100)}% SOV (${market.brandMentionCount} mentions)`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                ))}

                {/* Footer rows */}
                <tr className="border-t-2 border-slate-300 bg-slate-50">
                  <td className="p-3 pl-4 font-semibold text-slate-700 text-xs sticky left-0 bg-slate-50 z-10">
                    MARKET REACH
                  </td>
                  <td className="p-3 text-center text-[10px] text-slate-400">—</td>
                  {topCompetitors.map(comp => {
                    const reach = competitorReach.get(comp.name.toLowerCase()) || 0
                    return (
                      <td key={comp.name} className="p-3 text-center">
                        <span className="text-xs font-semibold text-slate-700">
                          {reach}/{markets.length}
                        </span>
                      </td>
                    )
                  })}
                  <td className="p-3 text-center">
                    <span className="text-xs font-semibold text-sky-600">
                      {markets.filter(m => m.brandSov >= 0.6).length}/{markets.length}
                    </span>
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-3 pl-4 font-semibold text-slate-700 text-xs sticky left-0 bg-slate-50 z-10">
                    POSITIONING
                  </td>
                  <td className="p-3 text-center text-[10px] text-slate-400">—</td>
                  {topCompetitors.map(comp => {
                    const reach = competitorReach.get(comp.name.toLowerCase()) || 0
                    const positioning = getPositioning(reach, markets.length)
                    return (
                      <td key={comp.name} className="p-3 text-center">
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {positioning}
                        </Badge>
                      </td>
                    )
                  })}
                  <td className="p-3 text-center">
                    <Badge variant="outline" className="text-[10px] font-medium text-sky-600 border-sky-200">
                      {getPositioning(markets.filter(m => m.brandSov >= 0.6).length, markets.length)}
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap gap-4 text-xs text-slate-500">
            <span><span className="text-emerald-600">●</span> Strong (60%+)</span>
            <span><span className="text-amber-500">◐</span> Moderate (20-59%)</span>
            <span><span className="text-slate-300">○</span> Weak (&lt;20%)</span>
            <span className="ml-auto">Click any cell for details</span>
          </div>
        </CardContent>
      </Card>

      {/* Cell drill-down sheet */}
      <Sheet open={!!selectedCell} onOpenChange={() => setSelectedCell(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">
              {selectedCell?.competitor} in {selectedCell?.market}
            </SheetTitle>
            <SheetDescription>
              How AI positions this competitor in this market
            </SheetDescription>
          </SheetHeader>

          {selectedCompData && selectedMarket && (
            <div className="mt-6 space-y-6">
              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Share of Voice</p>
                  <p className="text-lg font-bold">{Math.round(selectedCompData.sov * 100)}%</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Mentions</p>
                  <p className="text-lg font-bold">{selectedCompData.mentionCount}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Problem Queries</p>
                  <p className="text-lg font-bold">{selectedCompData.problemMentions}</p>
                  <p className="text-[10px] text-slate-400">times mentioned in problem-framed queries</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Solution Queries</p>
                  <p className="text-lg font-bold">{selectedCompData.solutionMentions}</p>
                  <p className="text-[10px] text-slate-400">times mentioned in solution-framed queries</p>
                </div>
              </div>

              {/* Market context */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700">Market Context</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Market awareness</span>
                    <Badge variant="outline" className={`text-[10px] ${AWARENESS_CONFIG[selectedMarket.awareness].textColor}`}>
                      {AWARENESS_CONFIG[selectedMarket.awareness].label}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total queries in market</span>
                    <span className="font-medium">{selectedMarket.queryCount}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total scans in market</span>
                    <span className="font-medium">{selectedMarket.scanCount}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Your SOV in this market</span>
                    <span className="font-medium text-sky-600">{Math.round(selectedMarket.brandSov * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Other competitors in this market */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700">Other Competitors in {selectedMarket.vertical}</h4>
                <div className="space-y-1.5">
                  {selectedMarket.competitors
                    .filter(c => c.name.toLowerCase() !== selectedCell?.competitor.toLowerCase())
                    .slice(0, 8)
                    .map(comp => (
                      <div key={comp.name} className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 text-sm">
                        <div className="flex items-center gap-2">
                          <StrengthDot strength={comp.strength} sov={comp.sov} />
                          <span className="text-slate-700">{comp.name}</span>
                        </div>
                        <span className="text-slate-400 text-xs">{Math.round(comp.sov * 100)}%</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Strategic insight */}
              <div className="p-3 bg-sky-50 rounded-lg border border-sky-100">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ChevronRight className="h-3 w-3 text-sky-600" />
                  <span className="text-xs font-semibold text-sky-700">Strategic Insight</span>
                </div>
                <p className="text-xs text-sky-800">
                  {selectedCompData.strength === 'strong' && selectedMarket.brandSov < 0.2
                    ? `${selectedCompData.name} dominates ${selectedMarket.vertical} with ${Math.round(selectedCompData.sov * 100)}% SOV. You need competitive comparison content targeting this market.`
                    : selectedCompData.strength === 'moderate'
                    ? `${selectedCompData.name} has moderate presence in ${selectedMarket.vertical}. This market is contestable — targeted content could shift share of voice.`
                    : selectedCompData.strength === 'weak'
                    ? `${selectedCompData.name} has weak presence in ${selectedMarket.vertical}. Neither of you dominates — first mover wins.`
                    : `${selectedCompData.name} is a key player here.`
                  }
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
