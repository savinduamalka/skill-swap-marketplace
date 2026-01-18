import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user with all related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        // Skills the user teaches
        skillsOffered: {
          select: {
            id: true,
            name: true,
            description: true,
            proficiencyLevel: true,
            yearsOfExperience: true,
            teachingFormat: true,
            createdAt: true,
            // Count students (sessions as provider)
            _count: {
              select: {
                sessions: true,
              },
            },
          },
        },
        // Skills the user wants to learn
        skillsWanted: {
          select: {
            id: true,
            name: true,
            description: true,
            proficiencyTarget: true,
            createdAt: true,
          },
        },
        // User's wallet
        wallet: {
          select: {
            availableBalance: true,
            outgoingBalance: true,
            incomingBalance: true,
          },
        },
        // Reviews received by this user
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            teachingClarity: true,
            responsiveness: true,
            reliability: true,
            punctuality: true,
            comments: true,
            createdAt: true,
            reviewedBy: {
              select: {
                id: true,
                name: true,
                fullName: true,
                image: true,
              },
            },
            skill: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Limit to recent reviews
        },
        // Count connections
        _count: {
          select: {
            connections: true,
            connectedTo: true,
            sessionsAsProvider: true,
            sessionsAsLearner: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate average rating from reviews
    const reviews = user.reviewsReceived;
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    // Count active sessions
    const activeSessions = await prisma.session.count({
      where: {
        OR: [{ learnerId: userId }, { providerId: userId }],
        status: 'ACTIVE',
      },
    });

    // Get blocked user IDs to exclude from connection count
    const [blockedByMe, blockedMe] = await Promise.all([
      prisma.blockedUser.findMany({
        where: { blockerId: userId },
        select: { blockedId: true },
      }),
      prisma.blockedUser.findMany({
        where: { blockedId: userId },
        select: { blockerId: true },
      }),
    ]);

    const blockedUserIds = [
      ...blockedByMe.map((b) => b.blockedId),
      ...blockedMe.map((b) => b.blockerId),
    ];

    // Count active connections excluding blocked users
    const activeConnectionsCount = await prisma.connection.count({
      where: {
        OR: [
          {
            user1Id: userId,
            status: 'ACTIVE',
            user2Id:
              blockedUserIds.length > 0 ? { notIn: blockedUserIds } : undefined,
          },
          {
            user2Id: userId,
            status: 'ACTIVE',
            user1Id:
              blockedUserIds.length > 0 ? { notIn: blockedUserIds } : undefined,
          },
        ],
      },
    });

    // Format the response
    const profileData = {
      id: user.id,
      name: user.fullName || user.name || 'Anonymous',
      email: user.email,
      image: user.image,
      bio: user.bio,
      timeZone: user.timeZone,
      isVerified: user.isVerified,
      memberSince: user.createdAt,

      // Stats
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      reviewCount: reviews.length,
      creditsBalance: user.wallet?.availableBalance || 0,
      connectionsCount: activeConnectionsCount,
      activeSessionsCount: activeSessions,

      // Skills
      skillsOffered: user.skillsOffered.map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        proficiency: skill.proficiencyLevel,
        yearsExperience: skill.yearsOfExperience,
        teachingFormat: skill.teachingFormat,
        studentCount: skill._count.sessions,
      })),

      skillsLearning: user.skillsWanted.map((skill) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        proficiencyTarget: skill.proficiencyTarget,
      })),

      // Testimonials (reviews)
      testimonials: reviews.map((review) => ({
        id: review.id,
        authorName:
          review.reviewedBy.fullName || review.reviewedBy.name || 'Anonymous',
        authorImage: review.reviewedBy.image,
        content: review.comments,
        rating: review.rating,
        skillName: review.skill.name,
        createdAt: review.createdAt,
      })),
    };

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
