import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewsfeedLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      {/* Create Post Card Skeleton */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-full" />
        </div>
      </Card>

      {/* Posts Feed Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            {/* Post Header */}
            <div className="p-4 pb-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>

            {/* Post Content */}
            <div className="px-4 pb-3">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-5/6 mb-1" />
              <Skeleton className="h-4 w-4/6" />
            </div>

            {/* Media Skeleton (every other post) */}
            {i % 2 === 0 && <Skeleton className="w-full aspect-video" />}

            {/* Post Stats */}
            <div className="px-4 py-2 flex items-center justify-between border-t border-b">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>

            {/* Post Actions */}
            <div className="px-4 py-2 flex items-center justify-around">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-20" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
