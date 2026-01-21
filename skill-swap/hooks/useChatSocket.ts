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

// ==================== HEARTBEAT CONFIGURATION ====================
// Send heartbeat every 30 seconds (matching server interval)
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
// Auto-retry connection with exponential backoff
const INITIAL_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 10; // Try up to 10 times

export type UserOnlineStatus = {
  userId: string;
  isOnline: boolean;
  lastSeenAt?: Date;
  timestamp?: Date;
};

export type UserOnlineStatusDetail = UserOnlineStatus & {
  connectionCount?: number;
};

export const useChatSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatTime = useRef<number>(Date.now());

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
  const userOnlineCallbacks = useRef<
    Set<(status: UserOnlineStatusDetail) => void>
  >(new Set());
  const messageReadCallbacks = useRef<
    Set<
      (data: {
        messageId: string;
        connectionId: string;
        readBy: string;
      }) => void
    >
  >(new Set());
  const callIncomingCallbacks = useRef<
    Set<
      (data: {
        callerId: string;
        callerName?: string;
        callerImage?: string | null;
        connectionId: string; // roomName
        callType?: 'audio' | 'video';
        roomName?: string;
        timestamp?: Date;
      }) => void
    >
  >(new Set());
  const callAnswerCallbacks = useRef<
    Set<
      (data: {
        participantId: string;
        connectionId: string;
        timestamp?: Date;
      }) => void
    >
  >(new Set());
  const callIceCandidateCallbacks = useRef<
    Set<
      (data: {
        from: string;
        connectionId: string;
        candidate: RTCIceCandidateInit;
      }) => void
    >
  >(new Set());
  const callRejectedCallbacks = useRef<
    Set<(data: { from: string; connectionId: string }) => void>
  >(new Set());
  const callEndedCallbacks = useRef<
    Set<(data: { from: string; connectionId: string }) => void>
  >(new Set());

  // ==================== HEARTBEAT MANAGEMENT ====================
  // Send periodic heartbeat to server (keeps connection alive)
  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) return; // Already running

    heartbeatInterval.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('heartbeat');
        lastHeartbeatTime.current = Date.now();
        // Uncomment for debugging: console.log('💓 Heartbeat sent');
      }
    }, HEARTBEAT_INTERVAL);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    // Calculate exponential backoff: 1s, 2s, 4s, 8s, etc. (max 5s)
    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current),
      MAX_RECONNECT_DELAY
    );

    console.log(
      `📍 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${MAX_RECONNECT_ATTEMPTS})`
    );

    reconnectTimeout.current = setTimeout(() => {
      if (!socketRef.current?.connected) {
        socketRef.current?.connect();
      }
    }, delay);
  }, []);

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

      // 2. Connect to Microservice with advanced reconnection options
      socketRef.current = io(SOCKET_URL, {
        auth: { token: data.token },
        reconnection: true,
        reconnectionDelay: INITIAL_RECONNECT_DELAY,
        reconnectionDelayMax: MAX_RECONNECT_DELAY,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        transports: ['websocket', 'polling'], // Fallback to polling if WebSocket fails
      });

      // Connection events
      socketRef.current.on('connect', () => {
        console.log('✓ Socket connected successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        lastHeartbeatTime.current = Date.now();

        // Start heartbeat when connected
        startHeartbeat();

        // Notify callbacks that we're reconnected
        userOnlineCallbacks.current.forEach((cb) =>
          cb({
            userId: 'self',
            isOnline: true,
            timestamp: new Date(),
          })
        );
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('✗ Socket disconnected:', reason);
        setIsConnected(false);
        stopHeartbeat();

        // Auto-reconnect with exponential backoff
        if (reason === 'io server disconnect') {
          // Server explicitly disconnected, don't auto-reconnect
          return;
        }

        // For other reasons (network issues), attempt reconnection
        scheduleReconnect();
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('⚠️  Socket connection error:', error);
        setIsConnected(false);
        reconnectAttempts.current += 1;

        // If max attempts reached, show error
        if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
          errorCallbacks.current.forEach((cb) =>
            cb({
              message:
                'Lost connection to chat server. Please refresh the page.',
            })
          );
        }
      });

      // Message events
      socketRef.current.on('receive_message', (message: SocketMessage) => {
        console.log('[SOCKET] receive_message:', message);
        messageCallbacks.current.forEach((cb) => cb(message));
      });

      socketRef.current.on('message_sent', (payload: MessageSentPayload) => {
        console.log('[SOCKET] message_sent:', payload);
        messageSentCallbacks.current.forEach((cb) => cb(payload));
      });

      socketRef.current.on('error', (error: SocketErrorPayload) => {
        console.error('[SOCKET] error:', error);
        errorCallbacks.current.forEach((cb) => cb(error));
      });

      // User online/offline status events (enterprise-grade tracking)
      socketRef.current.on(
        'user_online_status',
        (data: {
          userId: string;
          isOnline: boolean;
          lastSeenAt?: Date;
          timestamp?: Date;
        }) => {
          userOnlineCallbacks.current.forEach((cb) =>
            cb({
              userId: data.userId,
              isOnline: data.isOnline,
              lastSeenAt: data.lastSeenAt,
              timestamp: data.timestamp,
            })
          );
        }
      );

      socketRef.current.on(
        'user_offline_status',
        (data: {
          userId: string;
          isOnline: boolean;
          lastSeenAt?: Date;
          timestamp?: Date;
        }) => {
          userOnlineCallbacks.current.forEach((cb) =>
            cb({
              userId: data.userId,
              isOnline: data.isOnline,
              lastSeenAt: data.lastSeenAt,
              timestamp: data.timestamp,
            })
          );
        }
      );

      // Legacy events (for backwards compatibility)
      socketRef.current.on('user_online', (data: { userId: string }) => {
        userOnlineCallbacks.current.forEach((cb) =>
          cb({ userId: data.userId, isOnline: true })
        );
      });

      socketRef.current.on('user_offline', (data: { userId: string }) => {
        userOnlineCallbacks.current.forEach((cb) =>
          cb({ userId: data.userId, isOnline: false })
        );
      });

      // Message read receipt event
      socketRef.current.on(
        'message_read',
        (data: { messageId: string; connectionId: string; readBy: string }) => {
          messageReadCallbacks.current.forEach((cb) => cb(data));
        }
      );

      // Call signaling events
      socketRef.current.on(
        'call:incoming',
        (data: {
          callerId: string;
          callerName?: string;
          callerImage?: string | null;
          callType?: 'audio' | 'video';
          roomName?: string;
          connectionId: string;
          timestamp?: Date;
        }) => {
          callIncomingCallbacks.current.forEach((cb) => cb(data));
        }
      );

      socketRef.current.on(
        'call:accepted',
        (data: {
          participantId: string;
          connectionId: string;
          timestamp?: Date;
        }) => {
          callAnswerCallbacks.current.forEach((cb) => cb(data));
        }
      );

      socketRef.current.on(
        'call:ice-candidate',
        (data: {
          from: string;
          connectionId: string;
          candidate: RTCIceCandidateInit;
        }) => {
          callIceCandidateCallbacks.current.forEach((cb) => cb(data));
        }
      );

      socketRef.current.on(
        'call:rejected',
        (data: { from: string; connectionId: string }) => {
          callRejectedCallbacks.current.forEach((cb) => cb(data));
        }
      );

      socketRef.current.on(
        'call:ended',
        (data: { from: string; connectionId: string }) => {
          callEndedCallbacks.current.forEach((cb) => cb(data));
        }
      );
    } catch (err) {
      console.error('Socket Init Error', err);
    }
  }, []);

  useEffect(() => {
    initSocket();

    return () => {
      // Cleanup on unmount
      stopHeartbeat();
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
    };
  }, [initSocket, stopHeartbeat]);

  // Join a specific conversation room
  const joinChat = useCallback((connectionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_chat', connectionId);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback((payload: SendMessagePayload) => {
    console.log('[SOCKET] sendMessage called:', payload);
    console.log('[SOCKET] isConnected:', socketRef.current?.connected);
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', payload);
      console.log('[SOCKET] send_message emitted');
    } else {
      console.error('[SOCKET] Not connected to chat server');
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

  // Subscribe to online status events (with detailed info)
  const onUserOnlineStatusChange = useCallback(
    (callback: (status: UserOnlineStatusDetail) => void) => {
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

  // Subscribe to call events
  const onCallIncoming = useCallback((callback: (data: any) => void) => {
    callIncomingCallbacks.current.add(callback);
    return () => {
      callIncomingCallbacks.current.delete(callback);
    };
  }, []);

  const onCallAnswer = useCallback((callback: (data: any) => void) => {
    callAnswerCallbacks.current.add(callback);
    return () => {
      callAnswerCallbacks.current.delete(callback);
    };
  }, []);

  const onCallIceCandidate = useCallback(
    (
      callback: (data: {
        from: string;
        connectionId: string;
        candidate: RTCIceCandidateInit;
      }) => void
    ) => {
      callIceCandidateCallbacks.current.add(callback);
      return () => {
        callIceCandidateCallbacks.current.delete(callback);
      };
    },
    []
  );

  const onCallRejected = useCallback(
    (callback: (data: { from: string; connectionId: string }) => void) => {
      callRejectedCallbacks.current.add(callback);
      return () => {
        callRejectedCallbacks.current.delete(callback);
      };
    },
    []
  );

  const onCallEnded = useCallback(
    (callback: (data: { from: string; connectionId: string }) => void) => {
      callEndedCallbacks.current.add(callback);
      return () => {
        callEndedCallbacks.current.delete(callback);
      };
    },
    []
  );

  // Emit call events
  const initiateCall = useCallback(
    (payload: {
      recipientId: string;
      callType: 'audio' | 'video';
      roomName: string;
    }) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('call:initiate', payload);
      }
    },
    []
  );

  const sendCallAnswer = useCallback(
    (payload: { callerId: string; connectionId: string }) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('call:answer', payload);
      }
    },
    []
  );

  const sendIceCandidate = useCallback(
    (payload: {
      to: string;
      connectionId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('call:ice-candidate', payload);
      }
    },
    []
  );

  const rejectCall = useCallback(
    (payload: { callerId: string; connectionId: string }) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('call:reject', payload);
      }
    },
    []
  );

  const endCall = useCallback(
    (payload: { participantId: string; connectionId: string }) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('call:end', payload);
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
    onCallIncoming,
    onCallAnswer,
    onCallIceCandidate,
    onCallRejected,
    onCallEnded,
    initiateCall,
    sendCallAnswer,
    sendIceCandidate,
    rejectCall,
    endCall,
    reconnect,
  };
};
