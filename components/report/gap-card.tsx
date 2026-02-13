import { AlertTriangle, Trophy, X } from 'lucide-react'
import { getFunnelLabel } from '@/lib/report/types'
import type { GapResult, StrengthResult } from '@/lib/report/types'

interface GapCardProps {
  gap: GapResult
}

export function GapCard({ gap }: GapCardProps) {
  const funnel = getFunnelLabel(gap.funnel_stage)
  
  return (
    <div className="rounded-lg border border-red-100 bg-white p-4 border-l-4 border-l-red-400">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-1.5 rounded-lg bg-red-50">
          <X className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 leading-snug mb-2">
            &ldquo;{gap.query_text}&rdquo;
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${funnel.color} ${funnel.bg}`}>
              {funnel.label}
            </span>
            <span className="text-[10px] text-slate-400">|</span>
            <span className="text-xs text-slate-500">
              Missing from <span className="font-medium text-slate-700">{gap.models_missing.length} model{gap.models_missing.length !== 1 ? 's' : ''}</span>
            </span>
            {gap.winner_name && (
              <>
                <span className="text-[10px] text-slate-400">|</span>
                <span className="text-xs text-slate-500">
                  Winner: <span className="font-medium text-red-600">{gap.winner_name}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface StrengthCardProps {
  strength: StrengthResult
}

export function StrengthCard({ strength }: StrengthCardProps) {
  const funnel = getFunnelLabel(strength.funnel_stage)

  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-4 border-l-4 border-l-emerald-400">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-50">
          <Trophy className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 leading-snug mb-2">
            &ldquo;{strength.query_text}&rdquo;
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${funnel.color} ${funnel.bg}`}>
              {funnel.label}
            </span>
            <span className="text-[10px] text-slate-400">|</span>
            <span className="text-xs text-slate-500">
              Cited by <span className="font-medium text-emerald-600">
                {strength.models_cited.join(', ')}
              </span>
            </span>
            {strength.sentiment && strength.sentiment !== 'neutral' && (
              <>
                <span className="text-[10px] text-slate-400">|</span>
                <span className={`text-xs font-medium ${
                  strength.sentiment === 'positive' ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {strength.sentiment} sentiment
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
