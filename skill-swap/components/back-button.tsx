'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallbackHref?: string;
  fallbackLabel?: string;
}

export function BackButton({
  fallbackHref = '/search',
  fallbackLabel = 'Back',
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Check if there's history to go back to
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      // Fallback to default route
      router.push(fallbackHref);
    }
  };

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
    >
      <ArrowLeft className="h-4 w-4 mr-1" />
      {fallbackLabel}
    </button>
  );
}
