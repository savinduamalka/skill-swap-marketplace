'use client';

import '@livekit/components-styles';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';

interface PrebuiltVideoCallProps {
  token: string;
  serverUrl?: string;
  onClose?: () => void;
}

export default function PrebuiltVideoCall({
  token,
  serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!,
  onClose,
}: PrebuiltVideoCallProps) {
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
        video
        audio
        token={token}
        serverUrl={serverUrl}
        connect
        data-lk-theme="default"
        style={{ height: '100dvh', width: '100vw' }}
        onDisconnected={onClose}
      >
        <div className="h-[100dvh] w-full [&_.lk-control-bar]:pb-[env(safe-area-inset-bottom,8px)] [&_.lk-control-bar]:gap-2 [&_.lk-control-bar]:flex-wrap [&_.lk-control-bar]:justify-center">
          <VideoConference />
        </div>
      </LiveKitRoom>
    </div>
  );
}
