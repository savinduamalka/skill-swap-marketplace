'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';

interface WalletData {
  availableBalance: number;
  outgoingBalance: number;
  incomingBalance: number;
}

interface WalletContextType {
  wallet: WalletData | null;
  isLoading: boolean;
  error: string | null;
  refreshWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.id) {
      setWallet(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/user/wallet', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wallet');
      }

      const data = await response.json();
      setWallet(data.wallet);
    } catch (err) {
      console.error('Error fetching wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, status]);

  // Initial fetch when session is ready
  useEffect(() => {
    if (status === 'authenticated') {
      fetchWallet();
    } else if (status === 'unauthenticated') {
      setWallet(null);
      setIsLoading(false);
    }
  }, [status, fetchWallet]);

  // Refresh function that can be called from anywhere
  const refreshWallet = useCallback(async () => {
    await fetchWallet();
  }, [fetchWallet]);

  return (
    <WalletContext.Provider value={{ wallet, isLoading, error, refreshWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
