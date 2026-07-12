/**
 * Admin User Management API
 *
 * GET - List users with search/filter (paginated)
 * PATCH - Update user status (suspend/restore)
 *
 * Security: Only allows suspend/restore actions.
 * isAdmin and isVerified are NEVER settable via request body from users.
 *
 * @fileoverview /api/admin/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { verifyAdmin, sanitizePagination } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { error } = await verifyAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    const { page, limit, skip } = sanitizePagination(searchParams);

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filter === 'active') {
      where.isVerified = true;
    } else if (filter === 'suspended') {
      where.isVerified = false;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          name: true,
          email: true,
          image: true,
          isAdmin: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              skillsOffered: true,
              connections: true,
              newsfeedPosts: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { session, error } = await verifyAdmin();
    if (error || !session?.user?.id) return error!;

    const body = await request.json();
    // Strict extraction — only userId and action are accepted
    // Any other fields (isAdmin, isVerified, etc.) are ignored
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action are required' }, { status: 400 });
    }

    // Only allow specific actions — no arbitrary field updates
    if (!['suspend', 'restore'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use "suspend" or "restore"' }, { status: 400 });
    }

    // Cannot suspend yourself
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot modify your own account' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isAdmin: true, fullName: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cannot suspend another admin
    if (targetUser.isAdmin) {
      return NextResponse.json({ error: 'Cannot suspend admin users' }, { status: 400 });
    }

    const isVerified = action === 'restore';

    await prisma.user.update({
      where: { id: userId },
      data: { isVerified },
    });

    // Notify the user
    if (action === 'suspend') {
      await createNotification({
        userId,
        type: 'ACCOUNT_SUSPENDED',
        title: 'Account Suspended',
        message: 'Your account has been suspended due to a violation of community guidelines. Contact skillswap@gmail.com for assistance.',
      });
    } else {
      await createNotification({
        userId,
        type: 'ACCOUNT_RESTORED',
        title: 'Account Restored',
        message: 'Your account has been restored. You can now access all platform features again.',
      });
    }

    return NextResponse.json({
      success: true,
      message: `User ${action === 'suspend' ? 'suspended' : 'restored'} successfully`,
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
