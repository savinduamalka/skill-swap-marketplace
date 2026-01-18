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
} from '@/components/ui/alert-dialog';
import { Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@/contexts/wallet-context';

interface ConnectionRequestActionsProps {
  requestId: string;
  senderName: string;
  creditsHeld: number;
}

export function ConnectionRequestActions({
  requestId,
  senderName,
  creditsHeld,
}: ConnectionRequestActionsProps) {
  const router = useRouter();
  const { refreshWallet } = useWallet();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const response = await fetch('/api/connections/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept connection');
      }

      toast.success('Connection accepted!', {
        description: `You are now connected with ${senderName}. +${creditsHeld} credits received!`,
      });

      // Refresh wallet balance immediately (credits received)
      refreshWallet();

      router.refresh();
    } catch (error) {
      toast.error('Error', {
        description:
          error instanceof Error
            ? error.message
            : 'Failed to accept connection',
      });
    } finally {
      setIsAccepting(false);
      setShowAcceptDialog(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      const response = await fetch('/api/connections/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline connection');
      }

      toast.success('Request declined', {
        description: `Connection request from ${senderName} has been declined.`,
      });

      router.refresh();
    } catch (error) {
      toast.error('Error', {
        description:
          error instanceof Error
            ? error.message
            : 'Failed to decline connection',
      });
    } finally {
      setIsDeclining(false);
      setShowDeclineDialog(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => setShowAcceptDialog(true)}
          disabled={isAccepting || isDeclining}
          className="bg-green-600 hover:bg-green-700"
          title="Accept connection"
        >
          {isAccepting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowDeclineDialog(true)}
          disabled={isAccepting || isDeclining}
          className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          title="Decline connection"
        >
          {isDeclining ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Accept Confirmation Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Connection Request?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-muted-foreground text-sm">
                <p>
                  You&apos;re about to accept the connection request from{' '}
                  <strong>{senderName}</strong>.
                </p>
                <p className="text-green-600 font-medium">
                  You will receive {creditsHeld} credits!
                </p>
                <p className="text-muted-foreground">
                  Once connected, you&apos;ll be able to message each other and
                  schedule skill exchange sessions.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAccepting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAccept}
              disabled={isAccepting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Accept & Receive {creditsHeld} Credits
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decline Confirmation Dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Connection Request?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-muted-foreground text-sm">
                <p>
                  Are you sure you want to decline the connection request from{' '}
                  <strong>{senderName}</strong>?
                </p>
                <p className="text-muted-foreground">
                  The {creditsHeld} credits they paid will be refunded to them.
                  They may send another request in the future.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeclining}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              disabled={isDeclining}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeclining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Declining...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Decline Request
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
