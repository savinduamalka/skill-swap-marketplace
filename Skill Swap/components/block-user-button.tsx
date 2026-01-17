/**
 * Block User Button Component
 *
 * Client component for blocking/unblocking users with confirmation dialog.
 *
 * @fileoverview Block/Unblock button with AlertDialog
 */
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Ban, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useWallet } from '@/contexts/wallet-context';

interface BlockUserButtonProps {
  userId: string;
  userName: string;
  isBlocked?: boolean;
}

export function BlockUserButton({
  userId,
  userName,
  isBlocked = false,
}: BlockUserButtonProps) {
  const router = useRouter();
  const { refreshWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blocked, setBlocked] = useState(isBlocked);

  const handleBlock = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to block user');
      }

      setBlocked(true);
      toast.success('User blocked', {
        description: `${userName} has been blocked. They can no longer view your profile or contact you.`,
      });

      // Refresh wallet (blocking may refund pending request credits)
      refreshWallet();

      router.refresh();
    } catch (error) {
      toast.error('Error', {
        description:
          error instanceof Error ? error.message : 'Failed to block user',
      });
    } finally {
      setIsLoading(false);
      setShowBlockDialog(false);
    }
  };

  const handleUnblock = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users/block', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unblock user');
      }

      setBlocked(false);
      toast.success('User unblocked', {
        description: `${userName} has been unblocked.`,
      });

      router.refresh();
    } catch (error) {
      toast.error('Error', {
        description:
          error instanceof Error ? error.message : 'Failed to unblock user',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (blocked) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnblock}
        disabled={isLoading}
        className="text-muted-foreground"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Unblocking...
          </>
        ) : (
          'Unblock'
        )}
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            onSelect={() => setShowBlockDialog(true)}
          >
            <Ban className="h-4 w-4 mr-2" />
            Block User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {userName}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-muted-foreground text-sm">
                <p>
                  Are you sure you want to block <strong>{userName}</strong>?
                </p>
                <p>Once blocked, this user:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Cannot view your profile</li>
                  <li>Cannot send you connection requests</li>
                  <li>Won&apos;t appear in your search results</li>
                  <li>Any pending requests will be cancelled</li>
                </ul>
                <p className="text-muted-foreground">
                  You can unblock them later from your Connections page.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Blocking...
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Block User
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
