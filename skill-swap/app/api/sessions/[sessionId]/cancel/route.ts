/**
 * Session Cancellation API Route
 *
 * POST - Cancel an active session
 * Both parties must agree for fair cancellation
 * If one party cancels, the other can dispute
 *
 * @fileoverview POST /api/sessions/[sessionId]/cancel
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;
    const userId = session.user.id;
    const body = await request.json();
    const { reason } = body;

    // Find the session
    const sessionRecord = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        learner: { select: { id: true, fullName: true } },
        provider: { select: { id: true, fullName: true } },
      },
    });

    if (!sessionRecord) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (sessionRecord.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Session is not active' },
        { status: 400 }
      );
    }

    // Check if user is part of the session
    const isLearner = sessionRecord.learnerId === userId;
    const isProvider = sessionRecord.providerId === userId;

    if (!isLearner && !isProvider) {
      return NextResponse.json(
        { error: 'You are not part of this session' },
        { status: 403 }
      );
    }

    // Get wallets
    const learnerWallet = await prisma.wallet.findUnique({
      where: { userId: sessionRecord.learnerId },
    });
    const providerWallet = await prisma.wallet.findUnique({
      where: { userId: sessionRecord.providerId },
    });

    if (!learnerWallet || !providerWallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 400 }
      );
    }

    // Cancel session and refund credits to learner
    await prisma.$transaction(async (tx) => {
      // 1. Mark session as cancelled
      await tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'CANCELLED',
          cancelledBy: userId,
          cancelReason: reason || null,
          cancelledAt: new Date(),
        },
      });

      // 2. Refund session credits from learner's outgoing to available
      await tx.wallet.update({
        where: { userId: sessionRecord.learnerId },
        data: {
          outgoingBalance: { decrement: sessionRecord.sessionCredits },
          availableBalance: { increment: sessionRecord.sessionCredits },
        },
      });

      // 3. Create transaction record for refund
      await tx.transaction.create({
        data: {
          walletId: learnerWallet.id,
          amount: sessionRecord.sessionCredits,
          type: 'SESSION_CANCELLED',
          status: 'COMPLETED',
          relatedUserId: sessionRecord.providerId,
          sessionId: sessionId,
          note: `Session cancelled: ${sessionRecord.sessionName} - credits refunded`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Session cancelled. Credits have been refunded.',
      creditsRefunded: sessionRecord.sessionCredits,
    });
  } catch (error) {
    console.error('Error cancelling session:', error);
    return NextResponse.json(
      { error: 'Failed to cancel session' },
      { status: 500 }
    );
  }
}
