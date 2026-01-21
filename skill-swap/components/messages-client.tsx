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

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
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
  Video,
  MoreVertical,
  Wifi,
  WifiOff,
  Check,
  CheckCheck,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useChatSocket } from '@/hooks/useChatSocket';
import { useToast } from '@/hooks/use-toast';
import { useUnreadMessages } from '@/contexts/unread-messages-context';
import PrebuiltVideoCall from '@/components/livekit-prebuilt-call';
import AudioCallInterface from '@/components/livekit-audio-call-interface';
import { LiveKitCallInterface } from '@/components/livekit-call-interface';
import { useSession } from 'next-auth/react';
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
  const [searchQuery, setSearchQuery] = useState('');
  
  // In-chat message search
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Enhanced online status tracking (with last seen)
  const [userStatusMap, setUserStatusMap] = useState<
    Map<
      string,
      {
        isOnline: boolean;
        lastSeenAt?: Date;
        connectionCount?: number;
      }
    >
  >(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { markConversationAsRead, setCurrentOpenConversation } =
    useUnreadMessages();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Check for auto-answer params from global call notification
  const autoAnswerConversation = searchParams.get('conversation');
  const shouldAutoAnswer = searchParams.get('answer') === 'true';
  const autoAnswerRoomName = searchParams.get('roomName');
  const autoAnswerCallType = searchParams.get('callType') as 'audio' | 'video' | null;

  // LiveKit call state
  const [liveKitToken, setLiveKitToken] = useState('');
  const [liveKitUrl, setLiveKitUrl] = useState('');
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callState, setCallState] = useState<
    'idle' | 'incoming' | 'calling' | 'active'
  >('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const currentRoomNameRef = useRef<string>('');
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
  } = useChatSocket();

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Handle auto-answer from global call notification
  useEffect(() => {
    const handleAutoAnswer = async () => {
      if (
        shouldAutoAnswer &&
        autoAnswerConversation &&
        autoAnswerRoomName &&
        autoAnswerCallType &&
        conversations.length > 0 &&
        !selectedConversation &&
        session?.user
      ) {
        // First, select the conversation
        await handleSelectConversation(autoAnswerConversation);

        // Generate token for the room
        try {
          const response = await fetch('/api/livekit/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomName: autoAnswerRoomName,
              userName: session.user.name || 'User',
              userId: session.user.id || 'unknown',
            }),
          });

          if (!response.ok) throw new Error('Failed to generate token');

          const { token, url } = await response.json();
          setLiveKitToken(token);
          setLiveKitUrl(url);
          currentRoomNameRef.current = autoAnswerRoomName;
          setCallType(autoAnswerCallType);
          setCallState('active');
          setCallStartTime(new Date());

          // Clear the URL params to prevent re-triggering
          router.replace('/messages', { scroll: false });

          toast({
            title: 'Call Connected',
            description: `${autoAnswerCallType === 'video' ? 'Video' : 'Audio'} call started`,
          });
        } catch (error) {
          console.error('Error auto-answering call:', error);
          toast({
            title: 'Call Failed',
            description: 'Failed to connect to the call',
            variant: 'destructive',
          });
          router.replace('/messages', { scroll: false });
        }
      }
    };

    handleAutoAnswer();
  }, [
    shouldAutoAnswer,
    autoAnswerConversation,
    autoAnswerRoomName,
    autoAnswerCallType,
    conversations,
    selectedConversation,
    session,
  ]);

  // ==================== UTILITY FUNCTIONS ====================
  /**
   * Format last seen time for display
   * Returns "Online" if currently online, otherwise "Last seen X minutes ago"
   */
  const getOnlineStatus = (userId: string): string => {
    const status = userStatusMap.get(userId);

    if (!status) {
      return 'Offline';
    }

    if (status.isOnline) {
      return 'Online';
    }

    if (status.lastSeenAt) {
      const lastSeen = new Date(status.lastSeenAt);
      const now = new Date();
      const minutesAgo = Math.floor(
        (now.getTime() - lastSeen.getTime()) / 60000
      );

      if (minutesAgo < 1) return 'Last seen just now';
      if (minutesAgo < 60) return `Last seen ${minutesAgo}m ago`;

      const hoursAgo = Math.floor(minutesAgo / 60);
      if (hoursAgo < 24) return `Last seen ${hoursAgo}h ago`;

      const daysAgo = Math.floor(hoursAgo / 24);
      if (daysAgo < 7) return `Last seen ${daysAgo}d ago`;

      return `Last seen ${lastSeen.toLocaleDateString()}`;
    }

    return 'Offline';
  };

  /**
   * Get status color and dot
   */
  const getStatusColor = (userId: string): string => {
    const status = userStatusMap.get(userId);
    return status?.isOnline ? 'bg-green-500' : 'bg-gray-400';
  };

  // ==================== IN-CHAT SEARCH LOGIC ====================
  
  // Get messages that match the search query (case-insensitive)
  const searchResults = chatSearchQuery.trim()
    ? messages.filter(
        (msg) =>
          !msg.messageType && // Exclude call events
          msg.content.toLowerCase().includes(chatSearchQuery.toLowerCase())
      )
    : [];

  // Navigate to next search result
  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    scrollToMessage(searchResults[nextIndex].id);
  };

  // Navigate to previous search result
  const goToPrevResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);
    scrollToMessage(searchResults[prevIndex].id);
  };

  // Scroll to a specific message
  const scrollToMessage = (messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief highlight animation
      element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }, 2000);
    }
  };

  // Reset search when conversation changes
  useEffect(() => {
    setChatSearchQuery('');
    setShowChatSearch(false);
    setCurrentSearchIndex(0);
    messageRefs.current.clear();
  }, [selectedConversation?.id]);

  // Reset current index when search query changes
  useEffect(() => {
    setCurrentSearchIndex(0);
    if (searchResults.length > 0) {
      scrollToMessage(searchResults[0].id);
    }
  }, [chatSearchQuery]);

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

  // Listen for online status updates (enterprise-grade tracking)
  useEffect(() => {
    const unsubscribe = onUserOnlineStatusChange((status) => {
      // Update the detailed status map
      setUserStatusMap((prev) => {
        const updated = new Map(prev);
        updated.set(status.userId, {
          isOnline: status.isOnline,
          lastSeenAt: status.lastSeenAt,
          connectionCount: status.connectionCount,
        });
        return updated;
      });

      // Also maintain the legacy onlineUsers set for backwards compatibility
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        if (status.isOnline) {
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

  // Periodically refresh the "last seen" display (every 30 seconds)
  // This updates the "last seen X minutes ago" text without re-rendering entire component
  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger a small state update to refresh the display
      setUserStatusMap((prev) => new Map(prev));
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

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
    // Inform context that this conversation is now open
    setCurrentOpenConversation(connectionId);

    // Start loading immediately
    setIsLoadingMessages(true);
    setMessages([]); // Clear previous messages

    try {
      const response = await fetch(`/api/messages/${connectionId}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to load messages');
      }

      const data = await response.json();
      // Set conversation immediately so chat window appears with skeleton
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

  // Auto-focus input when conversation is selected
  useEffect(() => {
    if (selectedConversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedConversation, messages]);

  // Helper to format call duration
  const formatCallDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Helper to add call event message to chat
  const addCallMessage = useCallback((
    type: 'call_missed' | 'call_declined' | 'call_ended',
    isOutgoing: boolean,
    duration?: number,
    callTypeUsed?: 'audio' | 'video'
  ) => {
    if (!selectedConversation || !session?.user?.id) return;

    let content = '';
    const callIcon = callTypeUsed === 'audio' ? '📞' : '📹';
    
    switch (type) {
      case 'call_missed':
        content = isOutgoing 
          ? `${callIcon} Outgoing call - No answer` 
          : `${callIcon} Missed call`;
        break;
      case 'call_declined':
        content = isOutgoing 
          ? `${callIcon} Call declined` 
          : `${callIcon} You declined the call`;
        break;
      case 'call_ended':
        content = duration 
          ? `${callIcon} Call ended • ${formatCallDuration(duration)}` 
          : `${callIcon} Call ended`;
        break;
    }

    const callMessage: Message = {
      id: `call-${Date.now()}`,
      content,
      senderId: isOutgoing ? session.user.id : selectedConversation.otherUser.id,
      senderName: isOutgoing ? 'You' : selectedConversation.otherUser.name,
      senderImage: null,
      createdAt: new Date().toISOString(),
      isRead: true,
      isOwn: isOutgoing,
      messageType: type,
      callDuration: duration,
      callType: callTypeUsed,
    };

    setMessages((prev) => [...prev, callMessage]);
    scrollToBottom();
  }, [selectedConversation, session?.user?.id]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Start call (audio or video)
  const handleStartCall = useCallback(
    async (type?: 'audio' | 'video') => {
      if (!selectedConversation) return;
      await handleStartCallInternal(type || 'video');
    },
    [selectedConversation]
  );

  // Generate LiveKit token and join room
  const generateLiveKitToken = useCallback(
    async (roomName: string) => {
      try {
        const response = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName,
            userName: session?.user?.name || 'User',
            userId: session?.user?.id || 'unknown',
          }),
        });

        if (!response.ok) throw new Error('Failed to generate token');

        const { token, url } = await response.json();
        setLiveKitToken(token);
        setLiveKitUrl(url);
        currentRoomNameRef.current = roomName;
        return { token, url };
      } catch (error) {
        console.error('Error generating token:', error);
        toast({
          title: 'Error',
          description: 'Failed to generate call token',
          variant: 'destructive',
        });
        throw error;
      }
    },
    [session, toast]
  );

  const handleStartCallInternal = useCallback(
    async (type: 'audio' | 'video') => {
      if (!selectedConversation) return;

      try {
        setCallType(type);
        const roomName = `call-${selectedConversation.id}-${Date.now()}`;

        // Generate token
        await generateLiveKitToken(roomName);

        // Notify recipient via socket server
        initiateCall({
          recipientId: selectedConversation.otherUser.id,
          callType: type,
          roomName,
        });

        setCallState('calling');
        toast({
          title: 'Calling',
          description: `Initiating ${type} call...`,
        });
      } catch (error) {
        console.error('Error starting call:', error);
        setCallState('idle');
      }
    },
    [selectedConversation, initiateCall, generateLiveKitToken, toast]
  );

  // Handle accepting incoming call
  const handleAnswerCall = useCallback(async () => {
    if (!incomingCallData) return;

    try {
      // Generate token for the same room
      await generateLiveKitToken(incomingCallData.roomName);

      // Notify caller that we accepted
      sendCallAnswer({
        callerId: incomingCallData.callerId,
        connectionId: incomingCallData.connectionId,
      });

      // Preserve the call type (audio or video) from the incoming call
      setCallType(incomingCallData.callType || 'video');
      setCallState('active');
      setCallStartTime(new Date()); // Track call start time
    } catch (error) {
      console.error('Error answering call:', error);
      setCallState('incoming');
    }
  }, [incomingCallData, generateLiveKitToken, sendCallAnswer]);

  // Handle rejecting incoming call
  const handleRejectCall = useCallback(() => {
    if (!incomingCallData) return;

    rejectCall({
      callerId: incomingCallData.callerId,
      connectionId: incomingCallData.connectionId,
    });

    // Add declined call message to chat
    addCallMessage('call_declined', false, undefined, incomingCallData.callType || 'video');

    setIncomingCallData(null);
    setCallState('idle');
    toast({
      title: 'Call Rejected',
      description: 'You rejected the call',
    });
  }, [incomingCallData, rejectCall, toast, addCallMessage]);

  // Handle ending active call
  const handleEndCall = useCallback(() => {
    // Determine the other participant (works from both 'calling' and 'active' states)
    const otherParticipantId =
      incomingCallData?.callerId || selectedConversation?.otherUser.id;

    if (otherParticipantId) {
      endCall({
        participantId: otherParticipantId,
        connectionId:
          currentRoomNameRef.current || selectedConversation?.id || '',
      });
    }

    // Calculate call duration if call was active
    let duration: number | undefined;
    if (callStartTime) {
      duration = Math.floor((new Date().getTime() - callStartTime.getTime()) / 1000);
    }

    // Add call ended message with duration
    if (callState === 'active' && duration !== undefined) {
      addCallMessage('call_ended', true, duration, callType);
    }

    setCallState('idle');
    setLiveKitToken('');
    setIncomingCallData(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallStartTime(null);
    toast({
      title: 'Call Ended',
      description: duration ? `Call duration: ${formatCallDuration(duration)}` : 'The call has been ended',
    });
  }, [incomingCallData, selectedConversation, endCall, toast, callStartTime, callState, callType, addCallMessage]);

  // Handle cancel outgoing call (no answer / missed)
  const handleCancelCall = useCallback(() => {
    if (selectedConversation) {
      // Notify the receiver that the sender is canceling the outgoing call
      rejectCall({
        callerId: selectedConversation.otherUser.id, // Notify the receiver
        connectionId: selectedConversation.id,
      });
    }

    // Add missed call message (outgoing call that wasn't answered)
    addCallMessage('call_missed', true, undefined, callType);

    setCallState('idle');
    setLiveKitToken('');
    setIsMuted(false);
    setIsVideoOff(false);
    setCallStartTime(null);
    toast({
      title: 'Call Cancelled',
      description: 'No answer',
    });
  }, [selectedConversation, rejectCall, toast, callType, addCallMessage]);

  // Listen for call acceptance (receiver accepted, sender transitions to active)
  useEffect(() => {
    const unsubscribe = onCallAnswer((data) => {
      // Sender receives acceptance from receiver
      // Transition from 'calling' to 'active' to show video interface
      setCallState('active');
      setCallStartTime(new Date()); // Track call start time for sender too
      toast({
        title: 'Call Accepted',
        description: 'Connecting to video call...',
      });
    });

    return unsubscribe;
  }, [onCallAnswer, toast]);

  // Listen for incoming calls
  useEffect(() => {
    const unsubscribe = onCallIncoming((data) => {
      // Server sends connectionId=roomName; match by caller instead
      if (selectedConversation?.otherUser.id === data.callerId) {
        setIncomingCallData(data);
        setCallState('incoming');
        toast({
          title: 'Incoming Call',
          description: `${selectedConversation?.otherUser.name ?? 'User'} is calling...`,
        });
      }
    });

    return unsubscribe;
  }, [onCallIncoming, selectedConversation, toast]);

  // Listen for call rejection
  useEffect(() => {
    const unsubscribe = onCallRejected((data) => {
      // Add declined call message when other user rejects
      addCallMessage('call_declined', true, undefined, callType);
      
      setCallState('idle');
      setLiveKitToken('');
      setIncomingCallData(null);
      setIsMuted(false);
      setIsVideoOff(false);
      setCallStartTime(null);
      toast({
        title: 'Call Declined',
        description: 'The other user declined your call',
      });
    });

    return unsubscribe;
  }, [onCallRejected, toast, addCallMessage, callType]);

  // Listen for call ending (when other party ends the call)
  useEffect(() => {
    const unsubscribe = onCallEnded((data) => {
      // Calculate call duration if we were in an active call
      let duration: number | undefined;
      if (callStartTime) {
        duration = Math.floor((new Date().getTime() - callStartTime.getTime()) / 1000);
        // Add call ended message
        addCallMessage('call_ended', false, duration, callType);
      }

      setCallState('idle');
      setLiveKitToken('');
      setIncomingCallData(null);
      setIsMuted(false);
      setIsVideoOff(false);
      setCallStartTime(null);
      
      toast({
        title: 'Call Ended',
        description: duration ? `Call duration: ${formatCallDuration(duration)}` : 'The call has been ended',
      });
    });

    return unsubscribe;
  }, [onCallEnded, callStartTime, callType, addCallMessage, toast]);

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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversation Items */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {conversations
                .filter((conv) =>
                  searchQuery.trim() === ''
                    ? true
                    : conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
                )
                .map((conv) => (
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
                    <Avatar className="w-12 h-12 shrink-0 relative">
                      <AvatarImage
                        src={conv.user.image || ''}
                        alt={conv.user.name}
                      />
                      <AvatarFallback className="text-sm font-bold">
                        {getInitials(conv.user.name)}
                      </AvatarFallback>
                      {/* Online indicator in conversation list */}
                      <div
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${getStatusColor(
                          conv.user.id
                        )} rounded-full border border-white transition-colors duration-300`}
                      ></div>
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
                <Link 
                  href={`/profile/${selectedConversation.otherUser.id}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <Avatar className="w-12 h-12 relative">
                    <AvatarImage
                      src={selectedConversation.otherUser.image || ''}
                      alt={selectedConversation.otherUser.name}
                    />
                    <AvatarFallback className="text-sm font-bold">
                      {getInitials(selectedConversation.otherUser.name)}
                    </AvatarFallback>
                    {/* Online indicator with color based on status */}
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(
                        selectedConversation.otherUser.id
                      )} rounded-full border-2 border-white transition-colors duration-300`}
                    ></div>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground hover:underline">
                      {selectedConversation.otherUser.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {userStatusMap.get(selectedConversation.otherUser.id)
                        ?.isOnline ? (
                        <span className="text-green-500 font-medium">
                          🟢 Online
                        </span>
                      ) : (
                        <span className="text-gray-500">
                          {getOnlineStatus(selectedConversation.otherUser.id)}
                        </span>
                      )}
                    </p>
                  </div>
                </Link>
                <div className="flex gap-2">
                  {/* Audio call */}
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Start audio call"
                    onClick={() => handleStartCall('audio')}
                    disabled={
                      callState !== 'idle' ||
                      !onlineUsers.has(selectedConversation.otherUser.id)
                    }
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                  {/* Video call */}
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Start video call"
                    onClick={() => handleStartCall('video')}
                    disabled={
                      callState !== 'idle' ||
                      !onlineUsers.has(selectedConversation.otherUser.id)
                    }
                  >
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title="More options">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                  {/* Search in chat */}
                  <Button
                    size="icon"
                    variant={showChatSearch ? 'default' : 'ghost'}
                    title="Search in chat"
                    onClick={() => setShowChatSearch(!showChatSearch)}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* In-Chat Search Bar */}
              {showChatSearch && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="Search messages..."
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    className="flex-1 h-8"
                    autoFocus
                  />
                  {chatSearchQuery && (
                    <>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {searchResults.length > 0
                          ? `${currentSearchIndex + 1} of ${searchResults.length}`
                          : 'No results'}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={goToPrevResult}
                          disabled={searchResults.length === 0}
                          title="Previous result"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={goToNextResult}
                          disabled={searchResults.length === 0}
                          title="Next result"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      setShowChatSearch(false);
                      setChatSearchQuery('');
                    }}
                    title="Close search"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="space-y-4">
                    {/* Skeleton messages */}
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                      >
                        <Skeleton
                          className={`${
                            i % 2 === 0 ? 'w-48' : 'w-64'
                          } h-16 rounded-lg`}
                        />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSearchMatch = chatSearchQuery.trim() && 
                      !msg.messageType && 
                      msg.content.toLowerCase().includes(chatSearchQuery.toLowerCase());
                    const isCurrentSearchResult = searchResults[currentSearchIndex]?.id === msg.id;
                    
                    // Highlight matching text in message
                    const highlightText = (text: string) => {
                      if (!chatSearchQuery.trim() || !isSearchMatch) return text;
                      const regex = new RegExp(`(${chatSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                      const parts = text.split(regex);
                      return parts.map((part, i) =>
                        regex.test(part) ? (
                          <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 text-foreground rounded px-0.5">
                            {part}
                          </mark>
                        ) : (
                          part
                        )
                      );
                    };

                    return (
                      <div
                        key={msg.id}
                        ref={(el) => {
                          if (el && !msg.messageType) {
                            messageRefs.current.set(msg.id, el);
                          }
                        }}
                        className={`flex transition-all duration-300 ${
                          msg.messageType ? 'justify-center' : msg.isOwn ? 'justify-end' : 'justify-start'
                        } ${isCurrentSearchResult ? 'scale-[1.02]' : ''}`}
                      >
                        {/* Call event messages - centered with special styling */}
                        {msg.messageType ? (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-muted-foreground text-sm">
                            <span>{msg.content}</span>
                            <span className="text-xs opacity-75">
                              {formatDistanceToNow(new Date(msg.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        ) : (
                          /* Regular text messages */
                          <div
                            className={`max-w-xs px-4 py-2 rounded-lg transition-all duration-300 ${
                              msg.isOwn
                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                : 'bg-muted text-foreground rounded-bl-none'
                            } ${isSearchMatch ? 'ring-2 ring-yellow-400 dark:ring-yellow-500' : ''} ${
                              isCurrentSearchResult ? 'ring-2 ring-primary shadow-lg' : ''
                            }`}
                          >
                            <p className="text-sm">{highlightText(msg.content)}</p>
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
                      )}
                    </div>
                  );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!isConnected || isSending}
                  autoFocus
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

      {/* Audio Call Interface - Active Audio Call */}
      {callState === 'active' && callType === 'audio' && liveKitToken && (
        <AudioCallInterface
          token={liveKitToken}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          onClose={handleEndCall}
          recipientName={selectedConversation?.otherUser.name}
          recipientImage={selectedConversation?.otherUser.image || undefined}
        />
      )}

      {/* LiveKit Prebuilt Conference - Active Video Call */}
      {callState === 'active' && callType === 'video' && liveKitToken && (
        <PrebuiltVideoCall
          token={liveKitToken}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          onClose={handleEndCall}
        />
      )}

      {/* Outgoing Call - Ringing State */}
      {callState === 'calling' && selectedConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center space-y-6">
            <div>
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage
                  src={selectedConversation.otherUser.image || ''}
                  alt={selectedConversation.otherUser.name}
                />
                <AvatarFallback>
                  {getInitials(selectedConversation.otherUser.name)}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-white text-2xl font-bold mb-2">
                {selectedConversation.otherUser.name}
              </h3>
              <p className="text-gray-300 text-lg">
                {callType === 'video' ? '📹 Video Call' : '📞 Audio Call'}
              </p>
              <p className="text-gray-400 text-sm mt-2">Ringing...</p>
            </div>

            <Button
              onClick={handleCancelCall}
              className="w-32 h-14 rounded-full bg-red-600 hover:bg-red-700 shadow-lg ring-4 ring-red-600/50"
            >
              <X className="w-6 h-6 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Incoming Call Notification */}
      {callState === 'incoming' && incomingCallData && selectedConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center space-y-6">
            <div>
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage
                  src={selectedConversation.otherUser.image || ''}
                  alt={selectedConversation.otherUser.name}
                />
                <AvatarFallback>
                  {getInitials(selectedConversation.otherUser.name)}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-white text-2xl font-bold mb-2">
                {selectedConversation.otherUser.name}
              </h3>
              <p className="text-gray-300 text-lg">
                {incomingCallData.callType === 'video'
                  ? '📹 Video Call'
                  : '📞 Audio Call'}
              </p>
              <p className="text-gray-400 text-sm mt-2">Incoming call...</p>
            </div>

            <div className="flex gap-4 justify-center">
              <Button
                onClick={handleAnswerCall}
                className="h-14 px-8 rounded-full bg-green-600 hover:bg-green-700 shadow-lg"
              >
                <Phone className="w-5 h-5 mr-2" />
                Answer
              </Button>
              <Button
                onClick={handleRejectCall}
                className="h-14 px-8 rounded-full bg-red-600 hover:bg-red-700 shadow-lg"
              >
                <X className="w-5 h-5 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
    </>
  );
}
