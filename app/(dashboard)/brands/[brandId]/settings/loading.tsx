import { Skeleton } from '@/components/ui/skeleton'

export default function BrandSettingsLoading() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 bg-slate-200" />
        <div>
          <Skeleton className="h-8 w-48 bg-slate-200" />
          <Skeleton className="h-4 w-64 mt-1 bg-slate-100" />
        </div>
      </div>

      {/* Brand Info Card */}
      <div className="border rounded-lg p-6 space-y-4">
        <div>
          <Skeleton className="h-6 w-32 bg-slate-200" />
          <Skeleton className="h-4 w-48 mt-1 bg-slate-100" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-slate-100" />
            <Skeleton className="h-10 w-full bg-slate-200" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-slate-100" />
            <Skeleton className="h-10 w-full bg-slate-200" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 bg-slate-100" />
          <Skeleton className="h-24 w-full bg-slate-200" />
        </div>
      </div>

      {/* Brand Context Card */}
      <div className="border rounded-lg p-6 space-y-4">
        <div>
          <Skeleton className="h-6 w-36 bg-slate-200" />
          <Skeleton className="h-4 w-56 mt-1 bg-slate-100" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24 bg-slate-100" />
              <Skeleton className="h-10 w-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Brand Tone Card */}
      <div className="border rounded-lg p-6 space-y-4">
        <div>
          <Skeleton className="h-6 w-28 bg-slate-200" />
          <Skeleton className="h-4 w-64 mt-1 bg-slate-100" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20 bg-slate-100" />
              <Skeleton className="h-10 w-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32 bg-slate-200" />
      </div>
    </div>
  )
}
