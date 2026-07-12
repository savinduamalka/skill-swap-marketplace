/**
 * Admin Reports Management API
 *
 * GET - List all reports with filters (paginated)
 * PATCH - Update report status and take action
 *
 * @fileoverview /api/admin/reports
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
    const status = searchParams.get('status') || 'all';
    const { page, limit, skip } = sanitizePagination(searchParams);

    const where = status !== 'all' ? { status } : {};

    const [reports, total] = await Promise.all([
      prisma.reportedContent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.reportedContent.count({ where }),
    ]);

    // Fetch user details for reports
    const userIds = new Set<string>();
    reports.forEach((r) => {
      userIds.add(r.reportedByUserId);
      if (r.reportedUserId) userIds.add(r.reportedUserId);
    });

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, fullName: true, name: true, email: true, image: true, isVerified: true },
    });

    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enrichedReports = reports.map((r) => ({
      ...r,
      reportedBy: usersMap[r.reportedByUserId] || null,
      reportedUser: r.reportedUserId ? usersMap[r.reportedUserId] || null : null,
    }));

    return NextResponse.json({
      reports: enrichedReports,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching admin reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { session, error } = await verifyAdmin();
    if (error || !session?.user?.id) return error!;

    const body = await request.json();
    // Only extract known fields — ignore any injected fields like isAdmin
    const { reportId, status, action } = body;

    if (!reportId || !status) {
      return NextResponse.json({ error: 'reportId and status are required' }, { status: 400 });
    }

    const validStatuses = ['REVIEWED', 'DISMISSED', 'ACTIONED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const validActions = ['WARNING', 'SUSPENDED', 'DELETED', 'DISMISSED', null];
    if (action !== undefined && !validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const report = await prisma.reportedContent.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Prevent re-reviewing already reviewed reports
    if (report.status !== 'PENDING') {
      return NextResponse.json({ error: 'Report has already been reviewed' }, { status: 400 });
    }

    // Update report
    const updatedReport = await prisma.reportedContent.update({
      where: { id: reportId },
      data: {
        status,
        action: action || null,
        reviewedByAdminId: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // Notify the reporter about the review outcome
    const statusMessages: Record<string, string> = {
      REVIEWED: 'Your report has been reviewed and appropriate action has been taken.',
      DISMISSED: 'Your report has been reviewed but no violation was found.',
      ACTIONED: 'Your report has been reviewed and action has been taken against the user.',
    };

    await createNotification({
      userId: report.reportedByUserId,
      type: 'REPORT_REVIEWED',
      title: 'Report Review Update',
      message: statusMessages[status] || 'Your report has been reviewed.',
      relatedEntityId: reportId,
      relatedEntityType: 'report',
    });

    // If action is SUSPENDED, suspend the reported user
    if (action === 'SUSPENDED' && report.reportedUserId) {
      await prisma.user.update({
        where: { id: report.reportedUserId },
        data: { isVerified: false },
      });

      // Notify the suspended user
      await createNotification({
        userId: report.reportedUserId,
        type: 'ACCOUNT_SUSPENDED',
        title: 'Account Suspended',
        message: 'Your account has been suspended due to a violation of community guidelines. Contact skillswap@gmail.com for assistance.',
      });
    }

    return NextResponse.json({ success: true, report: updatedReport });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}
