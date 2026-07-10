'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ChevronDown, ChevronUp, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
  commenter: {
    id: string;
    name: string;
    image: string | null;
  };
  likesCount: number;
  isLiked: boolean;
  replies?: Comment[];
  repliesCount?: number;
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const fetchComments = async () => {
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
    if (!isExpanded) await fetchComments();
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
        if (!isExpanded && commentCount > 0) {
          await fetchComments();
        } else {
          setComments((prev) => [data, ...prev]);
        }
        setNewComment('');
        setCommentCount((prev) => prev + 1);
        setIsExpanded(true);
        onCommentAdded?.();
      }
    } catch (error) {
      toast.error('Failed to post comment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    try {
      const response = await fetch(`/api/newsfeed/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText, parentId }),
      });
      if (response.ok) {
        const data = await response.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies || []), data], repliesCount: (c.repliesCount || 0) + 1 }
              : c
          )
        );
        setReplyText('');
        setReplyingTo(null);
        setCommentCount((prev) => prev + 1);
        onCommentAdded?.();
      }
    } catch (error) {
      toast.error('Failed to post reply');
    }
  };

  const handleLikeComment = async (commentId: string, isReply = false, parentId?: string) => {
    // Optimistic update first
    const updateLike = (c: Comment) => ({
      ...c,
      isLiked: !c.isLiked,
      likesCount: c.isLiked ? c.likesCount - 1 : c.likesCount + 1,
    });

    if (isReply && parentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: (c.replies || []).map((r) => r.id === commentId ? updateLike(r) : r) }
            : c
        )
      );
    } else {
      setComments((prev) => prev.map((c) => c.id === commentId ? updateLike(c) : c));
    }

    try {
      const response = await fetch(`/api/newsfeed/${postId}/comments/${commentId}/like`, { method: 'POST' });
      if (response.ok) {
        const { isLiked, likesCount } = await response.json();
        // Sync with server truth
        if (isReply && parentId) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === parentId
                ? { ...c, replies: (c.replies || []).map((r) => r.id === commentId ? { ...r, isLiked, likesCount } : r) }
                : c
            )
          );
        } else {
          setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, isLiked, likesCount } : c));
        }
      }
    } catch (error) {
      // Revert on failure
      if (isReply && parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: (c.replies || []).map((r) => r.id === commentId ? updateLike(r) : r) }
              : c
          )
        );
      } else {
        setComments((prev) => prev.map((c) => c.id === commentId ? updateLike(c) : c));
      }
    }
  };

  return (
    <div className="space-y-3 mt-4 border-t pt-4">
      <button
        onClick={handleToggleExpand}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</span>
      </button>

      {/* Top-level comment input */}
      <form onSubmit={handleSubmitComment} className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={isLoading}
          className="text-sm rounded-full bg-muted/50"
          maxLength={1000}
        />
        <Button type="submit" disabled={isLoading || !newComment.trim()} size="icon" className="rounded-full shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {/* Comments List */}
      {isExpanded && (
        <div className="space-y-4 mt-3 max-h-[500px] overflow-y-auto">
          {isLoadingComments ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-12 bg-muted rounded-2xl w-3/4" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No comments yet</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-1">
                {/* Parent Comment */}
                <div className="flex gap-2">
                  <Link href={`/profile/${comment.commenter.id}`}>
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={comment.commenter.image || undefined} />
                      <AvatarFallback className="text-xs">{comment.commenter.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted/60 rounded-2xl px-3 py-2 inline-block max-w-full">
                      <Link href={`/profile/${comment.commenter.id}`} className="text-[13px] font-semibold hover:underline block">
                        {comment.commenter.name}
                      </Link>
                      <p className="text-sm break-words">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 px-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false })}
                      </span>
                      <button
                        onClick={() => handleLikeComment(comment.id)}
                        className={`text-xs font-semibold ${comment.isLiked ? 'text-blue-600' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Like{comment.likesCount > 0 ? ` · ${comment.likesCount}` : ''}
                      </button>
                      <button
                        onClick={() => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setTimeout(() => replyInputRef.current?.focus(), 50); }}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-10 space-y-1">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-2">
                        <Link href={`/profile/${reply.commenter.id}`}>
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarImage src={reply.commenter.image || undefined} />
                            <AvatarFallback className="text-[10px]">{reply.commenter.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="bg-muted/60 rounded-2xl px-3 py-1.5 inline-block max-w-full">
                            <Link href={`/profile/${reply.commenter.id}`} className="text-xs font-semibold hover:underline block">
                              {reply.commenter.name}
                            </Link>
                            <p className="text-[13px] break-words">{reply.content}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 px-1">
                            <span className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: false })}
                            </span>
                            <button
                              onClick={() => handleLikeComment(reply.id, true, comment.id)}
                              className={`text-[11px] font-semibold ${reply.isLiked ? 'text-blue-600' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                              Like{reply.likesCount > 0 ? ` · ${reply.likesCount}` : ''}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline Reply Input (appears right below the comment + its replies) */}
                {replyingTo === comment.id && (
                  <div className="ml-10 flex gap-2 mt-1">
                    <Input
                      ref={replyInputRef}
                      placeholder={`Reply to ${comment.commenter.name}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && replyText.trim()) handleSubmitReply(comment.id); }}
                      className="text-xs rounded-full bg-muted/50 h-8"
                      maxLength={1000}
                    />
                    <Button
                      type="button"
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyText.trim()}
                      size="icon"
                      className="rounded-full h-8 w-8 shrink-0"
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
