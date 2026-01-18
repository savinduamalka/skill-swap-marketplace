/**
 * Messages Loading Skeleton
 *
 * Displays a skeleton UI mimicking the chat interface
 * while conversation data is being loaded.
 */
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function MessagesLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-200px)] flex gap-6">
      {/* Conversations List Skeleton */}
      <div className="hidden md:flex flex-col w-80 border-r border-border">
        <Skeleton className="h-10 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Chat Window Skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Skeleton className="w-12 h-12 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
            >
              <Skeleton
                className={`h-16 ${i % 2 === 0 ? 'w-48' : 'w-56'} rounded-lg`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
