'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Users, Loader2, MessageSquare, Clock, X, Wallet } from 'lucide-react';

interface ConnectButtonProps {
  receiverId: string;
  receiverName: string;
  isConnected: boolean;
  hasPendingRequest: boolean;
  /** Whether the current user sent the pending request */
  isSentByCurrentUser?: boolean;
}

export function ConnectButton({
  receiverId,
  receiverName,
  isConnected,
  hasPendingRequest,
  isSentByCurrentUser = false,
}: ConnectButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'connected'>(
    isConnected ? 'connected' : hasPendingRequest ? 'pending' : 'idle'
  );
  const [pendingSentByMe, setPendingSentByMe] = useState(isSentByCurrentUser);
  const [insufficientBalanceInfo, setInsufficientBalanceInfo] = useState<{
    show: boolean;
    message: string;
  }>({ show: false, message: '' });

  const handleConnect = async () => {
    if (status !== 'idle' || isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiverId }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle insufficient balance specifically with a dialog
        if (data.error === 'Insufficient balance') {
          setInsufficientBalanceInfo({
            show: true,
            message:
              data.message ||
              'You need at least 5 credits to send a connection request.',
          });
        } else if (
          data.error ===
          'A connection request already exists between you and this user'
        ) {
          // This means there's already a pending request - update state
          setStatus('pending');
          setPendingSentByMe(true);
          toast.info('Request Already Sent', {
            description:
              'You already have a pending connection request with this user.',
          });
          router.refresh();
        } else if (response.status === 400 && data.message) {
          toast.error(data.error, {
            description: data.message,
          });
        } else {
          toast.error(data.error || 'Failed to send connection request');
        }
        return;
      }

      // Success
      setStatus('pending');
      setPendingSentByMe(true);
      toast.success('Connection request sent!', {
        description: `${receiverName} will be notified. 5 credits have been held from your wallet.`,
      });

      // Refresh the page to update any server-side data
      router.refresh();
    } catch (error) {
      // Network errors or JSON parsing errors
      toast.error('Connection Error', {
        description:
          'Unable to connect to the server. Please check your internet connection.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (isCancelling) return;

    setIsCancelling(true);

    try {
      const response = await fetch('/api/connections/cancel', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiverId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to cancel request');
        return;
      }

      // Success
      setStatus('idle');
      setPendingSentByMe(false);
      toast.success('Connection request cancelled', {
        description: `${data.creditsRefunded} credits have been refunded to your wallet.`,
      });

      // Refresh the page to update any server-side data
      router.refresh();
    } catch (error) {
      console.error('Error cancelling connection request:', error);
      toast.error('Something went wrong', {
        description: 'Please try again later.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleMessage = () => {
    // Navigate to messages with this user
    router.push(`/messages?user=${receiverId}`);
  };

  // Already connected - show Message button
  if (status === 'connected') {
    return (
      <Button onClick={handleMessage}>
        <MessageSquare className="h-4 w-4 mr-2" />
        Message
      </Button>
    );
  }

  // Pending request sent by current user - show Cancel option
  if (status === 'pending' && pendingSentByMe) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="secondary" disabled={isCancelling}>
            {isCancelling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Request Sent
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Connection Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your connection request to{' '}
              <span className="font-medium text-foreground">
                {receiverName}
              </span>
              ?
              <br />
              <br />
              The 5 credits held for this request will be refunded to your
              wallet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelRequest}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Pending request from the other user - just show pending status
  if (status === 'pending') {
    return (
      <Button variant="secondary" disabled className="cursor-not-allowed">
        <Clock className="h-4 w-4 mr-2" />
        Request Pending
      </Button>
    );
  }

  // Not connected - show Connect button with insufficient balance dialog
  return (
    <>
      <Button onClick={handleConnect} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Users className="h-4 w-4 mr-2" />
            Connect
          </>
        )}
      </Button>

      {/* Insufficient Balance Alert Dialog */}
      <AlertDialog
        open={insufficientBalanceInfo.show}
        onOpenChange={(open) =>
          setInsufficientBalanceInfo((prev) => ({ ...prev, show: open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-destructive" />
              Insufficient Credits
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {insufficientBalanceInfo.message}
              <br />
              <br />
              <span className="text-muted-foreground">
                You can earn credits by teaching skills to other users or by
                having your connection requests accepted.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
