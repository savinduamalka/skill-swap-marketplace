import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/messages/[connectionId]
 * Fetch all messages for a specific conversation
 * Also marks unread messages as read
 */
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

    // Verify that the user is part of this connection
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            image: true,
          },
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

    // Fetch all messages for this connection
    const messages = await prisma.message.findMany({
      where: {
        connectionId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Mark all unread messages as read
    await prisma.message.updateMany({
      where: {
        connectionId,
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

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
        // Media attachments
        mediaUrl: msg.mediaUrl,
        mediaType: msg.mediaType,
        mediaName: msg.mediaName,
        mediaSize: msg.mediaSize,
        mediaThumbnail: msg.mediaThumbnail,
      })),
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    console.error(
      'Stack trace:',
      error instanceof Error ? error.stack : 'No stack trace'
    );
    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
