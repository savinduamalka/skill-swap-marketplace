/**
 * Message and Conversation Types
 * Shared types for real-time messaging
 */

export type MessageType = 'text' | 'call_missed' | 'call_declined' | 'call_ended';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string | null;
  senderImage: string | null;
  createdAt: Date | string;
  isRead: boolean;
  isOwn: boolean;
  messageType?: MessageType;
  callDuration?: number; // Duration in seconds for ended calls
  callType?: 'audio' | 'video';
}

export interface Conversation {
  id: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
  lastMessage: {
    content: string;
    createdAt: Date | string;
    isRead: boolean;
    senderId: string;
  } | null;
  unreadCount: number;
  updatedAt: Date | string;
}

export interface ConversationDetails {
  id: string;
  otherUser: {
    id: string;
    name: string;
    image: string | null;
  };
}

// Socket.io event types
export interface SocketMessage {
  id: string;
  connectionId: string;
  content: string;
  senderId: string;
  receiverId: string;
  isRead: boolean;
  createdAt: string;
}

export interface SendMessagePayload {
  connectionId: string;
  content: string;
  tempId: string; // For optimistic UI updates
}

export interface MessageSentPayload {
  tempId: string;
  savedMessage: SocketMessage;
}

export interface SocketErrorPayload {
  message: string;
}
