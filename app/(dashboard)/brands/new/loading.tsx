import { Skeleton } from '@/components/ui/skeleton'

export default function NewBrandLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <Skeleton className="h-10 w-48 mx-auto bg-slate-200" />
        <Skeleton className="h-4 w-72 mx-auto mt-2 bg-slate-100" />
      </div>

      {/* Form card */}
      <div className="border-[3px] border-[#0F172A] p-8 space-y-6">
        {/* Brand name */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 bg-slate-100" />
          <Skeleton className="h-12 w-full bg-slate-200" />
        </div>

        {/* Domain */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 bg-slate-100" />
          <Skeleton className="h-12 w-full bg-slate-200" />
          <Skeleton className="h-3 w-64 bg-slate-100" />
        </div>

        {/* Subdomain */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-28 bg-slate-100" />
          <div className="flex">
            <Skeleton className="h-12 flex-1 bg-slate-200" />
            <Skeleton className="h-12 w-40 bg-slate-100" />
          </div>
        </div>

        {/* Submit button */}
        <Skeleton className="h-12 w-full bg-[#0EA5E9]/30" />
      </div>
    </div>
  )
}
