'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check } from 'lucide-react';

interface PostShareProps {
  postId: string;
  postTitle?: string;
}

export function PostShare({ postId }: PostShareProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/newsfeed?postId=${postId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`flex-1 gap-2 ${copied ? 'text-green-600' : ''}`}
      onClick={handleCopyLink}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          <span className="text-xs">Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span className="text-xs">Share</span>
        </>
      )}
    </Button>
  );
}
