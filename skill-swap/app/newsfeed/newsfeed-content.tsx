'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Image as ImageIcon,
  Video,
  Loader2,
  Send,
  X,
  RefreshCw,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { EditPostDialog } from '@/components/edit-post-dialog';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LazyPostCard } from '@/components/lazy-post-card';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import type { NewsfeedPost } from './page';

// Number of posts to fetch per page for infinite scroll
const POSTS_PER_PAGE = 8;

interface NewsfeedContentProps {
  initialPosts: NewsfeedPost[];
  initialCursor: string | null;
  initialHasMore: boolean;
  currentUserId: string;
}

export function NewsfeedContent({
  initialPosts,
  initialCursor,
  initialHasMore,
  currentUserId,
}: NewsfeedContentProps) {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<NewsfeedPost[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [showNewPostsAlert, setShowNewPostsAlert] = useState(false);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Post creation state
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postHashtags, setPostHashtags] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit post state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<NewsfeedPost | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    postId: string | null;
    isLoading: boolean;
  }>({ isOpen: false, postId: null, isLoading: false });

  // Saved posts tracking - initialize from initial posts
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(() => {
    const savedIds = initialPosts
      .filter((post) => post.isSaved)
      .map((post) => post.id);
    return new Set(savedIds);
  });

  /**
   * Fetch more posts for infinite scroll
   */
  const fetchMorePosts = useCallback(async () => {
    if (isLoading || !hasMore || !cursor) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/newsfeed?cursor=${cursor}&limit=${POSTS_PER_PAGE}`);
      if (!response.ok) throw new Error('Failed to fetch posts');

      const data = await response.json();
      setPosts((prev) => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
      
      // Add saved posts from new data to the set
      const newSavedIds = data.posts
        .filter((post: NewsfeedPost) => post.isSaved)
        .map((post: NewsfeedPost) => post.id);
      if (newSavedIds.length > 0) {
        setSavedPostIds((prev) => new Set([...prev, ...newSavedIds]));
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [cursor, hasMore, isLoading]);

  /**
   * Set up infinite scroll with custom hook
   */
  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: fetchMorePosts,
    hasMore,
    isLoading,
    rootMargin: '400px', // Start loading 400px before reaching the end
    threshold: 0.1,
  });

  /**
   * Auto-refresh for new posts (polling every 30 seconds)
   */
  useEffect(() => {
    const checkForNewPosts = async () => {
      try {
        // Fetch posts from the beginning
        const response = await fetch(`/api/newsfeed?limit=${POSTS_PER_PAGE}`);
        if (!response.ok) return;

        const data = await response.json();
        const newPosts = data.posts;

        // Check if there are new posts at the top
        if (newPosts.length > 0 && posts.length > 0) {
          const latestFeedPostId = posts[0].id;
          const latestApiPostId = newPosts[0].id;

          if (latestApiPostId !== latestFeedPostId) {
            // Count new posts
            const newCount = newPosts.findIndex(
              (p: NewsfeedPost) => p.id === latestFeedPostId
            );
            if (newCount > 0) {
              setNewPostsCount(newCount);
              setShowNewPostsAlert(true);
            }
          }
        }
      } catch (error) {
        console.error('Error checking for new posts:', error);
      }
    };

    // Set up interval to check for new posts every 30 seconds
    autoRefreshIntervalRef.current = setInterval(checkForNewPosts, 30000);

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [posts]);

  /**
   * Load new posts from the top
   */
  const handleLoadNewPosts = async () => {
    try {
      const response = await fetch(`/api/newsfeed?limit=${POSTS_PER_PAGE}`);
      if (!response.ok) throw new Error('Failed to fetch posts');

      const data = await response.json();
      setPosts(data.posts);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setNewPostsCount(0);
      setShowNewPostsAlert(false);
    } catch (error) {
      console.error('Error loading new posts:', error);
    }
  };

  /**
   * Handle media file selection
   */
  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
    ];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please select an image or video.');
      return;
    }

    // Validate file size
    const maxSize = file.type.startsWith('video/')
      ? 50 * 1024 * 1024
      : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(
        `File too large. Maximum size: ${file.type.startsWith('video/') ? '50MB' : '10MB'}`
      );
      return;
    }

    setSelectedMedia(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  /**
   * Remove selected media
   */
  const removeMedia = () => {
    setSelectedMedia(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Create a new post
   */
  const handleCreatePost = async () => {
    if (!postTitle.trim() || !postContent.trim()) {
      alert('Please enter a title and content for your post.');
      return;
    }

    setIsCreatingPost(true);
    try {
      const formData = new FormData();
      formData.append('title', postTitle.trim());
      formData.append('content', postContent.trim());
      if (postHashtags.trim()) {
        formData.append('hashtags', postHashtags.trim());
      }
      if (selectedMedia) {
        formData.append('media', selectedMedia);
      }

      const response = await fetch('/api/newsfeed', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create post');
      }

      const data = await response.json();

      // Add new post to the top of the feed
      setPosts((prev) => [data.post, ...prev]);

      // Reset form
      setPostTitle('');
      setPostContent('');
      setPostHashtags('');
      removeMedia();
      setShowCreatePost(false);
    } catch (error) {
      console.error('Error creating post:', error);
      alert(error instanceof Error ? error.message : 'Failed to create post');
    } finally {
      setIsCreatingPost(false);
    }
  };

  /**
   * Toggle like on a post
   */
  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(`/api/newsfeed/${postId}/like`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to toggle like');

      const data = await response.json();

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, isLiked: data.isLiked, likesCount: data.likesCount }
            : post
        )
      );
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  /**
   * Handle edit post
   */
  const handleEditPost = (post: NewsfeedPost) => {
    setEditingPost(post);
    setEditingPostId(post.id);
    setShowEditDialog(true);
  };

  /**
   * Handle post update
   */
  const handlePostUpdated = (updatedPost: NewsfeedPost) => {
    setPosts((prev) =>
      prev.map((post) => (post.id === updatedPost.id ? updatedPost : post))
    );
    setShowEditDialog(false);
  };

  /**
   * Handle delete post
   */
  const handleDeletePost = (postId: string) => {
    setDeleteConfirm({ isOpen: true, postId, isLoading: false });
  };

  /**
   * Confirm delete post
   */
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

      if (!response.ok) throw new Error('Failed to delete post');

      setPosts((prev) => prev.filter((p) => p.id !== deleteConfirm.postId));
      setDeleteConfirm({ isOpen: false, postId: null, isLoading: false });
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
      setDeleteConfirm({ isOpen: false, postId: null, isLoading: false });
    }
  };

  /**
   * Handle save toggle
   */
  const handleSaveToggle = (postId: string, isSaved: boolean) => {
    if (isSaved) {
      setSavedPostIds((prev) => new Set([...prev, postId]));
    } else {
      setSavedPostIds((prev) => {
        const updated = new Set(prev);
        updated.delete(postId);
        return updated;
      });
    }
  };

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

  return (
    <div className="space-y-6">
      {/* New Posts Alert */}
      {showNewPostsAlert && (
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <RefreshCw className="h-4 w-4" />
          <AlertDescription className="ml-2 flex items-center justify-between">
            <span>
              {newPostsCount} new post{newPostsCount !== 1 ? 's' : ''} available
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleLoadNewPosts}
              className="ml-4"
            >
              Load New Posts
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Create Post Card */}
      <Card className="p-4">
        {!showCreatePost ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={session?.user?.image || ''} alt="Your avatar" />
              <AvatarFallback>
                {getUserInitials(session?.user?.name || 'User')}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => setShowCreatePost(true)}
              className="flex-1 text-left px-4 py-2.5 bg-muted/50 hover:bg-muted rounded-full text-muted-foreground transition"
            >
              Share your skills or what you&apos;re learning...
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Create Post</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowCreatePost(false);
                  setPostTitle('');
                  setPostContent('');
                  setPostHashtags('');
                  removeMedia();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Input
              placeholder="Post title"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              maxLength={200}
            />

            <Textarea
              placeholder="What's on your mind? Share your skills, learning journey, or ask for help..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={4}
              maxLength={5000}
            />

            <Input
              placeholder="Hashtags (comma-separated): react, javascript, webdev"
              value={postHashtags}
              onChange={(e) => setPostHashtags(e.target.value)}
            />

            {/* Media Preview */}
            {mediaPreview && (
              <div className="relative">
                {selectedMedia?.type.startsWith('video/') ? (
                  <video
                    src={mediaPreview}
                    className="w-full max-h-64 object-cover rounded-lg"
                    controls
                  />
                ) : (
                  <div className="relative w-full h-64">
                    <Image
                      src={mediaPreview}
                      alt="Preview"
                      fill
                      className="object-cover rounded-lg"
                    />
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeMedia}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                  className="hidden"
                  onChange={handleMediaSelect}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Photo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </Button>
              </div>

              <Button
                onClick={handleCreatePost}
                disabled={
                  isCreatingPost || !postTitle.trim() || !postContent.trim()
                }
              >
                {isCreatingPost ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Posts Feed with Lazy Loading */}
      {posts.length === 0 && !isLoading ? (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">
            <p className="text-lg font-medium mb-2">No posts yet</p>
            <p className="text-sm">
              Be the first to share something with the community!
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <LazyPostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              isSaved={savedPostIds.has(post.id)}
              onLike={handleLike}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
              onSaveToggle={handleSaveToggle}
              onCommentAdded={(postId) => {
                setPosts((prev) =>
                  prev.map((p) =>
                    p.id === postId
                      ? { ...p, commentsCount: p.commentsCount + 1 }
                      : p
                  )
                );
              }}
            />
          ))}
        </div>
      )}

      {/* Infinite Scroll Trigger */}
      <div ref={loadMoreRef} className="py-4">
        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
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
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-center text-muted-foreground text-sm">
            You&apos;ve reached the end of the feed
          </p>
        )}
      </div>

      {/* Edit Post Dialog */}
      {editingPost && (
        <EditPostDialog
          isOpen={showEditDialog}
          postId={editingPost.id}
          initialTitle={editingPost.title}
          initialContent={editingPost.content}
          initialHashtags={editingPost.hashtags}
          initialMediaUrl={editingPost.mediaUrl || undefined}
          onOpenChange={setShowEditDialog}
          onSave={handlePostUpdated}
        />
      )}

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
