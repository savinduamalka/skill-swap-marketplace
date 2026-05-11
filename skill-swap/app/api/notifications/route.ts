import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const DEFAULT_PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(
      searchParams.get('limit') || String(DEFAULT_PAGE_SIZE),
      10
    );

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = notifications.length > limit;
    const notificationsToReturn = hasMore
      ? notifications.slice(0, -1)
      : notifications;

    const nextCursor = hasMore
      ? notificationsToReturn[notificationsToReturn.length - 1]?.id
      : null;

    return NextResponse.json({
      notifications: notificationsToReturn,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
