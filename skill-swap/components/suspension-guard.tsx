'use client';

import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

/**
 * SuspensionGuard
 *
 * Checks if the current user's account has been suspended.
 * If suspended, forces sign-out immediately.
 *
 * This runs on every page navigation for authenticated users,
 * ensuring that even if a suspended user has a valid JWT (30-day session),
 * they get kicked out on the next page load or API interaction.
 */
export function SuspensionGuard() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;

    // Check suspension status via lightweight API call
    const checkSuspension = async () => {
      try {
        const res = await fetch('/api/auth/check-status');
        if (res.status === 403) {
          // User is suspended — force sign out
          signOut({ callbackUrl: '/login?error=ACCOUNT_SUSPENDED' });
        }
      } catch {
        // Network error — don't sign out, just skip
      }
    };

    checkSuspension();
  }, [status, session]);

  return null;
}
