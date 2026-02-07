export default function BrandLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-slate-200 rounded" />
          <div>
            <div className="h-7 w-48 bg-slate-200 rounded" />
            <div className="flex items-center gap-2 mt-1">
              <div className="h-4 w-16 bg-slate-200 rounded" />
              <span className="text-zinc-400">·</span>
              <div className="h-4 w-40 bg-slate-100 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar Skeleton */}
      <div className="flex gap-1 border-b-[3px] border-slate-200 pb-0">
        {[80, 70, 90, 70, 80, 90, 80].map((w, i) => (
          <div key={i} className="h-8 bg-slate-100 rounded-none" style={{ width: w }} />
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="space-y-4">
        <div className="h-24 bg-slate-50 rounded border border-slate-200" />
        <div className="h-40 bg-slate-50 rounded border border-slate-200" />
      </div>
    </div>
  )
}
