'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Flag, Ban } from 'lucide-react';
import { DisconnectButton } from '@/components/connections/disconnect-button';
import { ReportUserDialog } from '@/components/report-user-dialog';
import { ConnectButton } from '@/components/connect-button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ProfileActionsProps {
  userId: string;
  userName: string;
  isConnected: boolean;
  connectionId: string | null;
  hasPendingRequest: boolean;
  isSentByCurrentUser: boolean;
  isBlocked: boolean;
}

export function ProfileActions({
  userId,
  userName,
  isConnected,
  connectionId,
  hasPendingRequest,
  isSentByCurrentUser,
  isBlocked,
}: ProfileActionsProps) {
  const [showReport, setShowReport] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const router = useRouter();

  const handleBlock = async () => {
    setIsBlocking(true);
    try {
      const response = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: isBlocked ? 'unblock' : 'block' }),
      });
      if (response.ok) {
        toast.success(isBlocked ? `Unblocked ${userName}` : `Blocked ${userName}`);
        router.refresh();
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!isBlocked && (
        <ConnectButton
          receiverId={userId}
          receiverName={userName}
          isConnected={isConnected}
          hasPendingRequest={hasPendingRequest}
          isSentByCurrentUser={isSentByCurrentUser}
        />
      )}

      {!isBlocked && isConnected && connectionId && (
        <DisconnectButton connectionId={connectionId} userName={userName} />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowReport(true)}>
            <Flag className="w-4 h-4 mr-2" />
            Report User
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleBlock} disabled={isBlocking} className="text-destructive">
            <Ban className="w-4 h-4 mr-2" />
            {isBlocked ? 'Unblock User' : 'Block User'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportUserDialog
        open={showReport}
        onOpenChange={setShowReport}
        userId={userId}
        userName={userName}
        onBlockUser={handleBlock}
      />
    </div>
  );
}
