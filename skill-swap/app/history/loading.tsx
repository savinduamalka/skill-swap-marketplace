/**
 * History Page Loading Skeleton
 *
 * Displays a skeleton UI while activity history
 * and chart data is being loaded.
 */
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function HistoryLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Skeleton */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Stats Overview Skeleton */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-9 w-16" />
          </Card>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <Skeleton className="h-6 w-36 mb-4" />
          <Skeleton className="h-72 w-full" />
        </Card>
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-72 w-full" />
        </Card>
      </div>
    </div>
  )
}
