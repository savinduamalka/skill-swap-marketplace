'use client';

import '@livekit/components-styles';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRemoteParticipants,
  useLocalParticipant,
} from '@livekit/components-react';
import { Button } from '@/components/ui/button';
import { X, Mic, MicOff, Phone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AudioCallInterfaceProps {
  token: string;
  serverUrl?: string;
  onClose?: () => void;
  recipientName?: string;
  recipientImage?: string;
}

function AudioCallContent({
  onClose,
  recipientName = 'Participant',
  recipientImage,
}: {
  onClose?: () => void;
  recipientName?: string;
  recipientImage?: string;
}) {
  const [isMuted, setIsMuted] = useState(false);
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();

  // Update local participant mute state
  useEffect(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMuted);
    }
  }, [isMuted, localParticipant]);

  return (
    <div className="w-full h-full flex flex-col bg-slate-900">
      {/* Audio renderer - critical for hearing remote audio */}
      <RoomAudioRenderer />

      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <h2 className="text-white font-semibold">📞 Audio Call</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-500/10"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main content - participant info */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6 min-h-0">
        {/* Remote participant avatar */}
        <Avatar className="w-32 h-32">
          <AvatarImage src={recipientImage || ''} alt={recipientName} />
          <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {recipientName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Participant info */}
        <div className="text-center">
          <h3 className="text-white text-2xl font-semibold mb-2">
            {recipientName}
          </h3>
          <p className="text-gray-400">
            {remoteParticipants.length > 0 ? 'Connected' : 'Connecting...'}
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-800 border-t border-slate-700 px-6 py-4 flex items-center justify-center gap-4 flex-shrink-0">
        {/* Mute Button */}
        <Button
          onClick={() => setIsMuted(!isMuted)}
          className={`h-14 w-14 rounded-full transition-all ${
            isMuted
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-slate-700 hover:bg-slate-600'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>

        {/* End Call Button */}
        <Button
          onClick={onClose}
          className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 shadow-lg ring-4 ring-red-600/50 transition-all hover:ring-red-600"
          title="End Call"
        >
          <Phone className="h-8 w-8" style={{ transform: 'rotate(225deg)' }} />
        </Button>
      </div>
    </div>
  );
}

export default function AudioCallInterface({
  token,
  serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!,
  onClose,
  recipientName,
  recipientImage,
}: AudioCallInterfaceProps) {
  if (!token || !serverUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="text-center">
          <p className="text-white text-lg mb-4">
            Missing LiveKit token or URL
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <LiveKitRoom
        video={false}
        audio
        token={token}
        serverUrl={serverUrl}
        connect
        data-lk-theme="default"
        style={{ height: '100vh', width: '100vw' }}
        onDisconnected={onClose}
      >
        <AudioCallContent
          onClose={onClose}
          recipientName={recipientName}
          recipientImage={recipientImage}
        />
      </LiveKitRoom>
    </div>
  );
}
