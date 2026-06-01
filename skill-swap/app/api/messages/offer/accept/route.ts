/**
 * Accept Offer API Route
 *
 * POST - Accepts a negotiated credit offer sent in chat, processes wallets,
 *        creates a new active session, and logs transactions.
 *
 * @fileoverview POST /api/messages/offer/accept
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

    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    const userId = session.user.id;

    // Retrieve the message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Offer message not found' }, { status: 404 });
    }

    if (message.mediaType !== 'offer') {
      return NextResponse.json({ error: 'Message is not a credit offer' }, { status: 400 });
    }

    if (message.receiverId !== userId) {
      return NextResponse.json({ error: 'Only the recipient of the offer can accept it' }, { status: 403 });
    }

    // Parse offer content
    let offer: any;
    try {
      offer = JSON.parse(message.content);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid offer metadata format' }, { status: 400 });
    }

    if (offer.status !== 'PENDING') {
      return NextResponse.json({ error: `Offer is already ${offer.status.toLowerCase()}` }, { status: 400 });
    }

    // Identify Giver and Getter using skill ownership
    const skill = await prisma.skill.findUnique({
      where: { id: offer.skillId },
    });

    if (!skill) {
      return NextResponse.json({ error: 'The skill for this offer no longer exists' }, { status: 400 });
    }

    const providerId = skill.ownerId;
    // The other user is the learner
    const learnerId = providerId === message.senderId ? message.receiverId : message.senderId;

    // Fetch wallets
    const learnerWallet = await prisma.wallet.findUnique({
      where: { userId: learnerId },
    });
    const providerWallet = await prisma.wallet.findUnique({
      where: { userId: providerId },
    });

    if (!learnerWallet || !providerWallet) {
      return NextResponse.json({ error: 'Wallet not found for one or both users' }, { status: 400 });
    }

    const negotiatedCredits = Number(offer.credits);
    if (isNaN(negotiatedCredits) || negotiatedCredits < 5) {
      return NextResponse.json({ error: 'Invalid credit amount. Minimum is 5 credits.' }, { status: 400 });
    }

    const totalRequired = 5 + negotiatedCredits; // 5 credits upfront fee + negotiatedCredits reserved

    if (learnerWallet.availableBalance < totalRequired) {
      return NextResponse.json({
        error: `Insufficient credits. Learner needs ${totalRequired} credits (5 credits upfront + ${negotiatedCredits} credits for the session), but has only ${learnerWallet.availableBalance} credits.`,
      }, { status: 400 });
    }

    // Verify connection is active
    const [user1Id, user2Id] = learnerId < providerId ? [learnerId, providerId] : [providerId, learnerId];
    const connection = await prisma.connection.findUnique({
      where: {
        user1Id_user2Id: { user1Id, user2Id },
        status: 'ACTIVE',
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Active connection not found between users' }, { status: 400 });
    }

    // Run transaction
    const resultMessage = await prisma.$transaction(async (tx) => {
      // 1. Deduct upfront and reservation from learner's availableBalance
      // and add reservation to outgoingBalance
      await tx.wallet.update({
        where: { userId: learnerId },
        data: {
          availableBalance: { decrement: totalRequired },
          outgoingBalance: { increment: negotiatedCredits },
        },
      });

      // 2. Add upfront to provider's availableBalance
      await tx.wallet.update({
        where: { userId: providerId },
        data: {
          availableBalance: { increment: 5 },
        },
      });

      // 3. Create upfront transaction for learner
      await tx.transaction.create({
        data: {
          walletId: learnerWallet.id,
          amount: -5,
          type: 'SESSION_REQUEST_SENT',
          status: 'COMPLETED',
          relatedUserId: providerId,
          note: `Upfront fee for chat offer: ${offer.sessionName}`,
        },
      });

      // 4. Create upfront transaction for provider
      await tx.transaction.create({
        data: {
          walletId: providerWallet.id,
          amount: 5,
          type: 'SESSION_REQUEST_RECEIVED',
          status: 'COMPLETED',
          relatedUserId: learnerId,
          note: `Upfront fee received for chat offer: ${offer.sessionName}`,
        },
      });

      // 5. Create reservation transaction for learner (linked to session)
      const reservationTx = await tx.transaction.create({
        data: {
          walletId: learnerWallet.id,
          amount: -negotiatedCredits,
          type: 'SESSION_REQUEST_SENT',
          status: 'PENDING',
          relatedUserId: providerId,
          note: `Session credits reserved: ${offer.sessionName}`,
        },
      });

      // 6. Create the Session record
      const sessionRecord = await tx.session.create({
        data: {
          learnerId,
          providerId,
          skillId: offer.skillId,
          connectionId: connection.id,
          sessionName: offer.sessionName,
          description: offer.description || null,
          mode: offer.mode || 'ONLINE',
          startDate: new Date(offer.startDate),
          endDate: new Date(offer.endDate),
          requestCredits: 5,
          sessionCredits: negotiatedCredits,
          status: 'ACTIVE',
        },
      });

      // 7. Associate reservation transaction with session
      await tx.transaction.update({
        where: { id: reservationTx.id },
        data: { sessionId: sessionRecord.id },
      });

      // 8. Update the message content with accepted status and session reference
      const updatedOffer = {
        ...offer,
        status: 'ACCEPTED',
        sessionId: sessionRecord.id,
      };

      const updatedMsg = await tx.message.update({
        where: { id: messageId },
        data: {
          content: JSON.stringify(updatedOffer),
        },
        include: {
          sender: {
            select: { id: true, name: true, image: true },
          },
        },
      });

      return { updatedMsg, sessionRecord };
    });

    // Create a notification for the offer sender in the background
    const acceptingUserName = session.user.name || 'Someone';
    createNotification({
      userId: message.senderId,
      type: 'SESSION_ACCEPTED',
      title: 'Credit offer accepted',
      message: `${acceptingUserName} accepted your credit offer for: ${offer.sessionName}.`,
      relatedUserId: userId,
      relatedEntityId: resultMessage.sessionRecord.id,
      relatedEntityType: 'session',
    }).catch((error) => {
      console.error('Failed to create offer acceptance notification:', error);
    });

    return NextResponse.json({
      success: true,
      message: {
        id: resultMessage.updatedMsg.id,
        content: resultMessage.updatedMsg.content,
        senderId: resultMessage.updatedMsg.senderId,
        senderName: resultMessage.updatedMsg.sender.name,
        senderImage: resultMessage.updatedMsg.sender.image,
        createdAt: resultMessage.updatedMsg.createdAt,
        isRead: resultMessage.updatedMsg.isRead,
        isOwn: resultMessage.updatedMsg.senderId === userId,
        mediaUrl: resultMessage.updatedMsg.mediaUrl,
        mediaType: resultMessage.updatedMsg.mediaType,
        mediaName: resultMessage.updatedMsg.mediaName,
        mediaSize: resultMessage.updatedMsg.mediaSize,
        mediaThumbnail: resultMessage.updatedMsg.mediaThumbnail,
      },
      sessionId: resultMessage.sessionRecord.id,
    });
  } catch (error) {
    console.error('Error accepting chat offer:', error);
    return NextResponse.json(
      { error: 'Failed to accept offer due to a server error' },
      { status: 500 }
    );
  }
}
