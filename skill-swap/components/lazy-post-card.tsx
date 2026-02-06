'use client';

import { memo, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MessageCircle } from 'lucide-react';
import { PostComments } from '@/components/post-comments';
import { PostShare } from '@/components/post-share';
import { PostActionsMenu } from '@/components/post-actions-menu';
import { useLazyLoad } from '@/hooks/use-infinite-scroll';
import type { NewsfeedPost } from '@/app/newsfeed/page';

interface LazyPostCardProps {
  post: NewsfeedPost;
  currentUserId: string;
  isSaved: boolean;
  onLike: (postId: string) => void;
  onEdit: (post: NewsfeedPost) => void;
  onDelete: (postId: string) => void;
  onSaveToggle: (postId: string, isSaved: boolean) => void;
  onCommentAdded: (postId: string) => void;
}

/**
 * Get user initials for avatar fallback
 */
const getUserInitials = (name: string) => {
  const names = name.split(' ');
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return name[0]?.toUpperCase() || 'U';
};

/**
 * Format post date
 */
const formatDate = (date: Date | string) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

/**
 * Skeleton placeholder for lazy loading
 */
function PostSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-5/6 mb-4" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </Card>
  );
}

/**
 * Lazy-loaded post card that only renders when near the viewport
 */
export const LazyPostCard = memo(function LazyPostCard({
  post,
  currentUserId,
  isSaved,
  onLike,
  onEdit,
  onDelete,
  onSaveToggle,
  onCommentAdded,
}: LazyPostCardProps) {
  const { ref, isVisible } = useLazyLoad({
    rootMargin: '300px', // Start loading 300px before entering viewport
    threshold: 0.01,
    once: true, // Keep rendered once loaded
  });

  // Track post view when visible
  const hasTrackedView = useRef(false);
  useEffect(() => {
    if (isVisible && !hasTrackedView.current) {
      hasTrackedView.current = true;
      // Optional: Track view count via API
      // fetch(`/api/newsfeed/${post.id}/view`, { method: 'POST' }).catch(() => {});
    }
  }, [isVisible, post.id]);

  return (
    <div ref={ref} className="min-h-[200px]">
      {!isVisible ? (
        <PostSkeleton />
      ) : (
        <Card className="overflow-hidden">
          {/* Post Header */}
          <div className="p-4 pb-0">
            <div className="flex items-start justify-between">
              <Link
                href={`/profile/${post.author.id}`}
                className="flex items-center gap-3 hover:opacity-80 transition"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={post.author.image || ''}
                    alt={post.author.name}
                  />
                  <AvatarFallback>
                    {getUserInitials(post.author.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{post.author.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(post.createdAt)}
                  </p>
                </div>
              </Link>
              <PostActionsMenu
                postId={post.id}
                isAuthor={post.author.id === currentUserId}
                isSaved={isSaved}
                onEdit={() => onEdit(post)}
                onDelete={() => onDelete(post.id)}
                onSaveToggle={(saved) => onSaveToggle(post.id, saved)}
              />
            </div>

            {/* Skills Tags */}
            {post.author.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.author.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Post Content */}
          <div className="px-4 py-3">
            <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {post.content}
            </p>

            {/* Hashtags */}
            {post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {post.hashtags.map((tag) => (
                  <span key={tag} className="text-primary text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Post Media - Also lazy loaded */}
          {post.mediaUrl && <LazyMedia mediaUrl={post.mediaUrl} title={post.title} />}

          {/* Post Stats */}
          <div className="px-4 py-2 flex items-center justify-between text-sm text-muted-foreground border-t border-b">
            <span>{post.likesCount} likes</span>
            <span>{post.commentsCount} comments</span>
          </div>

          {/* Post Actions */}
          <div className="px-4 py-2 flex items-center justify-between gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`flex-1 ${post.isLiked ? 'text-red-500' : ''}`}
              onClick={() => onLike(post.id)}
            >
              <Heart
                className={`h-4 w-4 mr-2 ${post.isLiked ? 'fill-current' : ''}`}
              />
              <span className="text-xs">Like</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex-1">
              <MessageCircle className="h-4 w-4 mr-2" />
              <span className="text-xs">Comment</span>
            </Button>
            <PostShare postId={post.id} />
          </div>

          {/* Comments Section */}
          <div className="px-4 pb-4">
            <PostComments
              postId={post.id}
              initialCommentCount={post.commentsCount}
              onCommentAdded={() => onCommentAdded(post.id)}
            />
          </div>
        </Card>
      )}
    </div>
  );
});

/**
 * Lazy load media content
 */
interface LazyMediaProps {
  mediaUrl: string;
  title: string;
}

const LazyMedia = memo(function LazyMedia({ mediaUrl, title }: LazyMediaProps) {
  const { ref, isVisible } = useLazyLoad({
    rootMargin: '100px',
    threshold: 0.01,
    once: true,
  });

  const isVideo = mediaUrl.match(/\.(mp4|webm)$/i);

  return (
    <div ref={ref} className="relative w-full aspect-video bg-muted">
      {!isVisible ? (
        <Skeleton className="absolute inset-0" />
      ) : isVideo ? (
        <video
          src={mediaUrl}
          className="w-full h-full object-cover"
          controls
          preload="metadata"
        />
      ) : (
        <Image
          src={mediaUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 672px"
          loading="lazy"
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIBAAAgICAgIDAAAAAAAAAAAAAQIDBAARBSEGMRJBUf/EABQBAQAAAAAAAAAAAAAAAAAAAAP/xAAZEQACAwEAAAAAAAAAAAAAAAABAgADESH/2gAMAwEAAhEDEEEhEgP/2Q=="
        />
      )}
    </div>
  );
});
