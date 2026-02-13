import type { CompetitorResult } from '@/lib/report/types'

interface CompetitorBarsProps {
  competitors: CompetitorResult[]
  brandName: string
  brandMentions: number
}

export function CompetitorBars({ competitors, brandName, brandMentions }: CompetitorBarsProps) {
  // Combine brand with competitors for the chart
  const maxMentions = Math.max(...competitors.map(c => c.mention_count), brandMentions)
  
  const allEntries = [
    ...competitors.map(c => ({ name: c.name, count: c.mention_count, isBrand: false })),
  ].sort((a, b) => b.count - a.count)

  // Insert the brand at its sorted position
  const brandEntry = { name: brandName, count: brandMentions, isBrand: true }
  const insertIdx = allEntries.findIndex(e => e.count <= brandMentions)
  if (insertIdx === -1) {
    allEntries.push(brandEntry)
  } else {
    allEntries.splice(insertIdx, 0, brandEntry)
  }

  return (
    <div className="space-y-3">
      {allEntries.map((entry, i) => {
        const width = maxMentions > 0 ? (entry.count / maxMentions) * 100 : 0
        return (
          <div key={entry.name} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  entry.isBrand ? 'text-sky-600' : 'text-slate-700'
                }`}>
                  {entry.name}
                </span>
                {entry.isBrand && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">
                    You
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {entry.count} mentions
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  entry.isBrand ? 'bg-sky-500' : 'bg-slate-300'
                }`}
                style={{ width: `${Math.max(width, 2)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
