import { Skeleton } from '@/components/ui/skeleton'

export default function MemoEditLoading() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link and header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 bg-slate-200" />
        <div className="flex-1">
          <Skeleton className="h-6 w-64 bg-slate-200" />
          <Skeleton className="h-4 w-40 mt-1 bg-slate-100" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 bg-slate-200" />
          <Skeleton className="h-9 w-20 bg-slate-200" />
        </div>
      </div>

      {/* Main content area */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editor - takes 2 columns */}
        <div className="lg:col-span-2 border rounded-lg p-6 space-y-4">
          <div>
            <Skeleton className="h-6 w-32 bg-slate-200" />
            <Skeleton className="h-4 w-48 mt-1 bg-slate-100" />
          </div>
          
          {/* Title input */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 bg-slate-100" />
            <Skeleton className="h-10 w-full bg-slate-200" />
          </div>
          
          {/* Slug input */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-12 bg-slate-100" />
            <Skeleton className="h-10 w-full bg-slate-200" />
          </div>
          
          {/* Content textarea */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 bg-slate-100" />
            <Skeleton className="h-80 w-full bg-slate-200" />
          </div>
          
          {/* Meta description */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-slate-100" />
            <Skeleton className="h-20 w-full bg-slate-200" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status card */}
          <div className="border rounded-lg p-4 space-y-3">
            <Skeleton className="h-5 w-24 bg-slate-200" />
            <Skeleton className="h-10 w-full bg-slate-200" />
            <Skeleton className="h-9 w-full bg-slate-200" />
          </div>

          {/* Preview card */}
          <div className="border rounded-lg p-4 space-y-3">
            <Skeleton className="h-5 w-20 bg-slate-200" />
            <Skeleton className="h-4 w-full bg-slate-100" />
            <Skeleton className="h-9 w-full bg-slate-200" />
          </div>

          {/* Delete card */}
          <div className="border border-red-200 rounded-lg p-4 space-y-3">
            <Skeleton className="h-5 w-28 bg-red-100" />
            <Skeleton className="h-4 w-full bg-slate-100" />
            <Skeleton className="h-9 w-full bg-red-100" />
          </div>
        </div>
      </div>
    </div>
  )
}
