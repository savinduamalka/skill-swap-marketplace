/**
 * Messages Client Component
 *
 * Real-time messaging interface for skill exchange conversations.
 * Displays conversation list with online indicators and provides
 * a chat window with message history and input.
 *
 * @fileoverview Client-side messaging UI with Socket.IO integration
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Send,
  Search,
  Phone,
  MoreVertical,
  Wifi,
  WifiOff,
  Check,
  CheckCheck,
} from 'lucide-react';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useToast } from '@/hooks/use-toast';
import { useUnreadMessages } from '@/contexts/unread-messages-context';
import type {
  Conversation,
  Message,
  ConversationDetails,
} from '@/lib/types/messages';

export function MessagesClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { markConversationAsRead, setCurrentOpenConversation } =
    useUnreadMessages();

  // Socket.IO integration
  const {
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
  } = useChatSocket();

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Listen for incoming messages
  useEffect(() => {
    const unsubscribe = onMessageReceived((socketMessage) => {
      // Check if this message belongs to the current conversation
      if (selectedConversation?.id === socketMessage.connectionId) {
        // Add message to the list, avoiding duplicates
        const newMessage: Message = {
          id: socketMessage.id,
          content: socketMessage.content,
          senderId: socketMessage.senderId,
          senderName: selectedConversation.otherUser.name,
          senderImage: selectedConversation.otherUser.image,
          createdAt: socketMessage.createdAt,
          isRead: socketMessage.isRead,
          isOwn: false,
        };

        setMessages((prev) => {
          // Check if message already exists
          const exists = prev.some((msg) => msg.id === socketMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });

        // Automatically mark message as read
        markMessageAsRead(socketMessage.id, socketMessage.connectionId);
        scrollToBottom();
      } else {
        // Update unread count for the conversation
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === socketMessage.connectionId
              ? { ...conv, unreadCount: conv.unreadCount + 1 }
              : conv
          )
        );
      }
    });

    return unsubscribe;
  }, [onMessageReceived, selectedConversation, markMessageAsRead]);

  // Listen for message sent confirmation
  useEffect(() => {
    const unsubscribe = onMessageSent(({ tempId, savedMessage }) => {
      // Replace temp message with saved message (or remove temp if saved already exists)
      setMessages((prev) => {
        // Check if saved message already exists
        const savedExists = prev.some((msg) => msg.id === savedMessage.id);
        if (savedExists) {
          // Remove only the temp message if saved version exists
          return prev.filter((msg) => msg.id !== tempId);
        }
        // Otherwise, replace temp with saved
        return prev.map((msg) =>
          msg.id === tempId
            ? {
                ...msg,
                id: savedMessage.id,
                createdAt: savedMessage.createdAt,
              }
            : msg
        );
      });
      setIsSending(false);
    });

    return unsubscribe;
  }, [onMessageSent]);

  // Listen for socket errors
  useEffect(() => {
    const unsubscribe = onError((error) => {
      toast({
        title: 'Connection Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsSending(false);
    });

    return unsubscribe;
  }, [onError, toast]);

  // Listen for online status updates
  useEffect(() => {
    const unsubscribe = onUserOnlineStatusChange((status) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        if (status.online) {
          updated.add(status.userId);
        } else {
          updated.delete(status.userId);
        }
        return updated;
      });
    });

    return unsubscribe;
  }, [onUserOnlineStatusChange]);

  // Listen for message read receipts
  useEffect(() => {
    const unsubscribe = onMessageRead((data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, isRead: true } : msg
        )
      );
    });

    return unsubscribe;
  }, [onMessageRead]);

  // Join chat room when conversation is selected
  useEffect(() => {
    if (selectedConversation?.id && isConnected) {
      joinChat(selectedConversation.id);
    }
  }, [selectedConversation, isConnected, joinChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup: Reset current open conversation when component unmounts
  useEffect(() => {
    return () => {
      setCurrentOpenConversation(null);
    };
  }, [setCurrentOpenConversation]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
        // Don't auto-select first conversation - let user choose
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const handleSelectConversation = async (connectionId: string) => {
    setIsLoadingMessages(true);

    // Inform context that this conversation is now open
    setCurrentOpenConversation(connectionId);

    try {
      const response = await fetch(`/api/messages/${connectionId}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to load messages');
      }

      const data = await response.json();
      setSelectedConversation(data.connection);
      setMessages(data.messages);

      // Mark this conversation as read in the unread context
      markConversationAsRead(connectionId);

      // Reset unread count for this conversation in local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === connectionId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation || isSending) return;

    const tempId = `temp-${Date.now()}`;
    const content = messageInput.trim();

    // Optimistic UI update
    const tempMessage: Message = {
      id: tempId,
      content,
      senderId: 'current-user',
      senderName: 'You',
      senderImage: null,
      createdAt: new Date().toISOString(),
      isRead: false,
      isOwn: true,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setMessageInput('');
    setIsSending(true);

    // Send via socket
    sendMessage({
      connectionId: selectedConversation.id,
      content,
      tempId,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoadingConversations) {
    return (
      <>
        <Header />
        <main className="pb-20 md:pb-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-200px)]">
            <Card className="p-8 h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Skeleton className="h-12 w-48 mx-auto" />
                <Skeleton className="h-4 w-32 mx-auto" />
              </div>
            </Card>
          </div>
        </main>
        <MobileNav />
      </>
    );
  }

  if (conversations.length === 0) {
    return (
      <>
        <Header />
        <main className="pb-20 md:pb-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-200px)]">
            <Card className="p-8 h-full flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">
                  No Conversations Yet
                </h2>
                <p className="text-muted-foreground">
                  Connect with other users to start messaging!
                </p>
              </div>
            </Card>
          </div>
        </main>
        <MobileNav />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-200px)] flex flex-col md:flex-row gap-6">
          {/* Conversation List Sidebar */}
          <div className="hidden md:flex flex-col w-80 border-r border-border">
            {/* Connection Status */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Messages</h2>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Badge variant="default" className="bg-green-500">
                    <Wifi className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge
                    variant="destructive"
                    onClick={reconnect}
                    className="cursor-pointer"
                  >
                    <WifiOff className="w-3 h-3 mr-1" />
                    Offline
                  </Badge>
                )}
              </div>
            </div>

            {/* Search Conversations */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10"
                />
              </div>
            </div>

            {/* Conversation Items */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {conversations.map((conv) => (
                <Card
                  key={conv.id}
                  className={`p-4 cursor-pointer hover:bg-muted transition ${
                    selectedConversation?.id === conv.id
                      ? 'bg-primary/10 border-primary'
                      : ''
                  }`}
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage
                        src={conv.user.image || ''}
                        alt={conv.user.name}
                      />
                      <AvatarFallback className="text-sm font-bold">
                        {getInitials(conv.user.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-foreground">
                          {conv.user.name}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="destructive">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {conv.lastMessage && (
                        <>
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage.content}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(conv.lastMessage.createdAt),
                              {
                                addSuffix: true,
                              }
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Chat Window */}
          {selectedConversation && (
            <div className="flex-1 flex flex-col md:border-l md:border-border">
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 relative">
                    <AvatarImage
                      src={selectedConversation.otherUser.image || ''}
                      alt={selectedConversation.otherUser.name}
                    />
                    <AvatarFallback className="text-sm font-bold">
                      {getInitials(selectedConversation.otherUser.name)}
                    </AvatarFallback>
                    {/* Online indicator */}
                    {onlineUsers.has(selectedConversation.otherUser.id) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">
                      {selectedConversation.otherUser.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {onlineUsers.has(selectedConversation.otherUser.id) ? (
                        <span className="text-green-500 font-medium">
                          Online
                        </span>
                      ) : (
                        'Offline'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" title="Start call">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="More options">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-12 w-48" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.isOwn ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-lg ${
                          msg.isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-muted text-foreground rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <p
                            className={`text-xs ${
                              msg.isOwn ? 'opacity-75' : 'text-muted-foreground'
                            }`}
                          >
                            {formatDistanceToNow(new Date(msg.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                          {msg.isOwn &&
                            (msg.isRead ? (
                              <CheckCheck className="w-3 h-3 opacity-75" />
                            ) : (
                              <Check className="w-3 h-3 opacity-75" />
                            ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!isConnected || isSending}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || !isConnected || isSending}
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <MobileNav />
    </>
  );
}
