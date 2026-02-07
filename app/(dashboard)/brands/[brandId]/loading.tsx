export default function BrandLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-200 rounded animate-pulse" />
          <div>
            <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="flex items-center gap-2 mt-1">
              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
              <span className="text-zinc-400">·</span>
              <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Brand Score */}
        <div className="p-5 bg-[#0F172A] animate-pulse" style={{ borderLeft: '8px solid #0EA5E9' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 bg-slate-600 rounded" />
            <div className="h-3 w-24 bg-slate-600 rounded" />
          </div>
          <div className="h-12 w-16 bg-slate-700 rounded" />
          <div className="w-full h-2 bg-slate-700 mt-3 rounded-full" />
        </div>
        
        {/* Citations */}
        <div className="p-5 border-[3px] border-[#0F172A] animate-pulse" style={{ borderLeft: '8px solid #0EA5E9' }}>
          <div className="h-3 w-16 bg-slate-200 rounded mb-3" />
          <div className="h-10 w-12 bg-slate-200 rounded" />
          <div className="h-3 w-24 bg-slate-100 rounded mt-2" />
        </div>
        
        {/* Memos */}
        <div className="p-5 border-[3px] border-[#0F172A] animate-pulse" style={{ borderLeft: '8px solid #8B5CF6' }}>
          <div className="h-3 w-12 bg-slate-200 rounded mb-3" />
          <div className="h-10 w-8 bg-slate-200 rounded" />
          <div className="h-3 w-28 bg-slate-100 rounded mt-2" />
        </div>
        
        {/* Scans */}
        <div className="p-5 border-[3px] border-[#0F172A] animate-pulse" style={{ borderLeft: '8px solid #10B981' }}>
          <div className="h-3 w-12 bg-slate-200 rounded mb-3" />
          <div className="h-10 w-14 bg-slate-200 rounded" />
          <div className="h-3 w-24 bg-slate-100 rounded mt-2" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <div className="flex gap-1 border-b-[3px] border-[#0F172A] pb-0">
          {['PROFILE', 'ACTIVITY', 'PROMPTS', 'MEMOS', 'ENTITIES', 'SOURCES', 'WATCH', 'COVERAGE'].map((tab) => (
            <div
              key={tab}
              className={`px-4 py-2 text-xs font-bold ${tab === 'PROMPTS' ? 'bg-[#0EA5E9] text-white' : 'text-slate-400'}`}
            >
              {tab}
            </div>
          ))}
        </div>
        
        <div className="space-y-4 animate-pulse">
          <div className="h-40 bg-slate-100 rounded border-[3px] border-slate-200" />
          <div className="h-32 bg-slate-50 rounded border-[3px] border-slate-200" />
        </div>
      </div>
    </div>
  )
}
