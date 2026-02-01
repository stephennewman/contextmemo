import { Skeleton } from '@/components/ui/skeleton'

export default function BrandPageLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-8 w-48 bg-slate-200" />
            <Skeleton className="h-6 w-20 bg-slate-100" />
          </div>
          <Skeleton className="h-4 w-56 bg-slate-100" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 bg-slate-200" />
          <Skeleton className="h-9 w-32 bg-slate-200" />
          <Skeleton className="h-9 w-24 bg-slate-200" />
        </div>
      </div>

      {/* Visibility Score Hero - 4 cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Main visibility card */}
        <div className="p-6 bg-[#0F172A]" style={{ borderLeft: '8px solid #0EA5E9' }}>
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-5 bg-slate-600" />
            <Skeleton className="h-3 w-24 bg-slate-600" />
          </div>
          <Skeleton className="h-12 w-20 bg-slate-500 mt-2" />
          <Skeleton className="h-2 w-full bg-slate-700 mt-3" />
        </div>
        
        {/* Other stat cards */}
        {[
          { color: '#8B5CF6', label: 'MEMOS' },
          { color: '#10B981', label: 'QUERIES' },
          { color: '#F59E0B', label: 'SCANS' },
        ].map((stat, i) => (
          <div key={i} className="p-6 border-[3px] border-[#0F172A]" style={{ borderLeft: `8px solid ${stat.color}` }}>
            <Skeleton className="h-3 w-16 bg-slate-100" />
            <Skeleton className="h-10 w-12 bg-slate-200 mt-2" />
            <Skeleton className="h-3 w-20 bg-slate-100 mt-1" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        {/* Tab headers */}
        <div className="flex border-b-[3px] border-[#0F172A]">
          {['OVERVIEW', 'SCANS', 'MEMOS', 'PROMPTS', 'COMPETITORS', 'SEARCH'].map((tab, i) => (
            <Skeleton 
              key={tab}
              className={`h-11 w-24 ${i === 0 ? 'bg-[#0EA5E9]/30' : 'bg-slate-100'}`}
            />
          ))}
        </div>

        {/* Tab content - Chart area */}
        <div className="border-[3px] border-[#0F172A] p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-40 bg-slate-200" />
            <Skeleton className="h-8 w-32 bg-slate-100" />
          </div>
          <Skeleton className="h-64 w-full bg-slate-100" />
        </div>
      </div>
    </div>
  )
}
