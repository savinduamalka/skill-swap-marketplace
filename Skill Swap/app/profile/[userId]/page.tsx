import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
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
  MessageSquare,
  CheckCircle2,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';

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
): Promise<{ isConnected: boolean; hasPendingRequest: boolean }> {
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
    });

    return {
      isConnected: !!connection,
      hasPendingRequest: !!pendingRequest,
    };
  } catch (error) {
    console.error('Error checking connection status:', error);
    return { isConnected: false, hasPendingRequest: false };
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

  const { isConnected, hasPendingRequest } = await checkConnectionStatus(
    session.user.id,
    userId
  );

  const averageRating = calculateAverageRating(profile.reviewsReceived);
  const totalConnections =
    profile._count.connections + profile._count.connectedTo;
  const displayName = profile.fullName || profile.name || 'User';

  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Link
            href="/search"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Search
          </Link>

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
                    {isConnected ? (
                      <Button>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </Button>
                    ) : hasPendingRequest ? (
                      <Button variant="secondary" disabled>
                        Request Pending
                      </Button>
                    ) : (
                      <Button>
                        <Users className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    )}
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
