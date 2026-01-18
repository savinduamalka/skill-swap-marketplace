/**
 * Unread Messages Context
 *
 * Provides global state for tracking and managing unread conversations.
 * Allows any component to mark conversations as read when viewed.
 *
 * @fileoverview Context for managing unread message counts across the app
 */
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useChatSocket } from '@/hooks/useChatSocket';

interface UnreadMessagesContextType {
  unreadCount: number;
  markConversationAsRead: (connectionId: string) => void;
  refreshUnreadCount: () => void;
  setCurrentOpenConversation: (connectionId: string | null) => void;
}

const UnreadMessagesContext = createContext<
  UnreadMessagesContextType | undefined
>(undefined);

export function UnreadMessagesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversationsWithUnread, setConversationsWithUnread] = useState<
    Set<string>
  >(new Set());
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentOpenConversation, setCurrentOpenConversation] = useState<
    string | null
  >(null);

  const { onMessageReceived } = useChatSocket();

  // Fetch initial unread count from API
  const refreshUnreadCount = async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      if (response.ok) {
        const data = await response.json();
        const conversations = data.conversations || [];

        // Get unique conversation IDs with unread messages
        const unreadSet = new Set<string>();
        conversations.forEach((conv: any) => {
          if (conv.unreadCount > 0) {
            unreadSet.add(conv.id);
          }
        });

        setConversationsWithUnread(unreadSet);
        setUnreadCount(unreadSet.size);
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Error fetching unread conversations:', error);
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    // Only fetch if we're on the client
    if (typeof window !== 'undefined') {
      refreshUnreadCount();
    }
  }, []);

  // Listen for incoming messages and update count instantly
  useEffect(() => {
    const unsubscribe = onMessageReceived((socketMessage) => {
      // Only add to unread if the conversation is NOT currently open
      if (currentOpenConversation !== socketMessage.connectionId) {
        setConversationsWithUnread((prev) => {
          const updated = new Set(prev);
          updated.add(socketMessage.connectionId);
          setUnreadCount(updated.size);
          return updated;
        });
      }
    });

    return unsubscribe;
  }, [onMessageReceived, currentOpenConversation]);

  // Mark conversation as read
  const markConversationAsRead = (connectionId: string) => {
    setConversationsWithUnread((prev) => {
      const updated = new Set(prev);
      updated.delete(connectionId);
      setUnreadCount(updated.size);
      return updated;
    });
  };

  return (
    <UnreadMessagesContext.Provider
      value={{
        unreadCount,
        markConversationAsRead,
        refreshUnreadCount,
        setCurrentOpenConversation,
      }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  );
}

export function useUnreadMessages() {
  const context = useContext(UnreadMessagesContext);
  if (context === undefined) {
    throw new Error(
      'useUnreadMessages must be used within UnreadMessagesProvider'
    );
  }
  return context;
}
