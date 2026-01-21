/**
 * Sessions API Route
 *
 * GET - Fetch user's sessions (active, completed, cancelled)
 *
 * @fileoverview /api/sessions
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

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | null (all)

    // Build where clause
    const whereClause: any = {
      OR: [
        { learnerId: userId },
        { providerId: userId },
      ],
    };

    if (status) {
      whereClause.status = status;
    }

    // Fetch sessions
    const sessions = await prisma.session.findMany({
      where: whereClause,
      include: {
        learner: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
          },
        },
        provider: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
          },
        },
        skill: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform sessions
    const transformedSessions = sessions.map((s) => {
      const isLearner = s.learnerId === userId;
      const otherUser = isLearner ? s.provider : s.learner;

      return {
        id: s.id,
        sessionName: s.sessionName,
        description: s.description,
        mode: s.mode,
        status: s.status,
        startDate: s.startDate,
        endDate: s.endDate,
        requestCredits: s.requestCredits,
        sessionCredits: s.sessionCredits,
        learnerCompletionConfirmed: s.learnerCompletionConfirmed,
        providerCompletionConfirmed: s.providerCompletionConfirmed,
        learnerCancellationRequested: s.learnerCancellationRequested,
        providerCancellationRequested: s.providerCancellationRequested,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
        cancelledAt: s.cancelledAt,
        role: isLearner ? 'learner' : 'provider',
        skill: s.skill,
        otherUser: {
          id: otherUser.id,
          fullName: otherUser.fullName || otherUser.name || 'User',
          profileImage: otherUser.image,
        },
        learner: {
          id: s.learner.id,
          fullName: s.learner.fullName || s.learner.name || 'User',
          profileImage: s.learner.image,
          email: '',
        },
        provider: {
          id: s.provider.id,
          fullName: s.provider.fullName || s.provider.name || 'User',
          profileImage: s.provider.image,
          email: '',
        },
      };
    });

    // Categorize sessions
    const active = transformedSessions.filter((s) => s.status === 'ACTIVE');
    const completed = transformedSessions.filter((s) => s.status === 'COMPLETED');
    const cancelled = transformedSessions.filter((s) => s.status === 'CANCELLED');

    return NextResponse.json({
      sessions: transformedSessions,
      currentUserId: userId,
      active,
      completed,
      cancelled,
      counts: {
        active: active.length,
        completed: completed.length,
        cancelled: cancelled.length,
        total: transformedSessions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
