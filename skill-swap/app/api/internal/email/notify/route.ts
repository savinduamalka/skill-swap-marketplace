/**
 * Internal Email Notification API
 *
 * Server-to-server endpoint called by the Socket server to trigger
 * email notifications for messages. Protected by shared secret.
 *
 * @fileoverview POST /api/internal/email/notify
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendNewMessageEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  // Authenticate via shared secret (server-to-server)
  const secret = request.headers.get('x-socket-secret');
  if (!secret || secret !== process.env.SOCKET_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, receiverId, senderName, messagePreview } = body;

    if (!type || !receiverId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch receiver's email and notification preferences
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: {
        email: true,
        fullName: true,
        name: true,
        notifyEmail: true,
        notifyMessages: true,
      },
    });

    if (!receiver || !receiver.email) {
      return NextResponse.json({ success: false, reason: 'No email found' });
    }

    // Check preferences (default to true if fields aren't set)
    if (receiver.notifyEmail === false || receiver.notifyMessages === false) {
      return NextResponse.json({ success: false, reason: 'Notifications disabled' });
    }

    if (type === 'NEW_MESSAGE') {
      const receiverName = receiver.fullName || receiver.name || 'there';
      const result = await sendNewMessageEmail(
        receiver.email,
        senderName || 'Someone',
        receiverName,
        messagePreview || 'You have a new message'
      );
      return NextResponse.json({ success: result.success, messageId: result.messageId });
    }

    return NextResponse.json({ success: false, reason: 'Unknown notification type' });
  } catch (error) {
    console.error('[Internal Email Notify] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification email' },
      { status: 500 }
    );
  }
}
