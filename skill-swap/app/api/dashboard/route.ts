/**
 * Dashboard Statistics API Route
 *
 * Fetches comprehensive statistics for the user's dashboard including:
 * - Wallet balance
 * - Skills count (offered/wanted)
 * - Connections count
 * - Sessions statistics
 * - Recent activity data
 * - Chart data for visualizations
 *
 * @fileoverview GET /api/dashboard
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET - Fetch comprehensive dashboard statistics
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all data in parallel for better performance
    const [
      wallet,
      skillsOffered,
      skillsWanted,
      connections,
      pendingConnectionRequests,
      activeSessions,
      completedSessions,
      cancelledSessions,
      upcomingSessions,
      pendingSessionRequests,
      reviewsReceived,
      reviewsGiven,
      posts,
      unreadMessages,
      recentTransactions,
      monthlySessionData,
    ] = await Promise.all([
      // Wallet balance
      prisma.wallet.findUnique({
        where: { userId },
        select: {
          availableBalance: true,
          outgoingBalance: true,
          incomingBalance: true,
        },
      }),

      // Skills offered count
      prisma.skill.count({
        where: { ownerId: userId },
      }),

      // Skills wanted count
      prisma.skillWant.count({
        where: { userId },
      }),

      // Active connections count
      prisma.connection.count({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
          status: 'ACTIVE',
        },
      }),

      // Pending connection requests (sent + received)
      prisma.connectionRequest.count({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
          status: 'PENDING',
        },
      }),

      // Active sessions
      prisma.session.count({
        where: {
          OR: [{ learnerId: userId }, { providerId: userId }],
          status: 'ACTIVE',
        },
      }),

      // Completed sessions
      prisma.session.count({
        where: {
          OR: [{ learnerId: userId }, { providerId: userId }],
          status: 'COMPLETED',
        },
      }),

      // Cancelled sessions
      prisma.session.count({
        where: {
          OR: [{ learnerId: userId }, { providerId: userId }],
          status: 'CANCELLED',
        },
      }),

      // Upcoming sessions (active sessions with future start date)
      prisma.session.findMany({
        where: {
          OR: [{ learnerId: userId }, { providerId: userId }],
          status: 'ACTIVE',
          startDate: { gte: new Date() },
        },
        select: {
          id: true,
          sessionName: true,
          startDate: true,
          endDate: true,
          mode: true,
          learnerId: true,
          skill: { select: { name: true } },
          learner: { select: { id: true, fullName: true, name: true, image: true } },
          provider: { select: { id: true, fullName: true, name: true, image: true } },
        },
        orderBy: { startDate: 'asc' },
        take: 5,
      }),

      // Pending session requests
      prisma.sessionRequest.count({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
          status: 'PENDING',
        },
      }),

      // Reviews received
      prisma.review.findMany({
        where: { reviewedUserId: userId },
        select: {
          rating: true,
          teachingClarity: true,
          responsiveness: true,
          reliability: true,
          punctuality: true,
        },
      }),

      // Reviews given count
      prisma.review.count({
        where: { reviewedByUserId: userId },
      }),

      // Posts count and engagement
      prisma.newsfeedPost.findMany({
        where: { authorId: userId },
        select: {
          id: true,
          viewCount: true,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),

      // Unread messages count
      prisma.message.count({
        where: {
          receiverId: userId,
          isRead: false,
        },
      }),

      // Recent transactions for activity chart
      prisma.transaction.findMany({
        where: {
          wallet: { userId },
          status: 'COMPLETED',
        },
        select: {
          amount: true,
          type: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      // Monthly session data for charts (last 6 months)
      getMonthlySessionData(userId),
    ]);

    // Calculate average rating
    const totalRatings = reviewsReceived.length;
    const averageRating = totalRatings > 0
      ? reviewsReceived.reduce((acc, r) => acc + r.rating, 0) / totalRatings
      : 0;

    // Calculate rating breakdown
    const ratingBreakdown = calculateRatingBreakdown(reviewsReceived);

    // Calculate post engagement
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((acc, p) => acc + p._count.likes, 0);
    const totalComments = posts.reduce((acc, p) => acc + p._count.comments, 0);
    const totalViews = posts.reduce((acc, p) => acc + p.viewCount, 0);

    // Calculate credit flow data
    const creditFlowData = calculateCreditFlow(recentTransactions);

    // Format upcoming sessions
    const formattedUpcomingSessions = upcomingSessions.map((s) => ({
      id: s.id,
      sessionName: s.sessionName,
      skillName: s.skill.name,
      startDate: s.startDate,
      endDate: s.endDate,
      mode: s.mode,
      partner: s.learnerId === userId
        ? { id: s.provider.id, name: s.provider.fullName || s.provider.name, image: s.provider.image }
        : { id: s.learner.id, name: s.learner.fullName || s.learner.name, image: s.learner.image },
      role: s.learnerId === userId ? 'learner' : 'provider',
    }));

    return NextResponse.json({
      stats: {
        wallet: wallet || { availableBalance: 100, outgoingBalance: 0, incomingBalance: 0 },
        skills: {
          offered: skillsOffered,
          wanted: skillsWanted,
        },
        connections: {
          active: connections,
          pendingRequests: pendingConnectionRequests,
        },
        sessions: {
          active: activeSessions,
          completed: completedSessions,
          cancelled: cancelledSessions,
          pendingRequests: pendingSessionRequests,
        },
        reviews: {
          received: totalRatings,
          given: reviewsGiven,
          averageRating: Math.round(averageRating * 10) / 10,
          breakdown: ratingBreakdown,
        },
        posts: {
          total: totalPosts,
          likes: totalLikes,
          comments: totalComments,
          views: totalViews,
        },
        messages: {
          unread: unreadMessages,
        },
      },
      upcomingSessions: formattedUpcomingSessions,
      charts: {
        sessionActivity: monthlySessionData,
        creditFlow: creditFlowData,
        skillsDistribution: await getSkillsDistribution(userId),
        sessionModes: {
          online: await prisma.session.count({
            where: { OR: [{ learnerId: userId }, { providerId: userId }], mode: 'ONLINE' },
          }),
          physical: await prisma.session.count({
            where: { OR: [{ learnerId: userId }, { providerId: userId }], mode: 'PHYSICAL' },
          }),
        },
      },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}

/**
 * Get monthly session data for the last 6 months
 */
async function getMonthlySessionData(userId: string) {
  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const [completed, active, asLearner, asProvider] = await Promise.all([
      prisma.session.count({
        where: {
          OR: [{ learnerId: userId }, { providerId: userId }],
          status: 'COMPLETED',
          completedAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.session.count({
        where: {
          OR: [{ learnerId: userId }, { providerId: userId }],
          status: 'ACTIVE',
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.session.count({
        where: {
          learnerId: userId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.session.count({
        where: {
          providerId: userId,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
    ]);

    months.push({
      month: startOfMonth.toLocaleString('default', { month: 'short' }),
      completed,
      active,
      asLearner,
      asProvider,
    });
  }

  return months;
}

/**
 * Calculate rating breakdown by category
 */
function calculateRatingBreakdown(reviews: { 
  rating: number; 
  teachingClarity: number | null; 
  responsiveness: number | null;
  reliability: number | null;
  punctuality: number | null;
}[]) {
  if (reviews.length === 0) {
    return {
      overall: 0,
      teachingClarity: 0,
      responsiveness: 0,
      reliability: 0,
      punctuality: 0,
    };
  }

  const sum = (arr: (number | null)[]) => {
    const filtered = arr.filter((n): n is number => n !== null);
    return filtered.length > 0 ? filtered.reduce((a, b) => a + b, 0) / filtered.length : 0;
  };

  return {
    overall: sum(reviews.map(r => r.rating)),
    teachingClarity: sum(reviews.map(r => r.teachingClarity)),
    responsiveness: sum(reviews.map(r => r.responsiveness)),
    reliability: sum(reviews.map(r => r.reliability)),
    punctuality: sum(reviews.map(r => r.punctuality)),
  };
}

/**
 * Calculate credit flow for the last 30 days
 */
function calculateCreditFlow(transactions: { amount: number; type: string; createdAt: Date }[]) {
  const now = new Date();
  const days: { date: string; earned: number; spent: number }[] = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayTransactions = transactions.filter((t) => {
      const tDate = new Date(t.createdAt).toISOString().split('T')[0];
      return tDate === dateStr;
    });

    const earned = dayTransactions
      .filter((t) => t.type.includes('RECEIVED') || t.type === 'SESSION_COMPLETED')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const spent = dayTransactions
      .filter((t) => t.type.includes('SENT'))
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    days.push({
      date: new Date(date).toLocaleDateString('default', { month: 'short', day: 'numeric' }),
      earned,
      spent,
    });
  }

  // Aggregate by week for cleaner visualization
  const weeks: { week: string; earned: number; spent: number }[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const weekDays = days.slice(i, i + 7);
    weeks.push({
      week: weekDays[0]?.date || '',
      earned: weekDays.reduce((acc, d) => acc + d.earned, 0),
      spent: weekDays.reduce((acc, d) => acc + d.spent, 0),
    });
  }

  return weeks;
}

/**
 * Get skills distribution by proficiency level
 */
async function getSkillsDistribution(userId: string) {
  const skills = await prisma.skill.findMany({
    where: { ownerId: userId },
    select: { proficiencyLevel: true },
  });

  const distribution = {
    Beginner: 0,
    Intermediate: 0,
    Advanced: 0,
    Expert: 0,
  };

  skills.forEach((s) => {
    if (s.proficiencyLevel in distribution) {
      distribution[s.proficiencyLevel as keyof typeof distribution]++;
    }
  });

  return Object.entries(distribution).map(([level, count]) => ({
    level,
    count,
  }));
}
