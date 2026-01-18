'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MessageCircle } from 'lucide-react';
import { PostShare } from '@/components/post-share';
import { PostActionsMenu } from '@/components/post-actions-menu';
import { PostComments } from '@/components/post-comments';
import { EditPostDialog } from '@/components/edit-post-dialog';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';

interface Post {
  id: string;
  title: string;
  content: string;
  mediaUrl: string | null;
  hashtags: string[];
  createdAt: Date;
  author: {
    id: string;
    name: string;
    image: string | null;
    skills: string[];
  };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved?: boolean;
}

interface UserPostsSectionProps {
  userId: string;
}

export function UserPostsSection({ userId }: UserPostsSectionProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [shouldLoadPosts, setShouldLoadPosts] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    postId: string | null;
    isLoading: boolean;
  }>({ isOpen: false, postId: null, isLoading: false });

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setShouldLoadPosts(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px 200px 0px', threshold: 0.2 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoadPosts || hasLoadedOnce) return;

    const fetchUserPosts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/users/${userId}/posts?limit=10`);
        if (response.ok) {
          const data = await response.json();
          setPosts(data.posts);
        }
      } catch (error) {
        console.error('Error fetching user posts:', error);
      } finally {
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
    };

    fetchUserPosts();
  }, [shouldLoadPosts, hasLoadedOnce, userId]);

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setShowEditDialog(true);
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
    setShowEditDialog(false);
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

  const getUserInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name[0]?.toUpperCase() || 'U';
  };

  if (!hasLoadedOnce && !isLoading) {
    return (
      <Card ref={sectionRef} className="p-6 mb-6 text-center">
        <h2 className="text-lg font-semibold mb-2">Posts</h2>
        <p className="text-muted-foreground text-sm">
          Scroll to this section to load your posts.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card ref={sectionRef} className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Posts</h2>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card ref={sectionRef} className="p-6 mb-6 text-center">
        <h2 className="text-lg font-semibold mb-2">Posts</h2>
        <p className="text-muted-foreground">
          You haven't published any posts yet. Start sharing your thoughts!
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card ref={sectionRef} className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Posts</h2>
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between mb-3">
                <Link
                  href={`/profile/${post.author.id}`}
                  className="flex items-center gap-3 hover:opacity-80 transition"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={post.author.image || ''}
                      alt={post.author.name}
                    />
                    <AvatarFallback className="text-xs">
                      {getUserInitials(post.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{post.author.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </Link>
                <PostActionsMenu
                  postId={post.id}
                  isAuthor={true}
                  onEdit={() => handleEditPost(post)}
                  onDelete={() => handleDeletePost(post.id)}
                />
              </div>

              {/* Post Content */}
              <div className="mb-3">
                <h3 className="font-semibold text-sm mb-1">{post.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {post.content}
                </p>

                {/* Hashtags */}
                {post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {post.hashtags.map((tag) => (
                      <span key={tag} className="text-primary text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Post Media Thumbnail */}
              {post.mediaUrl && (
                <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden mb-3">
                  {post.mediaUrl.match(/\.(mp4|webm)$/i) ? (
                    <video
                      src={post.mediaUrl}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image
                      src={post.mediaUrl}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="300px"
                    />
                  )}
                </div>
              )}

              {/* Post Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{post.likesCount} likes</span>
                <span>{post.commentsCount} comments</span>
              </div>

              {/* Post Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-muted transition ${
                    post.isLiked ? 'text-red-500' : 'text-muted-foreground'
                  }`}
                >
                  <Heart
                    className={`h-3 w-3 ${post.isLiked ? 'fill-current' : ''}`}
                  />
                  Like
                </button>
                <PostShare postId={post.id} />
              </div>
            </div>
          ))}
        </div>
      </Card>

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
    </>
  );
}
