/**
 * Decline Connection Request API Route
 *
 * Handles declining a pending connection request.
 * When a request is declined:
 * 1. Deletes the connection request from the database
 * 2. Refunds the held credits back to sender's availableBalance
 * 3. Updates the transaction status to REFUNDED
 *
 * @fileoverview POST /api/connections/decline
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';

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
      },
    });

    if (!connectionRequest) {
      return NextResponse.json(
        { error: 'No pending connection request found' },
        { status: 404 }
      );
    }

    const senderId = connectionRequest.senderId;

    // Get sender's wallet for refund
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId: senderId },
    });

    if (!senderWallet) {
      return NextResponse.json(
        { error: 'Sender wallet not found' },
        { status: 400 }
      );
    }

    const creditsToRefund = connectionRequest.creditsHeld;
    const transactionId = connectionRequest.transaction?.id;

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Update the transaction status to REFUNDED first (remove FK reference before deleting request)
      if (transactionId) {
        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'REFUNDED',
            connectionRequestId: null, // Remove the reference before deleting
            note: `Connection request declined - ${creditsToRefund} credits refunded to sender`,
          },
        });
      }

      // 2. Delete the connection request from database
      // This allows either user to send a new request in the future
      await tx.connectionRequest.delete({
        where: { id: connectionRequest.id },
      });

      // 3. Refund credits: move from outgoingBalance back to availableBalance
      await tx.wallet.update({
        where: { userId: senderId },
        data: {
          availableBalance: { increment: creditsToRefund },
          outgoingBalance: { decrement: creditsToRefund },
        },
      });
    });

    // Notify the sender that their request was declined
    const declinedByName = session.user.name || 'Someone';
    createNotification({
      userId: senderId,
      type: 'CONNECTION_DECLINED',
      title: 'Connection request declined',
      message: `${declinedByName} declined your connection request. Your credits have been refunded.`,
      relatedUserId: receiverId,
      relatedEntityType: 'connection_request',
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      message: 'Connection request declined successfully',
      creditsRefunded: creditsToRefund,
    });
  } catch (error) {
    console.error('Error declining connection request:', error);
    return NextResponse.json(
      { error: 'Failed to decline connection request' },
      { status: 500 }
    );
  }
}
