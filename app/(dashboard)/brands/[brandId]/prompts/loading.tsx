import { TabSkeleton, StatsSkeleton } from '../tab-loading'
export default function Loading() {
  return (
    <div className="space-y-4">
      <StatsSkeleton />
      <TabSkeleton rows={5} />
    </div>
  )
}
