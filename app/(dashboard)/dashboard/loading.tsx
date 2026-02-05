import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">BRANDS</h1>
          <p className="text-zinc-500 font-medium">
            Monitor your AI search citations across all brands
          </p>
        </div>
        <Button disabled className="bg-[#0EA5E9] text-white font-semibold rounded-none px-6 opacity-50">
          <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
          ADD BRAND
        </Button>
      </div>

      {/* Skeleton Brand Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-[3px] border-[#0F172A] bg-white animate-pulse">
            {/* Header Skeleton */}
            <div className="p-5 border-b-[3px] border-[#0F172A]">
              <div className="flex items-center justify-between mb-2">
                <div className="h-6 w-32 bg-slate-200 rounded" />
                <div className="h-6 w-20 bg-slate-200 rounded" />
              </div>
              <div className="h-4 w-48 bg-slate-100 rounded" />
            </div>
            
            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-2 divide-x-[3px] divide-[#0F172A]">
              <div className="p-4" style={{ borderLeft: '8px solid #8B5CF6' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 bg-purple-200 rounded" />
                  <div className="h-3 w-12 bg-slate-200 rounded" />
                </div>
                <div className="h-9 w-12 bg-slate-200 rounded" />
              </div>
              
              <div className="p-4" style={{ borderLeft: '8px solid #10B981' }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 bg-green-200 rounded" />
                  <div className="h-3 w-16 bg-slate-200 rounded" />
                </div>
                <div className="h-9 w-12 bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
