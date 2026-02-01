import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-48 bg-slate-200" />
          <Skeleton className="h-4 w-64 mt-2 bg-slate-100" />
        </div>
        <Skeleton className="h-10 w-32 bg-slate-200" />
      </div>

      {/* Cards grid skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-[3px] border-[#0F172A] bg-white">
            {/* Card header */}
            <div className="p-5 border-b-[3px] border-[#0F172A]">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-6 w-32 bg-slate-200" />
                <Skeleton className="h-5 w-16 bg-slate-100" />
              </div>
              <Skeleton className="h-4 w-48 bg-slate-100" />
            </div>
            
            {/* Stats grid */}
            <div className="grid grid-cols-2">
              <div className="p-4 border-b-[3px] border-r-[3px] border-[#0F172A]">
                <Skeleton className="h-3 w-16 mb-2 bg-slate-100" />
                <Skeleton className="h-8 w-12 bg-slate-200" />
              </div>
              <div className="p-4 border-b-[3px] border-[#0F172A]">
                <Skeleton className="h-3 w-16 mb-2 bg-slate-100" />
                <Skeleton className="h-8 w-12 bg-slate-200" />
              </div>
              <div className="p-4 border-r-[3px] border-[#0F172A]">
                <Skeleton className="h-3 w-16 mb-2 bg-slate-100" />
                <Skeleton className="h-8 w-12 bg-slate-200" />
              </div>
              <div className="p-4">
                <Skeleton className="h-3 w-16 mb-2 bg-slate-100" />
                <Skeleton className="h-8 w-12 bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
