'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications } from '@/contexts/notifications-context';
import type { NotificationItem } from '@/lib/types/notifications';

/**
 * Formats a badge count for display, capping at 99+ for overflow
 */
function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

const EMPTY_STATE = {
  title: 'No notifications',
  message: 'You are all caught up.',
};

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
      return '/connections?tab=incoming';
    case 'CONNECTION_ACCEPTED':
      return '/connections?tab=active';
    case 'SESSION_REQUEST':
      return '/sessions?tab=requests';
    case 'SESSION_ACCEPTED':
    case 'SESSION_DECLINED':
    case 'SESSION_COMPLETED':
      return '/sessions';
    case 'REVIEW_RECEIVED':
      return notification.relatedUserId
        ? `/profile/${notification.relatedUserId}`
        : '/profile';
    case 'POST_LIKE':
    case 'POST_COMMENT':
    case 'COMMENT_REPLY':
    case 'COMMENT_LIKE':
      return '/newsfeed';
    default:
      return '/notifications';
  }
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: NotificationItem;
  onRead: (id: string) => void;
}) {
  const link = getNotificationLink(notification);
  const isUnread = !notification.isRead;

  return (
    <Link
      href={link}
      onClick={() => onRead(notification.id)}
      className={`block px-3 py-2 rounded-md transition overflow-hidden ${
        isUnread
          ? 'bg-primary/5 hover:bg-primary/10'
          : 'hover:bg-muted'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-2 break-words">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatTime(notification.createdAt)}
          </p>
        </div>
        {isUnread && (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
        )}
      </div>
    </Link>
  );
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetchInitial,
    fetchMore,
    markAllSeen,
    markAsRead,
  } = useNotifications();

  useEffect(() => {
    if (open) {
      if (notifications.length === 0 && !isLoading) {
        fetchInitial();
      }
      if (unreadCount > 0) {
        markAllSeen();
      }
    }
  }, [open, notifications.length, isLoading, fetchInitial, markAllSeen, unreadCount]);

  const hasNotifications = useMemo(
    () => notifications.length > 0,
    [notifications.length]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 py-0 flex items-center justify-center text-[0.65rem] font-bold leading-none rounded-full"
            >
              {formatBadgeCount(unreadCount)}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount === 0 && (
            <span className="text-xs text-muted-foreground">All caught up</span>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          <div className="p-3 space-y-2">
            {isLoading && notifications.length === 0 && (
              <div className="space-y-3">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm font-medium">{EMPTY_STATE.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {EMPTY_STATE.message}
                </p>
              </div>
            )}

            {hasNotifications &&
              notifications.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                />
              ))}
          </div>
        </ScrollArea>

        {hasMore && notifications.length > 0 && (
          <div className="px-4 py-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={fetchMore}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
