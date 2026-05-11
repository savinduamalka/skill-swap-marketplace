import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, relatedEntityId, type } = body as {
      id?: string;
      relatedEntityId?: string;
      type?: string;
    };

    if (!id && !relatedEntityId) {
      return NextResponse.json(
        { error: 'Notification id or relatedEntityId is required' },
        { status: 400 }
      );
    }

    const where = id
      ? { id, userId: session.user.id }
      : {
          userId: session.user.id,
          relatedEntityId,
          ...(type ? { type } : {}),
        };

    const result = await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('Error marking notification read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification read' },
      { status: 500 }
    );
  }
}
