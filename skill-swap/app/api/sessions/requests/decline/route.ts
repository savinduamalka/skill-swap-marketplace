/**
 * Decline Session Request API Route
 *
 * When a session request is declined:
 * 1. Refund 5 credits from sender's outgoing back to available
 * 2. Update transaction status
 * 3. Delete the session request
 *
 * @fileoverview POST /api/sessions/requests/decline
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
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const receiverId = session.user.id;

    // Find the pending session request
    const sessionRequest = await prisma.sessionRequest.findFirst({
      where: {
        id: requestId,
        receiverId,
        status: 'PENDING',
      },
      include: {
        transaction: true,
      },
    });

    if (!sessionRequest) {
      return NextResponse.json(
        { error: 'No pending session request found' },
        { status: 404 }
      );
    }

    const senderId = sessionRequest.senderId;
    const creditsToRefund = sessionRequest.creditsHeld;

    // Get sender's wallet
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId: senderId },
    });

    if (!senderWallet) {
      return NextResponse.json(
        { error: 'Sender wallet not found' },
        { status: 400 }
      );
    }

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Update the session request status
      await tx.sessionRequest.update({
        where: { id: sessionRequest.id },
        data: {
          status: 'DECLINED',
          respondedAt: new Date(),
        },
      });

      // 2. Refund credits to sender: move from outgoing back to available
      await tx.wallet.update({
        where: { userId: senderId },
        data: {
          outgoingBalance: { decrement: creditsToRefund },
          availableBalance: { increment: creditsToRefund },
        },
      });

      // 3. Update sender's transaction to REFUNDED
      if (sessionRequest.transaction) {
        await tx.transaction.update({
          where: { id: sessionRequest.transaction.id },
          data: {
            status: 'REFUNDED',
            sessionRequestId: null,
            note: `Session request declined - ${creditsToRefund} credits refunded`,
          },
        });
      }

      // 4. Create refund transaction record
      await tx.transaction.create({
        data: {
          walletId: senderWallet.id,
          amount: creditsToRefund,
          type: 'SESSION_REQUEST_REFUNDED',
          status: 'COMPLETED',
          relatedUserId: receiverId,
          note: `Session request declined - ${creditsToRefund} credits refunded`,
        },
      });

      // 5. Delete the session request
      await tx.sessionRequest.delete({
        where: { id: sessionRequest.id },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Session request declined',
    });
  } catch (error) {
    console.error('Error declining session request:', error);
    return NextResponse.json(
      { error: 'Failed to decline session request' },
      { status: 500 }
    );
  }
}
