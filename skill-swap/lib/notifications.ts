import { prisma } from '@/lib/prisma';

const SOCKET_SERVER_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL;
const SOCKET_SHARED_SECRET = process.env.SOCKET_SECRET;

export type NotificationCreateInput = {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedUserId?: string | null;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
};

export async function createNotification(input: NotificationCreateInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedUserId: input.relatedUserId ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      isSeen: false,
      isRead: false,
    },
  });

  await emitNotification(notification.userId, notification);
  return notification;
}

async function emitNotification(userId: string, notification: unknown) {
  if (!SOCKET_SHARED_SECRET) return;

  try {
    await fetch(`${SOCKET_SERVER_URL}/internal/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-socket-secret': SOCKET_SHARED_SECRET,
      },
      body: JSON.stringify({ userId, notification }),
    });
  } catch (error) {
    console.error('Failed to emit notification:', error);
  }
}
