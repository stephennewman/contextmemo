import { Check, X, Minus } from 'lucide-react'
import type { ModelResult } from '@/lib/report/types'

interface ModelCardProps {
  result: ModelResult
}

const MODEL_ICONS: Record<string, string> = {
  'perplexity-sonar': '🔍',
  'gpt-4o-mini': '🤖',
  'claude-3-5-haiku': '🧠',
  'grok-4-fast': '⚡',
}

export function ModelCard({ result }: ModelCardProps) {
  const isCited = result.citations > 0
  const isMentioned = result.mentions > 0
  const icon = MODEL_ICONS[result.model_id] || '🤖'

  return (
    <div className={`
      rounded-xl border-2 p-5 transition-all
      ${isCited 
        ? 'border-emerald-200 bg-emerald-50/50' 
        : isMentioned 
          ? 'border-amber-200 bg-amber-50/30' 
          : 'border-red-200 bg-red-50/30'
      }
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-slate-800 text-sm">{result.display_name}</span>
        </div>
        {isCited ? (
          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100 rounded-full px-2.5 py-1">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
            <span className="text-xs font-bold">CITED</span>
          </div>
        ) : isMentioned ? (
          <div className="flex items-center gap-1 text-amber-600 bg-amber-100 rounded-full px-2.5 py-1">
            <Minus className="w-3.5 h-3.5" strokeWidth={3} />
            <span className="text-xs font-bold">MENTIONED</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-600 bg-red-100 rounded-full px-2.5 py-1">
            <X className="w-3.5 h-3.5" strokeWidth={3} />
            <span className="text-xs font-bold">NOT FOUND</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-slate-500 mb-0.5">Citation Rate</div>
          <div className="text-lg font-bold font-mono text-slate-800">{result.citation_rate}%</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-0.5">Mention Rate</div>
          <div className="text-lg font-bold font-mono text-slate-800">{result.mention_rate}%</div>
        </div>
      </div>

      {/* Sentiment */}
      {result.sentiment && (
        <div className="text-xs text-slate-500">
          Sentiment: <span className={`font-medium ${
            result.sentiment === 'positive' ? 'text-emerald-600' :
            result.sentiment === 'negative' ? 'text-red-600' : 'text-slate-600'
          }`}>{result.sentiment}</span>
        </div>
      )}

      {/* Context quote */}
      {result.sample_context && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs text-slate-500 italic leading-relaxed line-clamp-3">
            &ldquo;{result.sample_context}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}
