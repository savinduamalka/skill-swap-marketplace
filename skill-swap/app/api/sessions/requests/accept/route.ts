/**
 * Accept Session Request API Route
 *
 * When a session request is accepted:
 * 1. Transfer 5 credits from sender's outgoing to receiver's available
 * 2. Reserve 40 credits in sender's outgoing for the session
 * 3. Create a Session record
 * 4. Delete the session request
 *
 * @fileoverview POST /api/sessions/requests/accept
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SESSION_CREDITS = 40;

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
        sender: {
          select: { id: true, fullName: true },
        },
      },
    });

    if (!sessionRequest) {
      return NextResponse.json(
        { error: 'No pending session request found' },
        { status: 404 }
      );
    }

    const senderId = sessionRequest.senderId;

    // Get both wallets
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId: senderId },
    });
    const receiverWallet = await prisma.wallet.findUnique({
      where: { userId: receiverId },
    });

    if (!senderWallet || !receiverWallet) {
      return NextResponse.json(
        { error: 'Wallet not found for one or both users' },
        { status: 400 }
      );
    }

    // Check if sender has enough credits for the session (40 credits)
    if (senderWallet.availableBalance < SESSION_CREDITS) {
      return NextResponse.json(
        { error: 'Sender does not have enough credits for the session (40 credits required)' },
        { status: 400 }
      );
    }

    // Find the connection between users
    const [user1Id, user2Id] =
      senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];

    const connection = await prisma.connection.findUnique({
      where: {
        user1Id_user2Id: { user1Id, user2Id },
        status: 'ACTIVE',
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'Active connection not found' },
        { status: 400 }
      );
    }

    // Get or create a default skill for the session
    let skillId = sessionRequest.skillId;
    if (!skillId) {
      // Find a skill offered by the receiver (who will be the provider)
      const receiverSkill = await prisma.skill.findFirst({
        where: { ownerId: receiverId },
      });
      skillId = receiverSkill?.id || null;

      if (!skillId) {
        return NextResponse.json(
          { error: 'No skill found for the session' },
          { status: 400 }
        );
      }
    }

    const creditsFromRequest = sessionRequest.creditsHeld;

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update sender's wallet: remove request credits from outgoing
      await tx.wallet.update({
        where: { userId: senderId },
        data: {
          outgoingBalance: { decrement: creditsFromRequest },
        },
      });

      // 2. Update receiver's wallet: add request credits to available
      await tx.wallet.update({
        where: { userId: receiverId },
        data: {
          availableBalance: { increment: creditsFromRequest },
        },
      });

      // 3. Reserve session credits (40) from sender's available to outgoing
      await tx.wallet.update({
        where: { userId: senderId },
        data: {
          availableBalance: { decrement: SESSION_CREDITS },
          outgoingBalance: { increment: SESSION_CREDITS },
        },
      });

      // 4. Update sender's transaction to COMPLETED
      if (sessionRequest.transaction) {
        await tx.transaction.update({
          where: { id: sessionRequest.transaction.id },
          data: {
            status: 'COMPLETED',
            sessionRequestId: null,
            note: `Session request accepted - ${creditsFromRequest} credits transferred`,
          },
        });
      }

      // 5. Create transaction record for receiver (credits received)
      await tx.transaction.create({
        data: {
          walletId: receiverWallet.id,
          amount: creditsFromRequest,
          type: 'SESSION_REQUEST_RECEIVED',
          status: 'COMPLETED',
          relatedUserId: senderId,
          note: `Session request accepted - received ${creditsFromRequest} credits`,
        },
      });

      // 6. Create transaction for session credits reservation
      const sessionCreditsTx = await tx.transaction.create({
        data: {
          walletId: senderWallet.id,
          amount: -SESSION_CREDITS,
          type: 'SESSION_REQUEST_SENT',
          status: 'PENDING',
          relatedUserId: receiverId,
          note: `Session credits reserved: ${sessionRequest.sessionName}`,
        },
      });

      // 7. Create Session record
      const newSession = await tx.session.create({
        data: {
          learnerId: senderId,
          providerId: receiverId,
          skillId: skillId!,
          connectionId: connection.id,
          sessionName: sessionRequest.sessionName,
          description: sessionRequest.description,
          mode: sessionRequest.mode,
          startDate: sessionRequest.startDate,
          endDate: sessionRequest.endDate,
          requestCredits: creditsFromRequest,
          sessionCredits: SESSION_CREDITS,
          status: 'ACTIVE',
        },
      });

      // 8. Link transaction to session
      await tx.transaction.update({
        where: { id: sessionCreditsTx.id },
        data: { sessionId: newSession.id },
      });

      // 9. Delete the session request
      await tx.sessionRequest.delete({
        where: { id: sessionRequest.id },
      });

      return newSession;
    });

    return NextResponse.json({
      success: true,
      message: 'Session request accepted successfully',
      sessionId: result.id,
      creditsReceived: creditsFromRequest,
      creditsReserved: SESSION_CREDITS,
    });
  } catch (error) {
    console.error('Error accepting session request:', error);
    return NextResponse.json(
      { error: 'Failed to accept session request' },
      { status: 500 }
    );
  }
}
