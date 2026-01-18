import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteMediaFromStorage } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;
    const body = await request.json();
    const { title, content, hashtags } = body;

    // Validate input
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Check if post exists and user is author
    const post = await prisma.newsfeedPost.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own posts' },
        { status: 403 }
      );
    }

    // Update the post
    const updatedPost = await prisma.newsfeedPost.update({
      where: { id: postId },
      data: {
        title: title.trim(),
        content: content.trim(),
        hashtags: hashtags?.trim() || null,
        updatedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
          },
        },
        likes: true,
        comments: true,
      },
    });

    return NextResponse.json({
      post: {
        id: updatedPost.id,
        title: updatedPost.title,
        content: updatedPost.content,
        mediaUrl: updatedPost.mediaUrl,
        hashtags: updatedPost.hashtags?.split(',') || [],
        viewCount: updatedPost.viewCount,
        createdAt: updatedPost.createdAt,
        updatedAt: updatedPost.updatedAt,
        author: {
          id: updatedPost.author.id,
          name:
            updatedPost.author.fullName ||
            updatedPost.author.name ||
            'Anonymous',
          image: updatedPost.author.image,
          skills: [],
        },
        likesCount: updatedPost.likes.length,
        commentsCount: updatedPost.comments.length,
        isLiked: false,
      },
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;

    // Check if post exists and user is author
    const post = await prisma.newsfeedPost.findUnique({
      where: { id: postId },
      select: { authorId: true, mediaUrl: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (post.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own posts' },
        { status: 403 }
      );
    }

    // Delete media from storage if exists
    if (post.mediaUrl) {
      try {
        const fileName = post.mediaUrl.split('/').pop();
        if (fileName) {
          await deleteMediaFromStorage(fileName);
        }
      } catch (error) {
        console.error('Error deleting media from storage:', error);
        // Continue with post deletion even if media deletion fails
      }
    }

    // Delete the post
    await prisma.newsfeedPost.delete({
      where: { id: postId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
