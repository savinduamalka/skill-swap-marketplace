/**
 * Admin Dashboard Statistics API
 *
 * GET - Fetch platform-wide statistics for admin dashboard
 *
 * @fileoverview /api/admin/stats
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { error } = await verifyAdmin();
    if (error) return error;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersThisMonth,
      activeConnections,
      totalSessions,
      pendingReports,
      totalReports,
      suspendedUsers,
      totalPosts,
      newUsersThisWeek,
      totalMessages,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.connection.count({ where: { status: 'ACTIVE' } }),
      prisma.session.count(),
      prisma.reportedContent.count({ where: { status: 'PENDING' } }),
      prisma.reportedContent.count(),
      prisma.user.count({ where: { isVerified: false } }),
      prisma.newsfeedPost.count(),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.message.count(),
    ]);

    return NextResponse.json({
      totalUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      activeConnections,
      totalSessions,
      pendingReports,
      totalReports,
      suspendedUsers,
      totalPosts,
      totalMessages,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
