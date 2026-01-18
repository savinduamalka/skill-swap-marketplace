import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SearchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Sidebar Filter Skeleton */}
        <div className="md:col-span-1">
          <Card className="p-6 space-y-6">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-32" />
              ))}
            </div>
          </Card>
        </div>

        {/* Results Grid Skeleton */}
        <div className="md:col-span-3 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="w-14 h-14 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48 mb-4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
