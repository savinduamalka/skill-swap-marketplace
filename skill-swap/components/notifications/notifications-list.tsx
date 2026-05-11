'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications } from '@/contexts/notifications-context';
import type { NotificationItem } from '@/lib/types/notifications';

function formatTime(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

function getNotificationLink(notification: NotificationItem): string {
  switch (notification.type) {
    case 'MESSAGE':
      return notification.relatedEntityId
        ? `/messages?conversation=${notification.relatedEntityId}`
        : '/messages';
    case 'CONNECTION_REQUEST':
    case 'CONNECTION_ACCEPTED':
      return '/connections';
    case 'SESSION_REQUEST':
    case 'SESSION_ACCEPTED':
    case 'SESSION_DECLINED':
    case 'SESSION_COMPLETED':
      return '/sessions';
    case 'REVIEW_RECEIVED':
      return notification.relatedUserId
        ? `/profile/${notification.relatedUserId}`
        : '/profile';
    default:
      return '/newsfeed';
  }
}

export function NotificationsList() {
  const {
    notifications,
    isLoading,
    hasMore,
    fetchInitial,
    fetchMore,
    markAllSeen,
    markAsRead,
  } = useNotifications();

  useEffect(() => {
    fetchInitial();
    markAllSeen();
  }, [fetchInitial, markAllSeen]);

  if (isLoading && notifications.length === 0) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((index) => (
          <Card key={index} className="p-4 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.length === 0 && !isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-sm font-medium">No notifications</p>
          <p className="text-xs text-muted-foreground mt-1">
            You are all caught up.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const isUnread = !notification.isRead;
            return (
              <Link
                key={notification.id}
                href={getNotificationLink(notification)}
                onClick={() => markAsRead(notification.id)}
              >
                <Card
                  className={`p-4 transition ${
                    isUnread ? 'bg-primary/5' : 'bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={`text-sm ${
                          isUnread ? 'font-semibold' : 'font-medium'
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {hasMore && (
        <Button
          variant="outline"
          className="w-full"
          onClick={fetchMore}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Load more'}
        </Button>
      )}
    </div>
  );
}
