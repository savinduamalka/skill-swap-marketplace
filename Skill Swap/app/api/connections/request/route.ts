/**
 * Connection Request API Route
 *
 * Handles sending connection requests between users.
 * When a request is sent:
 * 1. Validates the sender has sufficient balance
 * 2. Creates a connection request record
 * 3. Puts 5 credits on hold in sender's outgoingBalance
 * 4. Creates a pending transaction record
 *
 * @fileoverview POST /api/connections/request
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
    const { receiverId } = body;

    if (!receiverId) {
      return NextResponse.json(
        { error: 'Receiver ID is required' },
        { status: 400 }
      );
    }

    const senderId = session.user.id;

    // Cannot send request to yourself
    if (senderId === receiverId) {
      return NextResponse.json(
        { error: 'Cannot send connection request to yourself' },
        { status: 400 }
      );
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, fullName: true, name: true },
    });

    if (!receiver) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already connected
    const existingConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { user1Id: senderId, user2Id: receiverId, status: 'ACTIVE' },
          { user1Id: receiverId, user2Id: senderId, status: 'ACTIVE' },
        ],
      },
    });

    if (existingConnection) {
      return NextResponse.json(
        { error: 'You are already connected with this user' },
        { status: 400 }
      );
    }

    // Check if there's already a pending request (either direction)
    const existingRequest = await prisma.connectionRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId, status: 'PENDING' },
          { senderId: receiverId, receiverId: senderId, status: 'PENDING' },
        ],
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          error:
            'A connection request already exists between you and this user',
        },
        { status: 400 }
      );
    }

    // Get sender's wallet
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId: senderId },
    });

    if (!senderWallet) {
      return NextResponse.json(
        { error: 'Wallet not found. Please contact support.' },
        { status: 400 }
      );
    }

    // Check if sender has sufficient available balance
    if (senderWallet.availableBalance < CONNECTION_COST) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          message: `You need at least ${CONNECTION_COST} credits to send a connection request. Your current balance is ${senderWallet.availableBalance} credits.`,
        },
        { status: 400 }
      );
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the connection request
      const connectionRequest = await tx.connectionRequest.create({
        data: {
          senderId,
          receiverId,
          status: 'PENDING',
          creditsHeld: CONNECTION_COST,
        },
      });

      // 2. Update sender's wallet - move credits from available to outgoing
      await tx.wallet.update({
        where: { userId: senderId },
        data: {
          availableBalance: { decrement: CONNECTION_COST },
          outgoingBalance: { increment: CONNECTION_COST },
        },
      });

      // 3. Create a transaction record for tracking
      await tx.transaction.create({
        data: {
          walletId: senderWallet.id,
          amount: CONNECTION_COST,
          type: 'CONNECTION_REQUEST_SENT',
          status: 'PENDING',
          relatedUserId: receiverId,
          connectionRequestId: connectionRequest.id,
          note: `Connection request sent to ${
            receiver.fullName || receiver.name || 'User'
          }`,
        },
      });

      return connectionRequest;
    });

    return NextResponse.json({
      success: true,
      message: 'Connection request sent successfully',
      connectionRequest: {
        id: result.id,
        receiverId: result.receiverId,
        status: result.status,
        creditsHeld: result.creditsHeld,
        createdAt: result.createdAt,
      },
    });
  } catch (error) {
    console.error('Error sending connection request:', error);

    // Handle unique constraint violation (duplicate request)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A connection request already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to send connection request' },
      { status: 500 }
    );
  }
}
