/**
 * Session Cancellation API Route
 *
 * POST - Request to cancel an active session
 * REQUIRES MUTUAL CONSENT: Both learner and provider must agree to cancel
 * When both agree, credits are refunded to the learner
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

    // Check if user has already requested cancellation
    if (isLearner && sessionRecord.learnerCancellationRequested) {
      return NextResponse.json(
        { error: 'You have already requested cancellation. Waiting for the other party to agree.' },
        { status: 400 }
      );
    }

    if (isProvider && sessionRecord.providerCancellationRequested) {
      return NextResponse.json(
        { error: 'You have already requested cancellation. Waiting for the other party to agree.' },
        { status: 400 }
      );
    }

    // Check if this cancellation request will complete the cancellation (mutual consent)
    const willCancel =
      (isLearner && sessionRecord.providerCancellationRequested) ||
      (isProvider && sessionRecord.learnerCancellationRequested);

    if (willCancel) {
      // Both parties have agreed - cancel the session and refund credits
      const learnerWallet = await prisma.wallet.findUnique({
        where: { userId: sessionRecord.learnerId },
      });

      if (!learnerWallet) {
        return NextResponse.json(
          { error: 'Wallet not found' },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        // 1. Mark session as cancelled with both flags
        await tx.session.update({
          where: { id: sessionId },
          data: {
            status: 'CANCELLED',
            learnerCancellationRequested: true,
            providerCancellationRequested: true,
            cancelledBy: userId,
            cancelReason: reason || 'Mutual cancellation agreement',
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
            note: `Session cancelled by mutual agreement: ${sessionRecord.sessionName} - ${sessionRecord.sessionCredits} credits refunded`,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Session cancelled by mutual agreement. Credits have been refunded to the learner.',
        sessionCancelled: true,
        creditsRefunded: sessionRecord.sessionCredits,
      });
    } else {
      // Update only this user's cancellation flag
      await prisma.session.update({
        where: { id: sessionId },
        data: isLearner
          ? { learnerCancellationRequested: true, cancelReason: reason || null }
          : { providerCancellationRequested: true, cancelReason: reason || null },
      });

      const otherUser = isLearner ? sessionRecord.provider : sessionRecord.learner;

      return NextResponse.json({
        success: true,
        message: `Cancellation requested. Waiting for ${otherUser.fullName || 'the other party'} to agree.`,
        sessionCancelled: false,
        waitingFor: isLearner ? 'provider' : 'learner',
      });
    }
  } catch (error) {
    console.error('Error cancelling session:', error);
    return NextResponse.json(
      { error: 'Failed to cancel session' },
      { status: 500 }
    );
  }
}
