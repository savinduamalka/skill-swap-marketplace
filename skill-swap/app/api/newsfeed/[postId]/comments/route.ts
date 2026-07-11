/**
 * Comments API Route
 *
 * GET - Fetch comments for a post (with replies and like counts)
 * POST - Create a comment or reply to a comment
 *
 * @fileoverview /api/newsfeed/[postId]/comments
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { broadcastNewsfeedEvent } from '@/lib/newsfeed-events';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    const { postId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const userId = session?.user?.id;

    // Fetch only top-level comments
    const comments = await prisma.postComment.findMany({
      where: { postId, parentId: null },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        commenter: {
          select: { id: true, fullName: true, name: true, image: true },
        },
        likes: {
          select: { userId: true },
        },
        _count: { select: { likes: true } },
      },
    });

    // Fetch replies for these comments
    const commentIds = comments.map((c) => c.id);
    const replies = await prisma.postComment.findMany({
      where: { postId, parentId: { in: commentIds } },
      orderBy: { createdAt: 'asc' },
      include: {
        commenter: {
          select: { id: true, fullName: true, name: true, image: true },
        },
        likes: {
          select: { userId: true },
        },
        _count: { select: { likes: true } },
      },
    });

    // Group replies by parentId
    const repliesByParent = new Map<string, typeof replies>();
    for (const reply of replies) {
      const existing = repliesByParent.get(reply.parentId!) || [];
      existing.push(reply);
      repliesByParent.set(reply.parentId!, existing);
    }

    return NextResponse.json({
      comments: comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        parentId: null,
        commenter: {
          id: comment.commenter.id,
          name: comment.commenter.fullName || comment.commenter.name || 'Anonymous',
          image: comment.commenter.image,
        },
        likesCount: comment._count.likes,
        isLiked: userId ? comment.likes.some((l) => l.userId === userId) : false,
        repliesCount: repliesByParent.get(comment.id)?.length || 0,
        replies: (repliesByParent.get(comment.id) || []).map((reply) => ({
          id: reply.id,
          content: reply.content,
          createdAt: reply.createdAt,
          parentId: reply.parentId,
          commenter: {
            id: reply.commenter.id,
            name: reply.commenter.fullName || reply.commenter.name || 'Anonymous',
            image: reply.commenter.image,
          },
          likesCount: reply._count.likes,
          isLiked: userId ? reply.likes.some((l) => l.userId === userId) : false,
        })),
      })),
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

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
    const body = await request.json();
    const { content, parentId } = body;

    // Validate input
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Comment must be less than 1000 characters' }, { status: 400 });
    }

    // Check if post exists
    const post = await prisma.newsfeedPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // If replying, verify parent comment exists
    let parentComment = null;
    if (parentId) {
      parentComment = await prisma.postComment.findUnique({
        where: { id: parentId, postId },
        select: { id: true, commenterId: true },
      });
      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 });
      }
    }

    // Create comment
    const comment = await prisma.postComment.create({
      data: {
        postId,
        commenterId: session.user.id,
        content: content.trim(),
        parentId: parentId || null,
      },
      include: {
        commenter: {
          select: { id: true, fullName: true, name: true, image: true },
        },
      },
    });

    const commenterName = comment.commenter.fullName || comment.commenter.name || 'Someone';

    // Notify post author about new comment (don't notify if commenting on own post)
    if (post.authorId !== session.user.id) {
      createNotification({
        userId: post.authorId,
        type: 'POST_COMMENT',
        title: 'New comment on your post',
        message: `${commenterName} commented: "${content.trim().slice(0, 80)}"`,
        relatedUserId: session.user.id,
        relatedEntityId: postId,
        relatedEntityType: 'post',
      }).catch(console.error);
    }

    // If this is a reply, notify the parent comment author
    if (parentComment && parentComment.commenterId !== session.user.id) {
      createNotification({
        userId: parentComment.commenterId,
        type: 'COMMENT_REPLY',
        title: 'Someone replied to your comment',
        message: `${commenterName} replied: "${content.trim().slice(0, 80)}"`,
        relatedUserId: session.user.id,
        relatedEntityId: postId,
        relatedEntityType: 'post',
      }).catch(console.error);
    }

    const responseData = {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      parentId: comment.parentId,
      commenter: {
        id: comment.commenter.id,
        name: commenterName,
        image: comment.commenter.image,
      },
      likesCount: 0,
      isLiked: false,
      replies: [],
    };

    // Broadcast to all users for live update
    const commentsCount = await prisma.postComment.count({ where: { postId } });
    if (parentId) {
      broadcastNewsfeedEvent({
        event: 'comment_replied',
        data: { postId, parentId, reply: responseData },
      });
    } else {
      broadcastNewsfeedEvent({
        event: 'post_commented',
        data: { postId, comment: responseData, commentsCount },
      });
    }

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
