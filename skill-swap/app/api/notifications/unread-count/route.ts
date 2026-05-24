import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [unreadCount, pendingConnections, pendingSessions] = await Promise.all([
      prisma.notification.count({
        where: {
          userId: session.user.id,
          isSeen: false,
        },
      }),
      prisma.connectionRequest.count({
        where: {
          receiverId: session.user.id,
          status: 'PENDING',
        },
      }),
      prisma.sessionRequest.count({
        where: {
          receiverId: session.user.id,
          status: 'PENDING',
        },
      }),
    ]);

    return NextResponse.json({ unreadCount, pendingConnections, pendingSessions });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification count' },
      { status: 500 }
    );
  }
}
