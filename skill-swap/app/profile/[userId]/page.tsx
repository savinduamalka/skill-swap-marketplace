import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Star,
  MapPin,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  BookOpen,
  Ban,
} from 'lucide-react';
import { ConnectButton } from '@/components/connect-button';
import { BackButton } from '@/components/back-button';
import { BlockUserButton } from '@/components/block-user-button';
import { ProfilePostsSection } from './profile-posts-section';

// Force dynamic rendering to always get fresh connection status
export const dynamic = 'force-dynamic';

// Types for the profile data
interface UserProfile {
  id: string;
  fullName: string | null;
  name: string | null;
  image: string | null;
  bio: string | null;
  timeZone: string;
  isVerified: boolean;
  createdAt: Date;
  skills: {
    id: string;
    name: string;
    description: string;
    proficiencyLevel: string;
    yearsOfExperience: number;
    teachingFormat: string;
    availabilityWindow: string;
    alternativeNames: string | null;
  }[];
  reviewsReceived: {
    id: string;
    rating: number;
    comments: string | null;
    createdAt: Date;
    reviewedBy: {
      id: string;
      fullName: string | null;
      name: string | null;
      image: string | null;
    };
    skill: {
      name: string;
    } | null;
  }[];
  _count: {
    connections: number;
    connectedTo: number;
    sessionsAsProvider: number;
  };
}

/**
 * Get active connection count excluding blocked users
 * This counts only ACTIVE connections where neither party has blocked the other
 */
async function getActiveConnectionCount(
  userId: string,
  viewerId: string
): Promise<number> {
  try {
    // Get all blocked user IDs for the profile user (sequential queries)
    const blockedByProfile = await prisma.blockedUser.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    const blockedProfile = await prisma.blockedUser.findMany({
      where: { blockedId: userId },
      select: { blockerId: true },
    });

    const blockedUserIds = new Set([
      ...blockedByProfile.map((b) => b.blockedId),
      ...blockedProfile.map((b) => b.blockerId),
    ]);

    // Count active connections excluding blocked users
    const activeConnections = await prisma.connection.count({
      where: {
        OR: [
          {
            user1Id: userId,
            status: 'ACTIVE',
            user2Id: { notIn: Array.from(blockedUserIds) },
          },
          {
            user2Id: userId,
            status: 'ACTIVE',
            user1Id: { notIn: Array.from(blockedUserIds) },
          },
        ],
      },
    });

    return activeConnections;
  } catch (error) {
    console.error('Error getting active connection count:', error);
    return 0;
  }
}

/**
 * Fetch user profile data with related information
 */
async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        name: true,
        image: true,
        bio: true,
        timeZone: true,
        isVerified: true,
        createdAt: true,
        skillsOffered: {
          where: { isTeaching: true },
          select: {
            id: true,
            name: true,
            description: true,
            proficiencyLevel: true,
            yearsOfExperience: true,
            teachingFormat: true,
            availabilityWindow: true,
            alternativeNames: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            comments: true,
            createdAt: true,
            reviewedBy: {
              select: {
                id: true,
                fullName: true,
                name: true,
                image: true,
              },
            },
            skill: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            connections: true,
            connectedTo: true,
            sessionsAsProvider: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      fullName: user.fullName,
      name: user.name,
      image: user.image,
      bio: user.bio,
      timeZone: user.timeZone,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      skills: user.skillsOffered,
      reviewsReceived: user.reviewsReceived,
      _count: user._count,
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Check if current user is connected with the profile user
 */
async function checkConnectionStatus(
  currentUserId: string,
  profileUserId: string
): Promise<{
  isConnected: boolean;
  hasPendingRequest: boolean;
  isSentByCurrentUser: boolean;
}> {
  try {
    // Check for active connection
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { user1Id: currentUserId, user2Id: profileUserId, status: 'ACTIVE' },
          { user1Id: profileUserId, user2Id: currentUserId, status: 'ACTIVE' },
        ],
      },
    });

    // Check for pending request
    const pendingRequest = await prisma.connectionRequest.findFirst({
      where: {
        OR: [
          {
            senderId: currentUserId,
            receiverId: profileUserId,
            status: 'PENDING',
          },
          {
            senderId: profileUserId,
            receiverId: currentUserId,
            status: 'PENDING',
          },
        ],
      },
      select: {
        senderId: true,
      },
    });

    return {
      isConnected: !!connection,
      hasPendingRequest: !!pendingRequest,
      isSentByCurrentUser: pendingRequest?.senderId === currentUserId,
    };
  } catch (error) {
    console.error('Error checking connection status:', error);
    return {
      isConnected: false,
      hasPendingRequest: false,
      isSentByCurrentUser: false,
    };
  }
}

/**
 * Check if users have blocked each other
 */
async function checkBlockStatus(
  currentUserId: string,
  profileUserId: string
): Promise<{
  isBlockedByMe: boolean;
  hasBlockedMe: boolean;
}> {
  try {
    // Sequential queries to avoid connection pool exhaustion
    const blockedByMe = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: currentUserId,
          blockedId: profileUserId,
        },
      },
    });
    const blockedMe = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: profileUserId,
          blockedId: currentUserId,
        },
      },
    });

    return {
      isBlockedByMe: !!blockedByMe,
      hasBlockedMe: !!blockedMe,
    };
  } catch (error) {
    console.error('Error checking block status:', error);
    return {
      isBlockedByMe: false,
      hasBlockedMe: false,
    };
  }
}

/**
 * Calculate average rating from reviews
 */
function calculateAverageRating(reviews: { rating: number }[]): number | null {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return sum / reviews.length;
}

/**
 * Get initials from name
 */
function getInitials(name: string | null): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format date to readable string
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format availability window for display
 */
function formatAvailability(window: string): string {
  const [start, end] = window.split('-');
  if (!start || !end) return window;

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return `${formatTime(start)} - ${formatTime(end)}`;
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { userId } = await params;

  // If viewing own profile, redirect to main profile page
  if (userId === session.user.id) {
    redirect('/profile');
  }

  const profile = await getUserProfile(userId);

  if (!profile) {
    notFound();
  }

  const [connectionStatus, blockStatus, activeConnectionCount] =
    await Promise.all([
      checkConnectionStatus(session.user.id, userId),
      checkBlockStatus(session.user.id, userId),
      getActiveConnectionCount(userId, session.user.id),
    ]);

  const { isConnected, hasPendingRequest, isSentByCurrentUser } =
    connectionStatus;
  const { isBlockedByMe, hasBlockedMe } = blockStatus;

  // If the profile user has blocked the current user, show blocked message
  if (hasBlockedMe) {
    return (
      <>
        <Header />
        <main className="pb-20 md:pb-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <BackButton fallbackHref="/search" fallbackLabel="Back" />
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Ban className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold">Profile Unavailable</h2>
                <p className="text-muted-foreground max-w-md">
                  This profile is not available to view.
                </p>
              </div>
            </Card>
          </div>
        </main>
        <MobileNav />
      </>
    );
  }

  const averageRating = calculateAverageRating(profile.reviewsReceived);
  const totalConnections = activeConnectionCount;
  const displayName = profile.fullName || profile.name || 'User';

  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <BackButton fallbackHref="/search" fallbackLabel="Back" />

          {/* Profile Header */}
          <Card className="p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Avatar */}
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                <AvatarImage
                  src={profile.image || undefined}
                  alt={displayName}
                />
                <AvatarFallback className="text-2xl">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl font-bold text-foreground">
                        {displayName}
                      </h1>
                      {profile.isVerified && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>

                    {/* Rating */}
                    {averageRating && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">
                          {averageRating.toFixed(1)}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          ({profile.reviewsReceived.length}{' '}
                          {profile.reviewsReceived.length === 1
                            ? 'review'
                            : 'reviews'}
                          )
                        </span>
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {profile.timeZone}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined {formatDate(profile.createdAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {totalConnections}{' '}
                        {totalConnections === 1 ? 'connection' : 'connections'}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <ConnectButton
                      receiverId={profile.id}
                      receiverName={displayName}
                      isConnected={isConnected}
                      hasPendingRequest={hasPendingRequest}
                      isSentByCurrentUser={isSentByCurrentUser}
                    />
                    <BlockUserButton
                      userId={profile.id}
                      userName={displayName}
                      isBlocked={isBlockedByMe}
                    />
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="mt-4 text-muted-foreground">{profile.bio}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Skills Section */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Skills Offered</h2>
            </div>

            {profile.skills.length > 0 ? (
              <div className="space-y-4">
                {profile.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="p-4 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">
                        {skill.name}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {skill.proficiencyLevel}
                        </Badge>
                        <Badge variant="outline">{skill.teachingFormat}</Badge>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {skill.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {skill.yearsOfExperience}{' '}
                        {skill.yearsOfExperience === 1 ? 'year' : 'years'}{' '}
                        experience
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Available:{' '}
                        {formatAvailability(skill.availabilityWindow)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No skills listed yet
              </p>
            )}
          </Card>

          {/* Posts Section */}
          <ProfilePostsSection
            userId={userId}
            currentUserId={session.user.id}
          />

          {/* Reviews Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Reviews</h2>
              {averageRating && (
                <span className="text-sm text-muted-foreground">
                  ({averageRating.toFixed(1)} average)
                </span>
              )}
            </div>

            {profile.reviewsReceived.length > 0 ? (
              <div className="space-y-4">
                {profile.reviewsReceived.map((review) => (
                  <div
                    key={review.id}
                    className="pb-4 border-b border-border last:border-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={review.reviewedBy.image || undefined}
                          alt={review.reviewedBy.fullName || 'Reviewer'}
                        />
                        <AvatarFallback>
                          {getInitials(
                            review.reviewedBy.fullName || review.reviewedBy.name
                          )}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="font-medium text-foreground">
                              {review.reviewedBy.fullName ||
                                review.reviewedBy.name}
                            </span>
                            {review.skill && (
                              <span className="text-sm text-muted-foreground ml-2">
                                for {review.skill.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {review.comments && (
                          <p className="text-sm text-muted-foreground">
                            {review.comments}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No reviews yet
              </p>
            )}
          </Card>
        </div>
      </main>

      <MobileNav />
    </>
  );
}
