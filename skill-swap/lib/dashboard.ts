/**
 * Dashboard Data Fetching Utilities
 * 
 * Server-side functions for fetching dashboard data with caching
 * to improve initial page load performance.
 * 
 * @fileoverview Dashboard SSR utilities
 */
import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

// Types for dashboard data
export interface DashboardStats {
  wallet: {
    availableBalance: number;
    outgoingBalance: number;
    incomingBalance: number;
  };
  skills: {
    offered: number;
    wanted: number;
  };
  connections: {
    active: number;
    pendingRequests: number;
  };
  sessions: {
    active: number;
    completed: number;
    cancelled: number;
    pendingRequests: number;
  };
  reviews: {
    received: number;
    given: number;
    averageRating: number;
    breakdown: {
      overall: number;
      teachingClarity: number;
      responsiveness: number;
      reliability: number;
      punctuality: number;
    };
  };
  posts: {
    total: number;
    likes: number;
    comments: number;
    views: number;
  };
  messages: {
    unread: number;
  };
}

export interface UpcomingSession {
  id: string;
  sessionName: string;
  skillName: string;
  startDate: Date;
  endDate: Date;
  mode: string;
  partner: {
    id: string;
    name: string | null;
    image: string | null;
  };
  role: 'learner' | 'provider';
}

export interface ChartData {
  sessionActivity: { month: string; completed: number; active: number; asLearner: number; asProvider: number }[];
  creditFlow: { week: string; earned: number; spent: number }[];
  skillsDistribution: { level: string; count: number }[];
  sessionModes: { online: number; physical: number };
}

export interface DashboardData {
  stats: DashboardStats;
  upcomingSessions: UpcomingSession[];
  charts: ChartData;
}

/**
 * Fetch core stats (cached for 30 seconds per user)
 */
export const getCachedDashboardStats = unstable_cache(
  async (userId: string): Promise<DashboardStats> => {
    const [
      wallet,
      skillsOffered,
      skillsWanted,
      connections,
      pendingConnectionRequests,
      activeSessions,
      completedSessions,
      cancelledSessions,
      pendingSessionRequests,
      reviewsReceived,
      reviewsGiven,
      posts,
      unreadMessages,
    ] = await Promise.all([
      prisma.wallet.findUnique({
        where: { userId },
        select: {
          availableBalance: true,
          outgoingBalance: true,
          incomingBalance: true,
        },
      }),
      prisma.skill.count({ where: { ownerId: userId } }),
      prisma.skillWant.count({ where: { userId } }),
      prisma.connection.count({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
          status: 'ACTIVE',
        },
      }),
      prisma.connectionRequest.count({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
          status: 'PENDING',
        },
      }),
      prisma.session.count({
        where: {
          OR: [{ learnerId: userId }, { providerId: userId }],
          status: 'ACTIVE',
        },
      }),
      prisma.session.count({
        where: {
          OR: [{ learnerId: userId }, { providerId: userId }],
          status: 'COMPLETED',
        },
      }),
      prisma.session.count({
        where: {
          OR: [{ learnerId: userId }, { providerId: userId }],
          status: 'CANCELLED',
        },
      }),
      prisma.sessionRequest.count({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
          status: 'PENDING',
        },
      }),
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
      prisma.review.count({ where: { reviewedByUserId: userId } }),
      prisma.newsfeedPost.findMany({
        where: { authorId: userId },
        select: {
          id: true,
          viewCount: true,
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.message.count({
        where: { receiverId: userId, isRead: false },
      }),
    ]);

    // Calculate ratings
    const totalRatings = reviewsReceived.length;
    const averageRating = totalRatings > 0
      ? reviewsReceived.reduce((acc, r) => acc + r.rating, 0) / totalRatings
      : 0;

    const sum = (arr: (number | null)[]) => {
      const filtered = arr.filter((n): n is number => n !== null);
      return filtered.length > 0 ? filtered.reduce((a, b) => a + b, 0) / filtered.length : 0;
    };

    const ratingBreakdown = reviewsReceived.length > 0
      ? {
          overall: sum(reviewsReceived.map(r => r.rating)),
          teachingClarity: sum(reviewsReceived.map(r => r.teachingClarity)),
          responsiveness: sum(reviewsReceived.map(r => r.responsiveness)),
          reliability: sum(reviewsReceived.map(r => r.reliability)),
          punctuality: sum(reviewsReceived.map(r => r.punctuality)),
        }
      : { overall: 0, teachingClarity: 0, responsiveness: 0, reliability: 0, punctuality: 0 };

    // Calculate post engagement
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((acc, p) => acc + p._count.likes, 0);
    const totalComments = posts.reduce((acc, p) => acc + p._count.comments, 0);
    const totalViews = posts.reduce((acc, p) => acc + p.viewCount, 0);

    return {
      wallet: wallet || { availableBalance: 100, outgoingBalance: 0, incomingBalance: 0 },
      skills: { offered: skillsOffered, wanted: skillsWanted },
      connections: { active: connections, pendingRequests: pendingConnectionRequests },
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
      posts: { total: totalPosts, likes: totalLikes, comments: totalComments, views: totalViews },
      messages: { unread: unreadMessages },
    };
  },
  ['dashboard-stats'],
  { revalidate: 30, tags: ['dashboard'] }
);

/**
 * Fetch upcoming sessions (cached for 60 seconds)
 */
export const getCachedUpcomingSessions = unstable_cache(
  async (userId: string): Promise<UpcomingSession[]> => {
    const sessions = await prisma.session.findMany({
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
    });

    return sessions.map((s) => ({
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
  },
  ['upcoming-sessions'],
  { revalidate: 60, tags: ['dashboard', 'sessions'] }
);

/**
 * Fetch chart data (cached for 5 minutes - less frequently updated)
 */
export const getCachedChartData = unstable_cache(
  async (userId: string): Promise<ChartData> => {
    const now = new Date();

    // Get monthly session data
    const monthlyData = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const monthOffset = 5 - i;
        const startOfMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 0, 23, 59, 59);

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
            where: { learnerId: userId, createdAt: { gte: startOfMonth, lte: endOfMonth } },
          }),
          prisma.session.count({
            where: { providerId: userId, createdAt: { gte: startOfMonth, lte: endOfMonth } },
          }),
        ]);

        return {
          month: startOfMonth.toLocaleString('default', { month: 'short' }),
          completed,
          active,
          asLearner,
          asProvider,
        };
      })
    );

    // Get credit flow data
    const transactions = await prisma.transaction.findMany({
      where: { wallet: { userId }, status: 'COMPLETED' },
      select: { amount: true, type: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const creditFlow = calculateCreditFlow(transactions);

    // Get skills distribution
    const skills = await prisma.skill.findMany({
      where: { ownerId: userId },
      select: { proficiencyLevel: true },
    });

    const distribution: Record<string, number> = { Beginner: 0, Intermediate: 0, Advanced: 0, Expert: 0 };
    skills.forEach((s) => {
      if (s.proficiencyLevel in distribution) {
        distribution[s.proficiencyLevel]++;
      }
    });

    const skillsDistribution = Object.entries(distribution).map(([level, count]) => ({ level, count }));

    // Get session modes
    const [online, physical] = await Promise.all([
      prisma.session.count({
        where: { OR: [{ learnerId: userId }, { providerId: userId }], mode: 'ONLINE' },
      }),
      prisma.session.count({
        where: { OR: [{ learnerId: userId }, { providerId: userId }], mode: 'PHYSICAL' },
      }),
    ]);

    return {
      sessionActivity: monthlyData,
      creditFlow,
      skillsDistribution,
      sessionModes: { online, physical },
    };
  },
  ['chart-data'],
  { revalidate: 300, tags: ['dashboard', 'charts'] }
);

/**
 * Calculate credit flow for visualization
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

  // Aggregate by week
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
 * Get all dashboard data with parallel fetching
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [stats, upcomingSessions, charts] = await Promise.all([
    getCachedDashboardStats(userId),
    getCachedUpcomingSessions(userId),
    getCachedChartData(userId),
  ]);

  return { stats, upcomingSessions, charts };
}
