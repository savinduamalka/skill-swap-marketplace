/**
 * Reports API
 *
 * POST - Submit a report
 * GET - List reports (admin only)
 *
 * @fileoverview /api/reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportedUserId, contentType, contentId, reason, description } = body;

    if (!contentType || !contentId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validReasons = [
      'SPAM',
      'HARASSMENT',
      'INAPPROPRIATE_CONTENT',
      'FAKE_PROFILE',
      'SCAM',
      'HATE_SPEECH',
      'IMPERSONATION',
      'OTHER',
    ];

    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }

    // Prevent self-reporting
    if (reportedUserId === session.user.id) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    // Check if reported user exists
    if (reportedUserId) {
      const reportedUser = await prisma.user.findUnique({
        where: { id: reportedUserId },
        select: { id: true },
      });
      if (!reportedUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Check for duplicate active report (PENDING — not yet reviewed)
    const existing = await prisma.reportedContent.findFirst({
      where: {
        reportedByUserId: session.user.id,
        contentType,
        contentId,
        status: 'PENDING',
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You have already reported this user. Our team is reviewing it.', code: 'ALREADY_REPORTED' },
        { status: 409 }
      );
    }

    const report = await prisma.reportedContent.create({
      data: {
        reportedByUserId: session.user.id,
        reportedUserId: reportedUserId || null,
        contentType,
        contentId,
        reason,
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, reportId: report.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const reports = await prisma.reportedContent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}
