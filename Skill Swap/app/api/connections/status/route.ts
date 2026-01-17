/**
 * Connection Status API Route
 *
 * Debug endpoint to check connection status between two users.
 *
 * @fileoverview GET /api/connections/status
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

    const { searchParams } = new URL(request.url);
    const receiverId = searchParams.get('receiverId');

    if (!receiverId) {
      return NextResponse.json(
        { error: 'Receiver ID is required' },
        { status: 400 }
      );
    }

    const senderId = session.user.id;

    // Check all connection requests between these users
    const connectionRequests = await prisma.connectionRequest.findMany({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Check connections
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { user1Id: senderId, user2Id: receiverId },
          { user1Id: receiverId, user2Id: senderId },
        ],
      },
    });

    // Get wallet info
    const wallet = await prisma.wallet.findUnique({
      where: { userId: senderId },
    });

    return NextResponse.json({
      senderId,
      receiverId,
      connectionRequests,
      connections,
      wallet: wallet
        ? {
            availableBalance: wallet.availableBalance,
            outgoingBalance: wallet.outgoingBalance,
            incomingBalance: wallet.incomingBalance,
          }
        : null,
    });
  } catch (error) {
    console.error('Error checking connection status:', error);
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    );
  }
}
