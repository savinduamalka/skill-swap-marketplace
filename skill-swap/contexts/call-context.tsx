'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Phone, PhoneOff, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

interface IncomingCall {
  connectionId: string;
  roomName: string;
  callerId: string;
  callerName: string;
  callerImage?: string | null;
  callType: 'audio' | 'video';
  timestamp?: Date;
}

interface CallContextType {
  incomingCall: IncomingCall | null;
  isConnectedToSocket: boolean;
  setIncomingCall: (call: IncomingCall | null) => void;
  acceptCall: () => void;
  rejectCall: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isConnectedToSocket, setIsConnectedToSocket] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Initialize socket connection for call notifications
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    const userId = (session.user as any).id;

    // Create socket connection for global call notifications
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('📞 Global call socket connected');
      setIsConnectedToSocket(true);
      // Register user for receiving calls globally
      socket.emit('user:register', { userId });
    });

    socket.on('disconnect', () => {
      console.log('📞 Global call socket disconnected');
      setIsConnectedToSocket(false);
    });

    // Listen for incoming calls globally
    socket.on('call:incoming', (data: {
      callerId: string;
      callerName?: string;
      callerImage?: string | null;
      connectionId: string;
      callType?: 'audio' | 'video';
      roomName?: string;
      timestamp?: Date;
    }) => {
      console.log('📞 Incoming call received globally:', data);
      
      // Set incoming call data
      setIncomingCall({
        connectionId: data.connectionId,
        roomName: data.roomName || data.connectionId,
        callerId: data.callerId,
        callerName: data.callerName || 'Unknown',
        callerImage: data.callerImage,
        callType: data.callType || 'video',
        timestamp: data.timestamp,
      });

      // Show toast notification
      toast.info(`${data.callType === 'audio' ? '📞' : '📹'} Incoming ${data.callType || 'video'} call`, {
        description: `${data.callerName || 'Someone'} is calling you`,
        duration: 30000, // 30 seconds
      });
    });

    // Listen for call rejection (caller cancelled)
    socket.on('call:rejected', (data) => {
      console.log('📞 Call rejected/cancelled:', data);
      setIncomingCall(null);
    });

    // Listen for call ended
    socket.on('call:ended', (data) => {
      console.log('📞 Call ended:', data);
      setIncomingCall(null);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session?.user, status]);

  // Accept incoming call - navigate to messages with the conversation
  const acceptCall = useCallback(() => {
    if (!incomingCall || !socketRef.current) return;

    // Send call answer via socket
    socketRef.current.emit('call:answer', {
      callerId: incomingCall.callerId,
      connectionId: incomingCall.connectionId,
    });

    // Navigate to messages page with the conversation selected
    router.push(`/messages?conversation=${incomingCall.connectionId}&answer=true&roomName=${incomingCall.roomName}&callType=${incomingCall.callType}`);
    
    setIncomingCall(null);
  }, [incomingCall, router]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (!incomingCall || !socketRef.current) return;

    // Emit rejection to caller
    socketRef.current.emit('call:reject', {
      callerId: incomingCall.callerId,
      connectionId: incomingCall.connectionId,
    });

    setIncomingCall(null);
    
    toast.info('Call declined');
  }, [incomingCall]);

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        isConnectedToSocket,
        setIncomingCall,
        acceptCall,
        rejectCall,
      }}
    >
      {children}
      
      {/* Global Incoming Call Overlay */}
      {incomingCall && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-background border border-border rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Close button */}
            <button
              onClick={rejectCall}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Caller info */}
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <Avatar className="w-24 h-24 border-4 border-primary/20">
                  <AvatarImage src={incomingCall.callerImage || ''} alt={incomingCall.callerName} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10">
                    {incomingCall.callerName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Pulsing ring animation */}
                <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-20" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground mb-1">
                {incomingCall.callerName}
              </h3>
              <p className="text-muted-foreground flex items-center justify-center gap-2">
                {incomingCall.callType === 'audio' ? (
                  <>
                    <Phone className="w-4 h-4" />
                    Incoming audio call...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Incoming video call...
                  </>
                )}
              </p>
            </div>

            {/* Call actions */}
            <div className="flex items-center justify-center gap-6">
              {/* Decline button */}
              <Button
                size="lg"
                variant="destructive"
                className="w-16 h-16 rounded-full p-0"
                onClick={rejectCall}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>
              
              {/* Accept button */}
              <Button
                size="lg"
                className="w-16 h-16 rounded-full p-0 bg-green-600 hover:bg-green-700"
                onClick={acceptCall}
              >
                {incomingCall.callType === 'audio' ? (
                  <Phone className="w-6 h-6" />
                ) : (
                  <Video className="w-6 h-6" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within CallProvider');
  }
  return context;
}
