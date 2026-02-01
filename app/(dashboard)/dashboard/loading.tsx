import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPageLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-48 bg-slate-200" />
          <Skeleton className="h-4 w-72 mt-2 bg-slate-100" />
        </div>
        <Skeleton className="h-10 w-32 bg-[#0EA5E9]/20" />
      </div>

      {/* Brand Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-[3px] border-[#0F172A] bg-white">
            {/* Card header */}
            <div className="p-5 border-b-[3px] border-[#0F172A]">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-6 w-32 bg-slate-200" />
                <Skeleton className="h-5 w-20 bg-slate-100" />
              </div>
              <Skeleton className="h-4 w-48 bg-slate-100" />
            </div>
            
            {/* Stats grid */}
            <div className="grid grid-cols-2 divide-x-[3px] divide-[#0F172A]">
              <div className="p-4 border-b-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #0EA5E9' }}>
                <Skeleton className="h-3 w-16 mb-2 bg-slate-100" />
                <Skeleton className="h-8 w-14 bg-slate-200" />
              </div>
              <div className="p-4 border-b-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #8B5CF6' }}>
                <Skeleton className="h-3 w-16 mb-2 bg-slate-100" />
                <Skeleton className="h-8 w-10 bg-slate-200" />
              </div>
              <div className="p-4" style={{ borderLeft: '8px solid #10B981' }}>
                <Skeleton className="h-3 w-16 mb-2 bg-slate-100" />
                <Skeleton className="h-8 w-10 bg-slate-200" />
              </div>
              <div className="p-4" style={{ borderLeft: '8px solid #F59E0B' }}>
                <Skeleton className="h-3 w-16 mb-2 bg-slate-100" />
                <Skeleton className="h-8 w-8 bg-slate-200" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
