import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function TabSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header Card Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-slate-200 rounded" />
              <div className="h-3.5 w-56 bg-slate-100 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-24 bg-slate-100 rounded" />
              <div className="h-8 w-20 bg-slate-100 rounded" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content Skeleton */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-100 rounded shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded" style={{ width: `${75 - i * 8}%` }} />
                <div className="h-3 bg-slate-50 rounded" style={{ width: `${50 - i * 5}%` }} />
              </div>
              <div className="h-6 w-16 bg-slate-50 rounded shrink-0" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="border-l-4 border-l-slate-200">
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="h-7 w-12 bg-slate-200 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
