/**
 * Block/Unblock User API Route
 *
 * Handles blocking and unblocking users.
 * When a user is blocked:
 * - They cannot view the blocker's profile
 * - They cannot send connection requests
 * - They won't appear in search results for each other
 * - Any pending connection requests are cancelled
 *
 * @fileoverview POST /api/users/block (block) and DELETE /api/users/block (unblock)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST - Block a user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const blockerId = session.user.id;

    // Can't block yourself
    if (blockerId === userId) {
      return NextResponse.json(
        { error: 'You cannot block yourself' },
        { status: 400 }
      );
    }

    // Check if user exists
    const userToBlock = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToBlock) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already blocked
    const existingBlock = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: userId,
        },
      },
    });

    if (existingBlock) {
      return NextResponse.json(
        { error: 'User is already blocked' },
        { status: 400 }
      );
    }

    // Use transaction to block user and clean up related data
    await prisma.$transaction(async (tx) => {
      // 1. Create block record
      await tx.blockedUser.create({
        data: {
          blockerId,
          blockedId: userId,
          reason: reason || null,
        },
      });

      // 2. Delete any non-pending (DECLINED/CANCELLED) requests to allow future re-requests after unblock
      await tx.connectionRequest.deleteMany({
        where: {
          OR: [
            {
              senderId: blockerId,
              receiverId: userId,
              status: { in: ['DECLINED', 'CANCELLED'] },
            },
            {
              senderId: userId,
              receiverId: blockerId,
              status: { in: ['DECLINED', 'CANCELLED'] },
            },
          ],
        },
      });

      // 3. Cancel any pending connection requests between the two users (both directions)
      // First, find and refund any pending requests
      const pendingRequests = await tx.connectionRequest.findMany({
        where: {
          OR: [
            { senderId: blockerId, receiverId: userId, status: 'PENDING' },
            { senderId: userId, receiverId: blockerId, status: 'PENDING' },
          ],
        },
        include: { transaction: true },
      });

      for (const request of pendingRequests) {
        // Refund credits to sender
        await tx.wallet.update({
          where: { userId: request.senderId },
          data: {
            availableBalance: { increment: request.creditsHeld },
            outgoingBalance: { decrement: request.creditsHeld },
          },
        });

        // Update transaction if exists
        if (request.transaction) {
          await tx.transaction.update({
            where: { id: request.transaction.id },
            data: {
              status: 'REFUNDED',
              connectionRequestId: null,
              note: 'Connection request cancelled due to user block',
            },
          });
        }

        // Delete the request
        await tx.connectionRequest.delete({
          where: { id: request.id },
        });
      }

      // 3. End any active connections between the users
      await tx.connection.updateMany({
        where: {
          OR: [
            { user1Id: blockerId, user2Id: userId },
            { user1Id: userId, user2Id: blockerId },
          ],
          status: 'ACTIVE',
        },
        data: {
          status: 'ENDED',
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'User blocked successfully',
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json(
      { error: 'Failed to block user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Unblock a user
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const blockerId = session.user.id;

    // Check if block exists
    const existingBlock = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: userId,
        },
      },
    });

    if (!existingBlock) {
      return NextResponse.json(
        { error: 'User is not blocked' },
        { status: 404 }
      );
    }

    // Delete the block record
    await prisma.blockedUser.delete({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: userId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User unblocked successfully',
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return NextResponse.json(
      { error: 'Failed to unblock user' },
      { status: 500 }
    );
  }
}
