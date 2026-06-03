import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';

export default function RoadmapLoading() {
  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8 space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>

          {/* Tabs */}
          <div className="space-y-6">
            <Skeleton className="h-10 w-full lg:w-72 rounded-lg" />

            {/* Generate Card */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-52" />
                <Skeleton className="h-4 w-full max-w-lg" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-40" />
                {/* Select + button row */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full sm:w-44 shrink-0" />
                </div>
                {/* Selected skill context block */}
                <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-full max-w-sm" />
                </div>
              </CardContent>
            </Card>

            {/* Roadmap preview placeholder */}
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-64" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {[1, 2, 3].map((phase) => (
                  <div key={phase} className="space-y-3">
                    {/* Phase header */}
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                    {/* Steps */}
                    <div className="ml-4 border-l-2 border-dashed border-border pl-6 space-y-3">
                      {[1, 2].map((step) => (
                        <div
                          key={step}
                          className="rounded-lg border p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Skeleton className="h-4 w-2/5" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-5/6" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <MobileNav />
    </>
  );
}
