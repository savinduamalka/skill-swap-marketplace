/**
 * Decline/Withdraw Offer API Route
 *
 * POST - Declines or withdraws a negotiated credit offer in chat.
 *
 * @fileoverview POST /api/messages/offer/decline
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

    const { messageId, action } = await request.json();

    if (!messageId || !action) {
      return NextResponse.json({ error: 'Message ID and action are required' }, { status: 400 });
    }

    if (action !== 'DECLINE' && action !== 'WITHDRAW') {
      return NextResponse.json({ error: 'Invalid action. Must be DECLINE or WITHDRAW' }, { status: 400 });
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

    // Authorization checks
    if (action === 'DECLINE') {
      if (message.receiverId !== userId) {
        return NextResponse.json({ error: 'Only the recipient of the offer can decline it' }, { status: 403 });
      }
      offer.status = 'DECLINED';
    } else if (action === 'WITHDRAW') {
      if (message.senderId !== userId) {
        return NextResponse.json({ error: 'Only the sender of the offer can withdraw it' }, { status: 403 });
      }
      offer.status = 'WITHDRAWN';
    }

    // Save update in DB
    const updatedMsg = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: JSON.stringify(offer),
      },
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: {
        id: updatedMsg.id,
        content: updatedMsg.content,
        senderId: updatedMsg.senderId,
        senderName: updatedMsg.sender.name,
        senderImage: updatedMsg.sender.image,
        createdAt: updatedMsg.createdAt,
        isRead: updatedMsg.isRead,
        isOwn: updatedMsg.senderId === userId,
        mediaUrl: updatedMsg.mediaUrl,
        mediaType: updatedMsg.mediaType,
        mediaName: updatedMsg.mediaName,
        mediaSize: updatedMsg.mediaSize,
        mediaThumbnail: updatedMsg.mediaThumbnail,
      },
    });
  } catch (error) {
    console.error('Error declining/withdrawing chat offer:', error);
    return NextResponse.json(
      { error: 'Failed to update offer due to a server error' },
      { status: 500 }
    );
  }
}
