/**
 * Connections API Route
 *
 * GET - Fetch user's active connections
 *
 * @fileoverview /api/connections
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch active connections where user is either user1 or user2
    const connections = await prisma.connection.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: 'ACTIVE',
      },
      include: {
        user1: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
            email: true,
          },
        },
        user2: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to get the "other" user for each connection
    const transformedConnections = connections.map((conn) => {
      const isUser1 = conn.user1Id === userId;
      const otherUser = isUser1 ? conn.user2 : conn.user1;

      return {
        id: conn.id,
        connectedAt: conn.createdAt,
        connectedUser: {
          id: otherUser.id,
          fullName: otherUser.fullName || otherUser.name || 'User',
          profileImage: otherUser.image,
          email: otherUser.email || '',
        },
      };
    });

    return NextResponse.json({
      connections: transformedConnections,
      count: transformedConnections.length,
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}
