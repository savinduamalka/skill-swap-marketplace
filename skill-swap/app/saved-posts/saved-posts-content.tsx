'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MessageCircle } from 'lucide-react';
import { PostComments } from '@/components/post-comments';
import { PostShare } from '@/components/post-share';
import { PostActionsMenu } from '@/components/post-actions-menu';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import type { NewsfeedPost } from '../newsfeed/page';

interface SavedPostsContentProps {
  currentUserId: string;
}

export function SavedPostsContent({ currentUserId }: SavedPostsContentProps) {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<NewsfeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    postId: string | null;
    isLoading: boolean;
  }>({ isOpen: false, postId: null, isLoading: false });

  // Initial load
  useEffect(() => {
    const fetchInitialPosts = async () => {
      try {
        const response = await fetch('/api/newsfeed/saved?limit=12&skip=0');
        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts);
          setTotal(data.total);
          setSkip(0);
          setSavedPostIds(new Set(data.posts.map((p: NewsfeedPost) => p.id)));
          setHasMore(data.posts.length < data.total);
        }
      } catch (error) {
        console.error('Error fetching saved posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialPosts();
  }, []);

  // Infinite scroll setup
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !isLoading
        ) {
          fetchMorePosts();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading]);

  const fetchMorePosts = async () => {
    setIsLoadingMore(true);
    try {
      const newSkip = skip + 12;
      const response = await fetch(
        `/api/newsfeed/saved?limit=12&skip=${newSkip}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.posts.length > 0) {
          setPosts((prev) => [...prev, ...data.posts]);
          setSavedPostIds(
            (prev) =>
              new Set([...prev, ...data.posts.map((p: NewsfeedPost) => p.id)])
          );
          setSkip(newSkip);
          setHasMore(posts.length + data.posts.length < total);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error fetching more saved posts:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(`/api/newsfeed/${postId}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, isLiked: data.isLiked, likesCount: data.likesCount }
              : post
          )
        );
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSaveToggle = (postId: string, isSaved: boolean) => {
    if (!isSaved) {
      // Remove from saved posts
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSavedPostIds((prev) => {
        const updated = new Set(prev);
        updated.delete(postId);
        return updated;
      });
    }
  };

  const handleDeletePost = (postId: string) => {
    setDeleteConfirm({ isOpen: true, postId, isLoading: false });
  };

  const confirmDeletePost = async () => {
    if (!deleteConfirm.postId) return;

    setDeleteConfirm((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(
        `/api/newsfeed/${deleteConfirm.postId}/edit`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== deleteConfirm.postId));
        setDeleteConfirm({ isOpen: false, postId: null, isLoading: false });
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      setDeleteConfirm({ isOpen: false, postId: null, isLoading: false });
    }
  };

  const getUserInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name[0]?.toUpperCase() || 'U';
  };

  const formatDate = (date: Date | string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-5/6" />
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium mb-2">No saved posts yet</p>
          <p className="text-sm">
            Save posts from the newsfeed to view them here later
          </p>
          <Link href="/newsfeed">
            <Button className="mt-4">Browse Newsfeed</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card key={post.id} className="overflow-hidden">
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
                isSaved={true}
                onSaveToggle={(isSaved) => handleSaveToggle(post.id, isSaved)}
                onDelete={() => handleDeletePost(post.id)}
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

          {/* Post Media */}
          {post.mediaUrl && (
            <div className="relative w-full aspect-video bg-muted">
              {post.mediaUrl.match(/\.(mp4|webm)$/i) ? (
                <video
                  src={post.mediaUrl}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <Image
                  src={post.mediaUrl}
                  alt={post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 672px"
                />
              )}
            </div>
          )}

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
              onClick={() => handleLike(post.id)}
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
              onCommentAdded={() => {
                setPosts((prev) =>
                  prev.map((p) =>
                    p.id === post.id
                      ? { ...p, commentsCount: p.commentsCount + 1 }
                      : p
                  )
                );
              }}
            />
          </div>
        </Card>
      ))}

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={deleteConfirm.isOpen}
        isLoading={deleteConfirm.isLoading}
        onConfirm={confirmDeletePost}
        onCancel={() =>
          setDeleteConfirm({ isOpen: false, postId: null, isLoading: false })
        }
      />
    </div>
  );
}
