/**
 * Session Completion API Route
 *
 * POST - Confirm session completion
 * When both learner and provider confirm, the session is completed
 * and 40 credits transfer to the provider
 *
 * @fileoverview POST /api/sessions/[sessionId]/complete
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

    // Check if already confirmed
    if (isLearner && sessionRecord.learnerCompletionConfirmed) {
      return NextResponse.json(
        { error: 'You have already confirmed completion' },
        { status: 400 }
      );
    }

    if (isProvider && sessionRecord.providerCompletionConfirmed) {
      return NextResponse.json(
        { error: 'You have already confirmed completion' },
        { status: 400 }
      );
    }

    // Determine if this confirmation will complete the session
    const willComplete =
      (isLearner && sessionRecord.providerCompletionConfirmed) ||
      (isProvider && sessionRecord.learnerCompletionConfirmed);

    if (willComplete) {
      // Both parties have confirmed - complete the session and transfer credits
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

      await prisma.$transaction(async (tx) => {
        // 1. Mark session as completed
        await tx.session.update({
          where: { id: sessionId },
          data: {
            status: 'COMPLETED',
            learnerCompletionConfirmed: true,
            providerCompletionConfirmed: true,
            completedAt: new Date(),
          },
        });

        // 2. Transfer session credits from learner's outgoing to provider's available
        await tx.wallet.update({
          where: { userId: sessionRecord.learnerId },
          data: {
            outgoingBalance: { decrement: sessionRecord.sessionCredits },
          },
        });

        await tx.wallet.update({
          where: { userId: sessionRecord.providerId },
          data: {
            availableBalance: { increment: sessionRecord.sessionCredits },
          },
        });

        // 3. Create transaction records
        await tx.transaction.create({
          data: {
            walletId: learnerWallet.id,
            amount: -sessionRecord.sessionCredits,
            type: 'SESSION_COMPLETED',
            status: 'COMPLETED',
            relatedUserId: sessionRecord.providerId,
            sessionId: sessionId,
            note: `Session completed: ${sessionRecord.sessionName}`,
          },
        });

        await tx.transaction.create({
          data: {
            walletId: providerWallet.id,
            amount: sessionRecord.sessionCredits,
            type: 'SESSION_COMPLETED',
            status: 'COMPLETED',
            relatedUserId: sessionRecord.learnerId,
            sessionId: sessionId,
            note: `Session completed: ${sessionRecord.sessionName} - earned ${sessionRecord.sessionCredits} credits`,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Session completed! Credits have been transferred.',
        sessionCompleted: true,
        creditsTransferred: sessionRecord.sessionCredits,
      });
    } else {
      // Update the confirmation flag
      await prisma.session.update({
        where: { id: sessionId },
        data: isLearner
          ? { learnerCompletionConfirmed: true }
          : { providerCompletionConfirmed: true },
      });

      return NextResponse.json({
        success: true,
        message: 'Completion confirmed. Waiting for the other party to confirm.',
        sessionCompleted: false,
        waitingFor: isLearner ? 'provider' : 'learner',
      });
    }
  } catch (error) {
    console.error('Error completing session:', error);
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}
