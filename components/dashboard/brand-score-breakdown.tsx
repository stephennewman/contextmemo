'use client'

interface ScoreComponent {
  score: number
  max: number
  label: string
  detail: string
}

interface WeeklyScore {
  week: string
  score: number
}

interface Props {
  totalScore: number
  breakdown: {
    citation: ScoreComponent
    memos: ScoreComponent
    scans: ScoreComponent
    prompts: ScoreComponent
  }
  weeklyScores: WeeklyScore[]
}

export function BrandScoreBreakdown({ totalScore, breakdown, weeklyScores }: Props) {
  const components = [
    { ...breakdown.citation, color: '#0EA5E9' },
    { ...breakdown.memos, color: '#8B5CF6' },
    { ...breakdown.scans, color: '#10B981' },
    { ...breakdown.prompts, color: '#F59E0B' },
  ]

  const maxTrendScore = Math.max(...weeklyScores.map(w => w.score), 1)
  const trendDelta = weeklyScores.length >= 2 
    ? weeklyScores[weeklyScores.length - 1].score - weeklyScores[weeklyScores.length - 2].score
    : 0

  return (
    <div className="border-[3px] border-[#0F172A]">
      {/* Header */}
      <div className="p-5 bg-[#0F172A] text-white">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold tracking-widest text-slate-400">BRAND SCORE</span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-5xl font-bold text-[#0EA5E9]">{totalScore}</span>
              <span className="text-sm text-slate-500">/ 100</span>
              {trendDelta !== 0 && (
                <span className={`text-sm font-bold ${trendDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trendDelta > 0 ? '+' : ''}{trendDelta} this week
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Weekly Trend Chart */}
        {weeklyScores.length > 1 && (
          <div className="mt-5">
            <div className="text-[10px] font-bold tracking-widest text-slate-500 mb-2">6-WEEK TREND</div>
            <div className="flex items-end gap-1.5 h-16">
              {weeklyScores.map((w, i) => {
                const height = maxTrendScore > 0 ? (w.score / 100) * 100 : 0
                const isLatest = i === weeklyScores.length - 1
                return (
                  <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-[9px] font-mono ${isLatest ? 'text-[#0EA5E9]' : 'text-slate-600'}`}>
                      {w.score}
                    </span>
                    <div 
                      className={`w-full rounded-sm transition-all ${isLatest ? 'bg-[#0EA5E9]' : 'bg-slate-700'}`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-[9px] text-slate-600">{w.week}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Score Breakdown */}
      <div className="divide-y-2 divide-[#0F172A]">
        {components.map((comp) => {
          const pct = comp.max > 0 ? (comp.score / comp.max) * 100 : 0
          return (
            <div key={comp.label} className="p-4 flex items-center gap-4">
              <div className="w-10 text-right">
                <span className="text-lg font-bold" style={{ color: comp.color }}>{comp.score}</span>
                <span className="text-xs text-zinc-400">/{comp.max}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold tracking-wide text-[#0F172A]">{comp.label.toUpperCase()}</span>
                  <span className="text-xs text-zinc-500">{Math.round(pct)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full">
                  <div 
                    className="h-2 rounded-full transition-all" 
                    style={{ width: `${pct}%`, backgroundColor: comp.color }} 
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">{comp.detail}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
