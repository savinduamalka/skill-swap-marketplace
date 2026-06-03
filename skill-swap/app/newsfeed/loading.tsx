import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';

/**
 * Newsfeed Loading Component
 *
 * Renders loading skeletons matching the 3-column newsfeed layout.
 */
export default function NewsfeedLoading() {
  return (
    <>
      <Header />
      <MobileNav />

      <main className="pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Sidebar Skeleton */}
            <div className="hidden lg:block lg:col-span-3 space-y-6 sticky top-20">
              <Card className="overflow-hidden border border-border bg-card">
                <div className="h-16 bg-muted/40" />
                <div className="p-4 pt-0 text-center relative">
                  <div className="-mt-8 mb-3 flex justify-center">
                    <Skeleton className="h-16 w-16 rounded-full border-4 border-card" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/60 space-y-3 text-left">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex justify-between items-center">
                        <Skeleton className="h-3.5 w-20" />
                        <Skeleton className="h-3.5 w-8" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-border/60 space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-8 w-full rounded" />
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Center Column Skeleton */}
            <div className="col-span-1 lg:col-span-6 space-y-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-10 flex-1 rounded-full" />
                </div>
              </Card>

              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="p-4 pb-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-3">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-4 w-5/6 mb-1" />
                      <Skeleton className="h-4 w-4/6" />
                    </div>
                    {i % 2 === 0 && <Skeleton className="w-full aspect-video" />}
                    <div className="px-4 py-2 flex items-center justify-between border-t border-b">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <div className="px-4 py-2 flex items-center justify-around">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right Sidebar Skeleton */}
            <div className="hidden lg:block lg:col-span-3 space-y-6 sticky top-20">
              <Card className="p-4 border border-border bg-card space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3.5 w-12" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-2.5 w-16" />
                        <Skeleton className="h-4 w-10" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4 border border-border bg-card space-y-3">
                <Skeleton className="h-4 w-32" />
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-3 w-full" />
                  ))}
                </div>
              </Card>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
