'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, X } from 'lucide-react';

interface EditPostDialogProps {
  isOpen: boolean;
  postId: string;
  initialTitle: string;
  initialContent: string;
  initialHashtags: string[];
  initialMediaUrl?: string;
  onOpenChange: (open: boolean) => void;
  onSave?: (updatedPost: any) => void;
}

export function EditPostDialog({
  isOpen,
  postId,
  initialTitle,
  initialContent,
  initialHashtags,
  initialMediaUrl,
  onOpenChange,
  onSave,
}: EditPostDialogProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [hashtags, setHashtags] = useState(initialHashtags.join(', '));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/newsfeed/${postId}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          hashtags: hashtags.trim(),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update post');
      }

      const data = await response.json();
      onSave?.(data.post);
      onOpenChange(false);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to update post'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
          <DialogDescription>Update your post details below</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {initialMediaUrl && (
            <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
              {initialMediaUrl.match(/\.(mp4|webm)$/i) ? (
                <video
                  src={initialMediaUrl}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <Image
                  src={initialMediaUrl}
                  alt="Post media"
                  fill
                  className="object-cover"
                />
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Post title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Content</label>
            <Textarea
              placeholder="Post content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              maxLength={5000}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Hashtags</label>
            <Input
              placeholder="Comma-separated hashtags: react, javascript"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="mt-1"
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
