import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header Skeleton */}
      <Card className="p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <Skeleton className="w-24 h-24 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </div>
      </Card>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 text-center">
            <Skeleton className="h-3 w-20 mx-auto mb-2" />
            <Skeleton className="h-8 w-12 mx-auto" />
          </Card>
        ))}
      </div>

      {/* Content Sections Skeleton */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 bg-muted rounded-lg mb-3">
                <Skeleton className="h-5 w-40 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </Card>
        </div>
        <Card className="p-6">
          <Skeleton className="h-6 w-28 mb-4" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border border-border rounded-lg mb-3">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
