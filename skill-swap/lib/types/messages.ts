/**
 * Message and Conversation Types
 * Shared types for real-time messaging
 */

export type MessageType = 'text' | 'call_missed' | 'call_declined' | 'call_ended';
export type MediaType = 'image' | 'video' | 'audio' | 'file';

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
  // Media attachments
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  mediaName?: string | null;
  mediaSize?: number | null;
  mediaThumbnail?: string | null;
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
    mediaType?: string | null;
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
  // Media attachments
  mediaUrl?: string | null;
  mediaType?: MediaType | null;
  mediaName?: string | null;
  mediaSize?: number | null;
  mediaThumbnail?: string | null;
}

export interface SendMessagePayload {
  connectionId: string;
  content: string;
  tempId: string; // For optimistic UI updates
  // Media attachments
  mediaUrl?: string;
  mediaType?: MediaType;
  mediaName?: string;
  mediaSize?: number;
  mediaThumbnail?: string;
}

export interface MessageSentPayload {
  tempId: string;
  savedMessage: SocketMessage;
}

export interface SocketErrorPayload {
  message: string;
}
