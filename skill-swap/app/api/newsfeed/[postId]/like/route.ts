import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { broadcastNewsfeedEvent } from '@/lib/newsfeed-events';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;

    // Check if post exists
    const post = await prisma.newsfeedPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if user already liked the post
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: session.user.id,
        },
      },
    });

    let isLiked: boolean;

    if (existingLike) {
      // Unlike: Remove the like
      await prisma.postLike.delete({
        where: { id: existingLike.id },
      });
      isLiked = false;
    } else {
      // Like: Create a new like
      await prisma.postLike.create({
        data: {
          postId,
          userId: session.user.id,
        },
      });
      isLiked = true;

      // Notify the post author (don't notify if liking own post)
      if (post.authorId !== session.user.id) {
        const likerName = session.user.name || 'Someone';
        createNotification({
          userId: post.authorId,
          type: 'POST_LIKE',
          title: 'Someone liked your post',
          message: `${likerName} liked your post.`,
          relatedUserId: session.user.id,
          relatedEntityId: postId,
          relatedEntityType: 'post',
        }).catch(console.error);
      }
    }

    // Get updated like count
    const likesCount = await prisma.postLike.count({
      where: { postId },
    });

    // Broadcast to all connected clients for live update
    broadcastNewsfeedEvent({
      event: 'post_liked',
      data: { postId, userId: session.user.id, userName: session.user.name || 'User', likesCount, isLiked },
    });

    return NextResponse.json({
      isLiked,
      likesCount,
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}
