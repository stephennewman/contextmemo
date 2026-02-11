import { Skeleton } from '@/components/ui/skeleton'

export default function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-80px)]" data-testid="auth-loading-main-div">
      <div className="w-full max-w-md p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-32 mx-auto bg-slate-200" />
          <Skeleton className="h-4 w-48 mx-auto bg-slate-100" />
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 bg-slate-100" />
            <Skeleton className="h-12 w-full bg-slate-200" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 bg-slate-100" />
            <Skeleton className="h-12 w-full bg-slate-200" />
          </div>
          <Skeleton className="h-12 w-full bg-[#0EA5E9]/30" />
        </div>

        {/* Footer */}
        <Skeleton className="h-4 w-40 mx-auto bg-slate-100" />
      </div>
    </div>
  )
}
