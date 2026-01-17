import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserProfileLoading() {
  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button Skeleton */}
          <Skeleton className="h-5 w-32 mb-6" />

          {/* Profile Header Skeleton */}
          <Card className="p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Avatar Skeleton */}
              <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full" />

              {/* Info Skeleton */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-28" />
                </div>
                <Skeleton className="h-16 w-full mt-4" />
              </div>
            </div>
          </Card>

          {/* Skills Section Skeleton */}
          <Card className="p-6 mb-6">
            <Skeleton className="h-6 w-36 mb-4" />
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="p-4 rounded-lg border border-border">
                  <div className="flex justify-between mb-2">
                    <Skeleton className="h-5 w-32" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-12 w-full mb-3" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Reviews Section Skeleton */}
          <Card className="p-6">
            <Skeleton className="h-6 w-24 mb-4" />
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="pb-4 border-b border-border last:border-0"
                >
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>

      <MobileNav />
    </>
  );
}
