/**
 * Messages API Route
 *
 * GET  - Fetch paginated messages for a conversation (cursor-based)
 * DELETE - Clear all messages in a conversation
 *
 * Pagination: Uses cursor-based pagination.
 * - First request: returns latest N messages
 * - Subsequent: pass ?cursor=<messageId> to load older messages
 * - ?all=true: returns all messages (for search functionality)
 *
 * @fileoverview /api/messages/[connectionId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

const MESSAGES_PER_PAGE = 50;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { connectionId } = await params;

    // Parse pagination params
    const cursor = req.nextUrl.searchParams.get('cursor');
    const loadAll = req.nextUrl.searchParams.get('all') === 'true';

    // Verify that the user is part of this connection
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      include: {
        user1: {
          select: { id: true, name: true, image: true },
        },
        user2: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    if (connection.user1Id !== userId && connection.user2Id !== userId) {
      return NextResponse.json(
        { error: 'You are not part of this conversation' },
        { status: 403 }
      );
    }

    // Build query based on pagination mode
    let messages;

    if (loadAll) {
      // Load all messages (used for in-chat search)
      messages = await prisma.message.findMany({
        where: { connectionId },
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { id: true, name: true, image: true } },
        },
      });
    } else if (cursor) {
      // Cursor-based: load older messages before the cursor
      messages = await prisma.message.findMany({
        where: { connectionId },
        orderBy: { createdAt: 'desc' },
        take: MESSAGES_PER_PAGE,
        skip: 1, // Skip the cursor message itself
        cursor: { id: cursor },
        include: {
          sender: { select: { id: true, name: true, image: true } },
        },
      });
      // Reverse to chronological order
      messages.reverse();
    } else {
      // Initial load: get the latest messages
      messages = await prisma.message.findMany({
        where: { connectionId },
        orderBy: { createdAt: 'desc' },
        take: MESSAGES_PER_PAGE,
        include: {
          sender: { select: { id: true, name: true, image: true } },
        },
      });
      // Reverse to chronological order
      messages.reverse();
    }

    // Mark unread messages as read (only on initial load or load-all)
    if (!cursor) {
      await prisma.message.updateMany({
        where: {
          connectionId,
          receiverId: userId,
          isRead: false,
        },
        data: { isRead: true },
      });
    }

    // Determine if there are more (older) messages
    let hasMore = false;
    if (!loadAll && messages.length > 0) {
      const oldestInBatch = messages[0];
      const olderCount = await prisma.message.count({
        where: {
          connectionId,
          createdAt: { lt: oldestInBatch.createdAt },
        },
      });
      hasMore = olderCount > 0;
    }

    // Determine the other user
    const otherUser =
      connection.user1Id === userId ? connection.user2 : connection.user1;

    return NextResponse.json({
      connection: {
        id: connection.id,
        otherUser: {
          id: otherUser.id,
          name: otherUser.name || 'Unknown User',
          image: otherUser.image,
        },
      },
      messages: messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        senderName: msg.sender.name,
        senderImage: msg.sender.image,
        createdAt: msg.createdAt,
        isRead: msg.isRead,
        isOwn: msg.senderId === userId,
        mediaUrl: msg.mediaUrl,
        mediaType: msg.mediaType,
        mediaName: msg.mediaName,
        mediaSize: msg.mediaSize,
        mediaThumbnail: msg.mediaThumbnail,
        messageType: msg.messageType,
        callDuration: msg.callDuration,
        callType: msg.callType,
      })),
      hasMore,
      nextCursor: !loadAll && messages.length > 0 ? messages[0].id : null,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messages/[connectionId]
 * Clear all messages in a conversation
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { connectionId } = await params;

    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    if (connection.user1Id !== userId && connection.user2Id !== userId) {
      return NextResponse.json(
        { error: 'You are not part of this conversation' },
        { status: 403 }
      );
    }

    const result = await prisma.message.deleteMany({
      where: { connectionId },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: 'All messages in conversation deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting conversation messages:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
