'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface IncomingCall {
  connectionId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserImage?: string;
  offer: RTCSessionDescriptionInit;
  callType?: 'audio' | 'video';
  messageId?: string;
  notificationId?: string;
}

interface CallContextType {
  incomingCall: IncomingCall | null;
  setIncomingCall: (call: IncomingCall | null) => void;
  rejectIncomingCall: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  const rejectIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return (
    <CallContext.Provider
      value={{
        incomingCall,
        setIncomingCall,
        rejectIncomingCall,
      }}
    >
      {children}
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
