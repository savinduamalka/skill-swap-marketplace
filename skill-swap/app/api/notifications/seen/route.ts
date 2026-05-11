import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isSeen: false,
      },
      data: {
        isSeen: true,
      },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('Error marking notifications seen:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications seen' },
      { status: 500 }
    );
  }
}
