'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import { useChatSocket } from '@/hooks/useChatSocket';
import type { NotificationItem } from '@/lib/types/notifications';

interface NotificationsContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  pendingConnections: number;
  pendingSessions: number;
  isLoading: boolean;
  hasMore: boolean;
  fetchInitial: () => Promise<void>;
  fetchMore: () => Promise<void>;
  markAllSeen: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markRelatedAsRead: (relatedEntityId: string, type?: string) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

const PAGE_SIZE = 20;

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const { onNotificationReceived } = useChatSocket();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingConnections, setPendingConnections] = useState(0);
  const [pendingSessions, setPendingSessions] = useState(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    if (status !== 'authenticated') return;

    try {
      const response = await fetch('/api/notifications/unread-count');
      if (!response.ok) return;
      const data = await response.json();
      setUnreadCount(data.unreadCount ?? 0);
      setPendingConnections(data.pendingConnections ?? 0);
      setPendingSessions(data.pendingSessions ?? 0);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'authenticated') {
      refreshUnreadCount();
    } else if (status === 'unauthenticated') {
      setUnreadCount(0);
      setPendingConnections(0);
      setPendingSessions(0);
      setNotifications([]);
      setCursor(null);
      setHasMore(true);
      setHasLoadedOnce(false);
    }
  }, [status, refreshUnreadCount]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshUnreadCount, status]);

  const fetchInitial = useCallback(async () => {
    if (status !== 'authenticated' || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications?limit=${PAGE_SIZE}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(data.notifications || []);
      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.hasMore));
      setHasLoadedOnce(true);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, status]);

  const fetchMore = useCallback(async () => {
    if (status !== 'authenticated' || isLoading || !hasMore || !cursor) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/notifications?cursor=${cursor}&limit=${PAGE_SIZE}`
      );
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications((prev) => [...prev, ...(data.notifications || [])]);
      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, hasMore, isLoading, status]);

  const markAllSeen = useCallback(async () => {
    if (status !== 'authenticated') return;

    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, isSeen: true }))
    );

    try {
      await fetch('/api/notifications/seen', { method: 'PATCH' });
    } catch (error) {
      console.error('Error marking notifications seen:', error);
      refreshUnreadCount();
    }
  }, [refreshUnreadCount, status]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item
        )
      );

      try {
        await fetch('/api/notifications/read', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: notificationId }),
        });
      } catch (error) {
        console.error('Error marking notification read:', error);
      }
    },
    []
  );

  const markRelatedAsRead = useCallback(
    async (relatedEntityId: string, type?: string) => {
      setNotifications((prev) =>
        prev.map((item) =>
          item.relatedEntityId === relatedEntityId &&
          (!type || item.type === type)
            ? { ...item, isRead: true }
            : item
        )
      );

      try {
        await fetch('/api/notifications/read', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relatedEntityId, type }),
        });
      } catch (error) {
        console.error('Error marking related notifications read:', error);
      }
    },
    []
  );

  useEffect(() => {
    if (!session?.user?.id) return;

    const unsubscribe = onNotificationReceived((payload) => {
      const notification = payload.notification as NotificationItem;
      setUnreadCount((prev) => prev + 1);

      if (hasLoadedOnce) {
        setNotifications((prev) => [notification, ...prev]);
      }
    });

    return unsubscribe;
  }, [hasLoadedOnce, onNotificationReceived, session?.user?.id]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      pendingConnections,
      pendingSessions,
      isLoading,
      hasMore,
      fetchInitial,
      fetchMore,
      markAllSeen,
      markAsRead,
      markRelatedAsRead,
      refreshUnreadCount,
    }),
    [
      fetchInitial,
      fetchMore,
      hasMore,
      isLoading,
      markAllSeen,
      markAsRead,
      markRelatedAsRead,
      notifications,
      refreshUnreadCount,
      unreadCount,
      pendingConnections,
      pendingSessions,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationsProvider'
    );
  }
  return context;
}
