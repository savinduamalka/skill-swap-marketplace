/**
 * Notification Preferences API Route
 *
 * GET  - Retrieve the authenticated user's email notification preferences
 * PUT  - Update the authenticated user's email notification preferences
 *
 * @fileoverview /api/user/notifications/preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/notifications/preferences
 * Returns the user's current notification settings
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        notifyEmail: true,
        notifyConnectionReq: true,
        notifySessionReminder: true,
        notifyMessages: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('[NotificationPrefs] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/notifications/preferences
 * Updates one or more notification preference fields
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Whitelist only valid preference fields to prevent unwanted updates
    const allowedFields = [
      'notifyEmail',
      'notifyConnectionReq',
      'notifySessionReminder',
      'notifyMessages',
    ] as const;

    const updateData: Record<string, boolean> = {};

    for (const field of allowedFields) {
      if (typeof body[field] === 'boolean') {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid preference fields provided' },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        notifyEmail: true,
        notifyConnectionReq: true,
        notifySessionReminder: true,
        notifyMessages: true,
      },
    });

    return NextResponse.json({ success: true, preferences: updated });
  } catch (error) {
    console.error('[NotificationPrefs] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
