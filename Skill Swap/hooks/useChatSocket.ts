import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  SocketMessage,
  SendMessagePayload,
  MessageSentPayload,
  SocketErrorPayload,
} from '@/lib/types/messages';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export type UserOnlineStatus = {
  userId: string;
  online: boolean;
};

export const useChatSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Callbacks for socket events
  const messageCallbacks = useRef<Set<(message: SocketMessage) => void>>(
    new Set()
  );
  const messageSentCallbacks = useRef<
    Set<(payload: MessageSentPayload) => void>
  >(new Set());
  const errorCallbacks = useRef<Set<(error: SocketErrorPayload) => void>>(
    new Set()
  );
  const userOnlineCallbacks = useRef<Set<(status: UserOnlineStatus) => void>>(
    new Set()
  );
  const messageReadCallbacks = useRef<
    Set<
      (data: {
        messageId: string;
        connectionId: string;
        readBy: string;
      }) => void
    >
  >(new Set());

  const initSocket = useCallback(async () => {
    if (socketRef.current?.connected) return;

    try {
      // 1. Get the short-lived token from Next.js API
      const res = await fetch('/api/auth/socket');
      if (!res.ok) {
        console.error('Failed to fetch socket token:', res.status);
        return;
      }

      const data = await res.json();

      if (!data.token) {
        console.error('Failed to get socket token');
        return;
      }

      // 2. Connect to Microservice with reconnection options
      socketRef.current = io(SOCKET_URL, {
        auth: { token: data.token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: maxReconnectAttempts,
      });

      // Connection events
      socketRef.current.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
        reconnectAttempts.current += 1;

        // If max attempts reached, notify user
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          errorCallbacks.current.forEach((cb) =>
            cb({ message: 'Failed to connect to chat server. Please refresh.' })
          );
        }
      });

      // Message events
      socketRef.current.on('receive_message', (message: SocketMessage) => {
        messageCallbacks.current.forEach((cb) => cb(message));
      });

      socketRef.current.on('message_sent', (payload: MessageSentPayload) => {
        messageSentCallbacks.current.forEach((cb) => cb(payload));
      });

      socketRef.current.on('error', (error: SocketErrorPayload) => {
        errorCallbacks.current.forEach((cb) => cb(error));
      });

      // User online/offline events
      socketRef.current.on('user_online', (data: { userId: string }) => {
        userOnlineCallbacks.current.forEach((cb) =>
          cb({ userId: data.userId, online: true })
        );
      });

      socketRef.current.on('user_offline', (data: { userId: string }) => {
        userOnlineCallbacks.current.forEach((cb) =>
          cb({ userId: data.userId, online: false })
        );
      });

      // Message read receipt event
      socketRef.current.on(
        'message_read',
        (data: { messageId: string; connectionId: string; readBy: string }) => {
          messageReadCallbacks.current.forEach((cb) => cb(data));
        }
      );
    } catch (err) {
      console.error('Socket Init Error', err);
    }
  }, []);

  useEffect(() => {
    initSocket();

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
    };
  }, [initSocket]);

  // Join a specific conversation room
  const joinChat = useCallback((connectionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_chat', connectionId);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback((payload: SendMessagePayload) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', payload);
    } else {
      errorCallbacks.current.forEach((cb) =>
        cb({ message: 'Not connected to chat server' })
      );
    }
  }, []);

  // Subscribe to message events
  const onMessageReceived = useCallback(
    (callback: (message: SocketMessage) => void) => {
      messageCallbacks.current.add(callback);
      return () => {
        messageCallbacks.current.delete(callback);
      };
    },
    []
  );

  const onMessageSent = useCallback(
    (callback: (payload: MessageSentPayload) => void) => {
      messageSentCallbacks.current.add(callback);
      return () => {
        messageSentCallbacks.current.delete(callback);
      };
    },
    []
  );

  const onError = useCallback(
    (callback: (error: SocketErrorPayload) => void) => {
      errorCallbacks.current.add(callback);
      return () => {
        errorCallbacks.current.delete(callback);
      };
    },
    []
  );

  // Subscribe to online status events
  const onUserOnlineStatusChange = useCallback(
    (callback: (status: UserOnlineStatus) => void) => {
      userOnlineCallbacks.current.add(callback);
      return () => {
        userOnlineCallbacks.current.delete(callback);
      };
    },
    []
  );

  // Subscribe to message read receipts
  const onMessageRead = useCallback(
    (
      callback: (data: {
        messageId: string;
        connectionId: string;
        readBy: string;
      }) => void
    ) => {
      messageReadCallbacks.current.add(callback);
      return () => {
        messageReadCallbacks.current.delete(callback);
      };
    },
    []
  );

  // Mark message as read
  const markMessageAsRead = useCallback(
    (messageId: string, connectionId: string) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('mark_message_read', {
          messageId,
          connectionId,
        });
      }
    },
    []
  );

  // Reconnect manually
  const reconnect = useCallback(() => {
    if (!socketRef.current?.connected) {
      initSocket();
    }
  }, [initSocket]);

  return {
    socket: socketRef.current,
    isConnected,
    joinChat,
    sendMessage,
    onMessageReceived,
    onMessageSent,
    onError,
    onUserOnlineStatusChange,
    onMessageRead,
    markMessageAsRead,
    reconnect,
  };
};
