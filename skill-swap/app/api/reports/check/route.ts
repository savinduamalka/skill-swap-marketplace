/**
 * Report Check API
 *
 * GET - Check if the current user has an active report against a specific user
 *
 * @fileoverview /api/reports/check?userId=xxx
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const existingReport = await prisma.reportedContent.findFirst({
      where: {
        reportedByUserId: session.user.id,
        contentType: 'user',
        contentId: userId,
        status: 'PENDING',
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({
      hasActiveReport: !!existingReport,
      reportedAt: existingReport?.createdAt || null,
    });
  } catch (error) {
    console.error('Error checking report status:', error);
    return NextResponse.json({ error: 'Failed to check report status' }, { status: 500 });
  }
}
