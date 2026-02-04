import { Skeleton } from '@/components/ui/skeleton'

export default function ProfileLoading() {
  return (
    <div className="h-full overflow-auto">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-20" />
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-6 space-y-8 max-w-5xl">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-4 pt-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Personas Section */}
        <div className="border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
