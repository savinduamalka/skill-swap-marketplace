/**
 * Session Requests API Route
 *
 * GET - Fetch session requests (sent and received)
 * POST - Create a new session request
 *
 * @fileoverview /api/sessions/requests
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SESSION_REQUEST_COST = 5;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch sent session requests
    const sentRequests = await prisma.sessionRequest.findMany({
      where: {
        senderId: userId,
        status: 'PENDING',
      },
      include: {
        receiver: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch received session requests
    const receivedRequests = await prisma.sessionRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      sentRequests: sentRequests.map((req) => ({
        id: req.id,
        sessionName: req.sessionName,
        description: req.description,
        mode: req.mode,
        startDate: req.startDate,
        endDate: req.endDate,
        creditsHeld: req.creditsHeld,
        status: req.status,
        createdAt: req.createdAt,
        receiver: {
          id: req.receiver.id,
          fullName: req.receiver.fullName || req.receiver.name || 'User',
          profileImage: req.receiver.image,
          email: '',
        },
        sender: null,
        skill: null,
      })),
      receivedRequests: receivedRequests.map((req) => ({
        id: req.id,
        sessionName: req.sessionName,
        description: req.description,
        mode: req.mode,
        startDate: req.startDate,
        endDate: req.endDate,
        creditsHeld: req.creditsHeld,
        status: req.status,
        createdAt: req.createdAt,
        sender: {
          id: req.sender.id,
          fullName: req.sender.fullName || req.sender.name || 'User',
          profileImage: req.sender.image,
          email: '',
        },
        receiver: null,
        skill: null,
      })),
    });
  } catch (error) {
    console.error('Error fetching session requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, sessionName, description, mode, startDate, endDate } = body;

    // Validate required fields
    if (!receiverId || !sessionName || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const senderId = session.user.id;

    // Prevent sending request to self
    if (senderId === receiverId) {
      return NextResponse.json(
        { error: 'Cannot send session request to yourself' },
        { status: 400 }
      );
    }

    // Check if there's an active connection between users
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
        { error: 'You must be connected with this user to send a session request' },
        { status: 400 }
      );
    }

    // Check if there's already a pending session request between these users
    const existingRequest = await prisma.sessionRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId, status: 'PENDING' },
          { senderId: receiverId, receiverId: senderId, status: 'PENDING' },
        ],
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'There is already a pending session request between you and this user' },
        { status: 400 }
      );
    }

    // Get sender's wallet
    const senderWallet = await prisma.wallet.findUnique({
      where: { userId: senderId },
    });

    if (!senderWallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 400 }
      );
    }

    // Check if sender has enough credits
    if (senderWallet.availableBalance < SESSION_REQUEST_COST) {
      return NextResponse.json(
        { error: 'Insufficient credits. You need 5 credits to send a session request.' },
        { status: 400 }
      );
    }

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Deduct credits from sender's available balance and add to outgoing
      await tx.wallet.update({
        where: { userId: senderId },
        data: {
          availableBalance: { decrement: SESSION_REQUEST_COST },
          outgoingBalance: { increment: SESSION_REQUEST_COST },
        },
      });

      // 2. Create the session request
      const sessionRequest = await tx.sessionRequest.create({
        data: {
          senderId,
          receiverId,
          sessionName,
          description: description || null,
          mode: mode || 'ONLINE',
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          creditsHeld: SESSION_REQUEST_COST,
        },
      });

      // 3. Create transaction record
      await tx.transaction.create({
        data: {
          walletId: senderWallet.id,
          amount: -SESSION_REQUEST_COST,
          type: 'SESSION_REQUEST_SENT',
          status: 'PENDING',
          relatedUserId: receiverId,
          sessionRequestId: sessionRequest.id,
          note: `Session request sent: ${sessionName}`,
        },
      });

      return sessionRequest;
    });

    return NextResponse.json({
      success: true,
      message: 'Session request sent successfully',
      requestId: result.id,
      creditsDeducted: SESSION_REQUEST_COST,
    });
  } catch (error) {
    console.error('Error creating session request:', error);
    return NextResponse.json(
      { error: 'Failed to create session request' },
      { status: 500 }
    );
  }
}
