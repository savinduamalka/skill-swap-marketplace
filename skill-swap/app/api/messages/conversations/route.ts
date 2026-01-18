import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/messages/conversations
 * Fetch all conversations (connections) for the authenticated user
 * with the latest message from each conversation
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Get all active connections for this user
    const connections = await prisma.connection.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: 'ACTIVE',
      },
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
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Transform connections into conversation format
    const conversations = await Promise.all(
      connections.map(async (conn) => {
        // Determine the other user in the conversation
        const otherUser = conn.user1Id === userId ? conn.user2 : conn.user1;
        const lastMessage = conn.messages[0];

        // Count unread messages for this user
        const unreadCount = await prisma.message.count({
          where: {
            connectionId: conn.id,
            receiverId: userId,
            isRead: false,
          },
        });

        return {
          id: conn.id,
          user: {
            id: otherUser.id,
            name: otherUser.name || 'Unknown User',
            image: otherUser.image,
          },
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                isRead: lastMessage.isRead,
                senderId: lastMessage.senderId,
              }
            : null,
          unreadCount,
          updatedAt: conn.updatedAt,
        };
      })
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
