'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChevronDown, ChevronUp, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  commenter: {
    id: string;
    name: string;
    image: string | null;
  };
}

interface PostCommentsProps {
  postId: string;
  initialCommentCount: number;
  onCommentAdded?: () => void;
}

export function PostComments({
  postId,
  initialCommentCount,
  onCommentAdded,
}: PostCommentsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch comments when expanded
  const fetchComments = async () => {
    if (comments.length > 0) return; // Already loaded

    setIsLoadingComments(true);
    try {
      const response = await fetch(`/api/newsfeed/${postId}/comments?limit=20`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleToggleExpand = async () => {
    if (!isExpanded) {
      await fetchComments();
    }
    setIsExpanded(!isExpanded);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/newsfeed/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments([data, ...comments]); // Add new comment to top
        setNewComment('');
        setCommentCount((prev) => prev + 1);
        onCommentAdded?.();
        inputRef.current?.focus();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3 mt-4 border-t pt-4">
      {/* Comment Toggle */}
      <button
        onClick={handleToggleExpand}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
      >
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        <span>
          {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </span>
      </button>

      {/* Comment Input */}
      <form onSubmit={handleSubmitComment} className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={isLoading}
          className="text-sm"
          maxLength={1000}
        />
        <Button
          type="submit"
          disabled={isLoading || !newComment.trim()}
          size="sm"
          className="px-3"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {/* Comments List */}
      {isExpanded && (
        <div className="space-y-3 mt-3 max-h-96 overflow-y-auto">
          {isLoadingComments ? (
            <div className="text-sm text-gray-500 py-2">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-sm text-gray-500 py-2">No comments yet</div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="flex gap-2 pb-2 border-b last:border-0"
              >
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={comment.commenter.image || undefined} />
                  <AvatarFallback>
                    {comment.commenter.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {comment.commenter.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
