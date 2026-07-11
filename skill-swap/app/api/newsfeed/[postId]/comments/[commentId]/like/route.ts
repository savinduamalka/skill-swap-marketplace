/**
 * Comment Like (React) API Route
 *
 * POST - Toggle like on a comment
 *
 * @fileoverview /api/newsfeed/[postId]/comments/[commentId]/like
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { broadcastNewsfeedEvent } from '@/lib/newsfeed-events';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, commentId } = await params;

    // Verify comment exists and belongs to this post
    const comment = await prisma.postComment.findUnique({
      where: { id: commentId, postId },
      select: { id: true, commenterId: true },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if already liked
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId: session.user.id,
        },
      },
    });

    let isLiked: boolean;

    if (existingLike) {
      // Unlike
      await prisma.commentLike.delete({ where: { id: existingLike.id } });
      isLiked = false;
    } else {
      // Like
      await prisma.commentLike.create({
        data: { commentId, userId: session.user.id },
      });
      isLiked = true;

      // Notify comment author (don't notify if reacting to own comment)
      if (comment.commenterId !== session.user.id) {
        const reactorName = session.user.name || 'Someone';
        createNotification({
          userId: comment.commenterId,
          type: 'COMMENT_LIKE',
          title: 'Someone liked your comment',
          message: `${reactorName} liked your comment.`,
          relatedUserId: session.user.id,
          relatedEntityId: postId,
          relatedEntityType: 'post',
        }).catch(console.error);
      }
    }

    // Get updated count
    const likesCount = await prisma.commentLike.count({ where: { commentId } });

    // Broadcast to all users
    broadcastNewsfeedEvent({
      event: 'comment_liked',
      data: { postId, commentId, userId: session.user.id, likesCount, isLiked },
    });

    return NextResponse.json({ isLiked, likesCount });
  } catch (error) {
    console.error('Error toggling comment like:', error);
    return NextResponse.json({ error: 'Failed to react to comment' }, { status: 500 });
  }
}
