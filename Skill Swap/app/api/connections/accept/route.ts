/**
 * Accept Connection Request API Route
 *
 * Handles accepting a pending connection request.
 * When a request is accepted:
 * 1. Updates the connection request status to ACCEPTED
 * 2. Transfers credits from sender's outgoingBalance to receiver's availableBalance
 * 3. Creates a Connection record between the two users
 * 4. Creates a transaction record for the receiver
 *
 * @fileoverview POST /api/connections/accept
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const CONNECTION_COST = 5;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const receiverId = session.user.id;

    // Find the pending connection request
    const connectionRequest = await prisma.connectionRequest.findFirst({
      where: {
        id: requestId,
        receiverId,
        status: 'PENDING',
      },
      include: {
        transaction: true,
        sender: {
          select: { id: true, fullName: true },
        },
      },
    });

    if (!connectionRequest) {
      return NextResponse.json(
        { error: 'No pending connection request found' },
        { status: 404 }
      );
    }

    const senderId = connectionRequest.senderId;

    // Get both wallets
    const [senderWallet, receiverWallet] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId: senderId } }),
      prisma.wallet.findUnique({ where: { userId: receiverId } }),
    ]);

    if (!senderWallet || !receiverWallet) {
      return NextResponse.json(
        { error: 'Wallet not found for one or both users' },
        { status: 400 }
      );
    }

    const creditsToTransfer = connectionRequest.creditsHeld;

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the connection request status to ACCEPTED
      await tx.connectionRequest.update({
        where: { id: connectionRequest.id },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      });

      // 2. Update sender's wallet: remove from outgoingBalance (credits already deducted from available)
      await tx.wallet.update({
        where: { userId: senderId },
        data: {
          outgoingBalance: { decrement: creditsToTransfer },
        },
      });

      // 3. Update receiver's wallet: add to availableBalance
      await tx.wallet.update({
        where: { userId: receiverId },
        data: {
          availableBalance: { increment: creditsToTransfer },
        },
      });

      // 4. Update sender's transaction to COMPLETED
      if (connectionRequest.transaction) {
        await tx.transaction.update({
          where: { id: connectionRequest.transaction.id },
          data: {
            status: 'COMPLETED',
            note: `Connection accepted - ${creditsToTransfer} credits transferred to receiver`,
          },
        });
      }

      // 5. Create transaction record for receiver (credits received)
      await tx.transaction.create({
        data: {
          walletId: receiverWallet.id,
          amount: creditsToTransfer,
          type: 'CONNECTION_REQUEST_RECEIVED',
          status: 'COMPLETED',
          relatedUserId: senderId,
          note: `Connection request accepted - received ${creditsToTransfer} credits`,
        },
      });

      // 6. Create Connection record between the two users
      // Always put the smaller ID as user1Id for consistency
      const [user1Id, user2Id] =
        senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];

      const connection = await tx.connection.create({
        data: {
          user1Id,
          user2Id,
          status: 'ACTIVE',
        },
      });

      return connection;
    });

    return NextResponse.json({
      success: true,
      message: 'Connection request accepted successfully',
      connectionId: result.id,
      creditsReceived: creditsToTransfer,
    });
  } catch (error) {
    console.error('Error accepting connection request:', error);
    return NextResponse.json(
      { error: 'Failed to accept connection request' },
      { status: 500 }
    );
  }
}
