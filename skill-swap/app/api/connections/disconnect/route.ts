/**
 * Disconnect Connection API Route
 *
 * Ends an active connection between two users.
 * Sets the connection status to ENDED. Does NOT refund credits
 * (credits were settled when the connection was accepted).
 *
 * @fileoverview POST /api/connections/disconnect
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Connection ID is required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Find the connection and verify the user is part of it
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
        { error: 'You are not part of this connection' },
        { status: 403 }
      );
    }

    if (connection.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Connection is not active' },
        { status: 400 }
      );
    }

    // End the connection
    await prisma.connection.update({
      where: { id: connectionId },
      data: { status: 'ENDED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Connection closed successfully',
    });
  } catch (error) {
    console.error('Error disconnecting:', error);
    return NextResponse.json(
      { error: 'Failed to close connection' },
      { status: 500 }
    );
  }
}
