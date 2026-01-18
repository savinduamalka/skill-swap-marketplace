import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Delete user and all related data in a transaction
    // Most relations have onDelete: Cascade, so deleting the user
    // will automatically delete related records
    await prisma.$transaction(async (tx) => {
      // Delete user's skills (via ownerId relation)
      await tx.skill.deleteMany({
        where: { ownerId: userId },
      });

      // Delete user's skills wanted
      await tx.skillWant.deleteMany({
        where: { userId },
      });

      // Delete user's wallet
      await tx.wallet.deleteMany({
        where: { userId },
      });

      // Delete reviews where user is reviewer or reviewed
      await tx.review.deleteMany({
        where: {
          OR: [{ reviewedByUserId: userId }, { reviewedUserId: userId }],
        },
      });

      // Delete sessions where user is learner or provider
      await tx.session.deleteMany({
        where: {
          OR: [{ learnerId: userId }, { providerId: userId }],
        },
      });

      // Delete messages where user is sender or receiver
      await tx.message.deleteMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
      });

      // Delete connections where user is involved
      await tx.connection.deleteMany({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
      });

      // Delete connection requests
      await tx.connectionRequest.deleteMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
      });

      // Delete session requests
      await tx.sessionRequest.deleteMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
      });

      // Delete notifications for user
      await tx.notification.deleteMany({
        where: { userId },
      });

      // Delete accounts (OAuth)
      await tx.account.deleteMany({
        where: { userId },
      });

      // Finally, delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
