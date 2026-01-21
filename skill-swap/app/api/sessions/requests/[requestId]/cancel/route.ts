/**
 * Cancel Session Request API Route
 *
 * DELETE - Cancel a pending session request (sender only)
 * Refunds 5 credits back to sender
 *
 * @fileoverview DELETE /api/sessions/requests/[requestId]/cancel
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { requestId } = await params;
    const userId = session.user.id;

    // Find the session request
    const sessionRequest = await prisma.sessionRequest.findUnique({
      where: { id: requestId },
    });

    if (!sessionRequest) {
      return NextResponse.json(
        { error: 'Session request not found' },
        { status: 404 }
      );
    }

    // Only sender can cancel
    if (sessionRequest.senderId !== userId) {
      return NextResponse.json(
        { error: 'Only the sender can cancel this request' },
        { status: 403 }
      );
    }

    if (sessionRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending requests can be cancelled' },
        { status: 400 }
      );
    }

    // Get sender's wallet
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!senderWallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 400 }
      );
    }

    // Refund credits and delete request
    await prisma.$transaction(async (tx) => {
      // 1. Refund 5 credits from outgoing to available
      await tx.wallet.update({
        where: { userId },
        data: {
          outgoingBalance: { decrement: 5 },
          availableBalance: { increment: 5 },
        },
      });

      // 2. Create transaction record
      await tx.transaction.create({
        data: {
          walletId: senderWallet.id,
          amount: 5,
          type: 'SESSION_REQUEST_CANCELLED',
          status: 'COMPLETED',
          relatedUserId: sessionRequest.receiverId,
          note: `Session request cancelled: ${sessionRequest.sessionName}`,
        },
      });

      // 3. Delete the session request
      await tx.sessionRequest.delete({
        where: { id: requestId },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Session request cancelled. 5 credits have been refunded.',
      creditsRefunded: 5,
    });
  } catch (error) {
    console.error('Error cancelling session request:', error);
    return NextResponse.json(
      { error: 'Failed to cancel session request' },
      { status: 500 }
    );
  }
}
