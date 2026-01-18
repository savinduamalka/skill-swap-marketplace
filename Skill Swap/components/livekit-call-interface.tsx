'use client';

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  useLocalParticipant,
} from '@livekit/components-react';
import { Button } from '@/components/ui/button';
import { X, Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { LocalParticipant } from 'livekit-client';

interface LiveKitCallInterfaceProps {
  token: string;
  roomName: string;
  userName: string;
  onClose: () => void;
  callType?: 'audio' | 'video';
}

/**
 * Media sync component - handles updating local participant media state
 */
function MediaSync({
  localParticipant,
  isMuted,
  isVideoOff,
}: {
  localParticipant: LocalParticipant | undefined;
  isMuted: boolean;
  isVideoOff: boolean;
}) {
  useEffect(() => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMuted);
    }
  }, [isMuted, localParticipant]);

  useEffect(() => {
    if (localParticipant) {
      localParticipant.setCameraEnabled(!isVideoOff);
    }
  }, [isVideoOff, localParticipant]);

  return null;
}

/**
 * Inner room content that uses the LiveKit context
 */
function RoomContent({
  isMuted,
  setIsMuted,
  isVideoOff,
  setIsVideoOff,
  callType,
  onClose,
  userName,
}: {
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  isVideoOff: boolean;
  setIsVideoOff: (val: boolean) => void;
  callType?: 'audio' | 'video';
  onClose: () => void;
  userName: string;
}) {
  const { localParticipant } = useLocalParticipant();

  return (
    <>
      <MediaSync
        localParticipant={localParticipant}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
      />

      {/* Main Container - Uses 100dvh for proper mobile height handling */}
      <div className="relative w-full h-[100dvh] bg-slate-950 overflow-hidden flex flex-col">
        {/* TOP GRADIENT OVERLAY (Header) */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-4 flex justify-between items-start pointer-events-none">
          <div className="pointer-events-auto">
            <h2 className="text-white font-semibold text-lg drop-shadow-md">
              {userName}
            </h2>
            <p className="text-white/80 text-xs drop-shadow-md flex items-center gap-1">
              {callType === 'video' ? 'Video Call' : 'Audio Call'}
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block ml-1"></span>
            </p>
          </div>

          {/* Optional: Minimize or Info button could go here */}
        </div>

        {/* VIDEO LAYER - Full Screen */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          {/* We customize the LiveKit VideoConference via CSS classes or 
              ensure it fills the parent. The default LiveKit styles might 
              need 'data-lk-theme="default"' on a parent if using their CSS, 
              but here we ensure the container is flex-1.
            */}
          <div className="w-full h-full [&>.lk-video-conference]:h-full [&>.lk-video-conference]:w-full">
            <VideoConference />
          </div>
        </div>

        {/* BOTTOM CONTROLS - Floating "Island" Style */}
        <div className="absolute bottom-0 left-0 right-0 z-30 pb-8 pt-12 px-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-end pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 flex items-center gap-4 shadow-2xl">
            {/* Toggle Mic */}
            <Button
              onClick={() => setIsMuted(!isMuted)}
              size="icon"
              className={`h-12 w-12 rounded-full transition-all duration-200 border-none ${
                isMuted
                  ? 'bg-white text-slate-900 hover:bg-slate-200'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isMuted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>

            {/* Toggle Video (Only if Video Call) */}
            {callType === 'video' && (
              <Button
                onClick={() => setIsVideoOff(!isVideoOff)}
                size="icon"
                className={`h-12 w-12 rounded-full transition-all duration-200 border-none ${
                  isVideoOff
                    ? 'bg-white text-slate-900 hover:bg-slate-200'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {isVideoOff ? (
                  <VideoOff className="h-5 w-5" />
                ) : (
                  <Video className="h-5 w-5" />
                )}
              </Button>
            )}

            {/* End Call - Distinct Red Button */}
            <Button
              onClick={onClose}
              size="icon"
              className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 text-white border-none shadow-lg scale-100 active:scale-95 transition-transform"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * LiveKit-based call interface component
 */
export function LiveKitCallInterface({
  token,
  roomName,
  userName,
  onClose,
  callType = 'video',
}: LiveKitCallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');

  if (!token) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white/70 text-sm">Securing connection...</p>
        </div>
      </div>
    );
  }

  return (
    // Fixed inset-0 ensures it sits on top of everything in your app
    <div className="fixed inset-0 z-[9999] bg-black">
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        video={!isVideoOff}
        audio={!isMuted}
        onDisconnected={onClose}
        // data-lk-theme="default" // Uncomment if you are using LiveKit's default CSS import
        style={{ height: '100%', width: '100%' }}
      >
        <RoomContent
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          isVideoOff={isVideoOff}
          setIsVideoOff={setIsVideoOff}
          callType={callType}
          onClose={onClose}
          userName={userName}
        />
      </LiveKitRoom>
    </div>
  );
}
