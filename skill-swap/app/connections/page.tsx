/**
 * Connections Page
 *
 * Displays the user's network of skill exchange connections organized
 * into tabs: active connections, pending requests (incoming/sent), and blocked users.
 * Provides quick stats and actions for managing each connection.
 *
 * @fileoverview Connection management dashboard with tabbed interface
 */
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, Users, UserX, Ban } from 'lucide-react';
import Link from 'next/link';
import { ConnectionRequestActions } from '@/components/connection-request-actions';
import { UnblockButton } from '@/components/unblock-button';

export const dynamic = 'force-dynamic';

// Helper to get display name (fullName or name fallback)
function getDisplayName(user: {
  fullName?: string | null;
  name?: string | null;
}): string {
  return user.fullName || user.name || 'Unknown User';
}

// Helper to get initials from name
function getInitials(user: {
  fullName?: string | null;
  name?: string | null;
}): string {
  const displayName = user.fullName || user.name;
  if (!displayName) return '??';
  const parts = displayName.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

// Helper to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

export default async function ConnectionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Define types for the included relations
  type UserSelect = {
    id: string;
    fullName: string | null;
    name: string | null;
    image: string | null;
    skillsOffered: { name: string }[];
  };

  type UserSelectWithBio = UserSelect & { bio: string | null };

  type ConnectionWithUsers = {
    id: string;
    user1Id: string;
    user2Id: string;
    status: string;
    createdAt: Date;
    user1: UserSelect;
    user2: UserSelect;
  };

  type RequestWithSender = {
    id: string;
    senderId: string;
    receiverId: string;
    status: string;
    creditsHeld: number;
    createdAt: Date;
    respondedAt: Date | null;
    sender: UserSelectWithBio;
  };

  type RequestWithReceiver = {
    id: string;
    senderId: string;
    receiverId: string;
    status: string;
    creditsHeld: number;
    createdAt: Date;
    respondedAt: Date | null;
    receiver: UserSelect;
  };

  type BlockedWithUser = {
    id: string;
    createdAt: Date;
    blocked: UserSelect;
  };

  // Initialize with empty arrays
  let activeConnections: ConnectionWithUsers[] = [];
  let incomingRequests: RequestWithSender[] = [];
  let sentRequests: RequestWithReceiver[] = [];
  let blockedUsers: BlockedWithUser[] = [];

  try {
    // Fetch connection data sequentially to avoid exhausting connection pool
    // (Supabase has limited connections in transaction mode)
    
    // 1. Active connections - where user is either user1 or user2
    activeConnections = await prisma.connection.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: 'ACTIVE',
      },
      include: {
        user1: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
            skillsOffered: {
              select: { name: true },
              take: 1,
            },
          },
        },
        user2: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
            skillsOffered: {
              select: { name: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Incoming pending requests (where user is the receiver)
    incomingRequests = await prisma.connectionRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
            bio: true,
            skillsOffered: {
              select: { name: true },
              take: 3,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. Sent pending requests (where user is the sender)
    sentRequests = await prisma.connectionRequest.findMany({
      where: {
        senderId: userId,
        status: 'PENDING',
      },
      include: {
        receiver: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
            skillsOffered: {
              select: { name: true },
              take: 3,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 4. Blocked users
    blockedUsers = await prisma.blockedUser.findMany({
      where: {
        blockerId: userId,
      },
      include: {
        blocked: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
            skillsOffered: {
              select: { name: true },
              take: 3,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Database error in connections page:', error);
    // Arrays already initialized as empty, page will show empty state
  }

  // Process active connections to get the other user
  const processedConnections = activeConnections.map((conn) => {
    const otherUser = conn.user1Id === userId ? conn.user2 : conn.user1;
    return {
      id: conn.id,
      otherUser,
      createdAt: conn.createdAt,
    };
  });

  const activeCount = processedConnections.length;
  const incomingCount = incomingRequests.length;
  const sentCount = sentRequests.length;
  const blockedCount = blockedUsers.length;

  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              My Connections
            </h1>
            <p className="text-muted-foreground">
              Manage your learning network and skill exchange partnerships
            </p>
          </div>

          {/* Connection Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 text-center">
              <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-primary">
                {activeCount}
              </div>
              <p className="text-xs text-muted-foreground">Active</p>
            </Card>
            <Card className="p-4 text-center">
              <Clock className="w-5 h-5 mx-auto mb-2 text-amber-500" />
              <div className="text-2xl font-bold text-amber-500">
                {incomingCount}
              </div>
              <p className="text-xs text-muted-foreground">Incoming</p>
            </Card>
            <Card className="p-4 text-center">
              <Clock className="w-5 h-5 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold text-blue-500">
                {sentCount}
              </div>
              <p className="text-xs text-muted-foreground">Sent</p>
            </Card>
            <Card className="p-4 text-center">
              <UserX className="w-5 h-5 mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold text-red-500">
                {blockedCount}
              </div>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </Card>
          </div>

          {/* Connection Tabs */}
          <Tabs defaultValue="incoming" className="space-y-6">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
              <TabsTrigger value="incoming">
                Incoming ({incomingCount})
              </TabsTrigger>
              <TabsTrigger value="sent">Sent ({sentCount})</TabsTrigger>
              <TabsTrigger value="blocked">
                Blocked ({blockedCount})
              </TabsTrigger>
            </TabsList>

            {/* Active Connections Tab */}
            <TabsContent value="active" className="space-y-4">
              {processedConnections.length === 0 ? (
                <Card className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg mb-2">
                    No active connections yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Start connecting with skill providers to build your learning
                    network
                  </p>
                  <Button asChild>
                    <Link href="/search">Find Skills</Link>
                  </Button>
                </Card>
              ) : (
                processedConnections.map((connection) => (
                  <Card
                    key={connection.id}
                    className="p-6 hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                        {connection.otherUser.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={connection.otherUser.image}
                            alt={getDisplayName(connection.otherUser)}
                            className="w-full h-full rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-primary-foreground">
                            {getInitials(connection.otherUser)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold text-foreground">
                              {getDisplayName(connection.otherUser)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {connection.otherUser.skillsOffered[0]?.name ||
                                'No skills listed'}
                            </p>
                          </div>
                          <Badge variant="default">Connected</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Connected {formatRelativeTime(connection.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" asChild>
                          <Link href="/messages">
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Message
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          asChild
                        >
                          <Link href={`/profile/${connection.otherUser.id}`}>
                            Profile
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Incoming Requests Tab */}
            <TabsContent value="incoming" className="space-y-4">
              {incomingRequests.length === 0 ? (
                <Card className="p-8 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg mb-2">
                    No incoming requests
                  </h3>
                  <p className="text-muted-foreground">
                    When someone wants to connect with you, their request will
                    appear here
                  </p>
                </Card>
              ) : (
                incomingRequests.map((request) => (
                  <Card
                    key={request.id}
                    className="p-6 hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        {request.sender.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={request.sender.image}
                            alt={getDisplayName(request.sender)}
                            className="w-full h-full rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-white">
                            {getInitials(request.sender)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold text-foreground">
                              {getDisplayName(request.sender)}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {request.sender.skillsOffered.map((skill) => (
                                <Badge
                                  key={skill.name}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {skill.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-amber-500 text-amber-600"
                          >
                            Incoming
                          </Badge>
                        </div>
                        {request.sender.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {request.sender.bio}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Received {formatRelativeTime(request.createdAt)}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          +{request.creditsHeld} credits if you accept
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <ConnectionRequestActions
                          requestId={request.id}
                          senderName={getDisplayName(request.sender)}
                          creditsHeld={request.creditsHeld}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          asChild
                        >
                          <Link href={`/profile/${request.sender.id}`}>
                            View Profile
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Sent Requests Tab */}
            <TabsContent value="sent" className="space-y-4">
              {sentRequests.length === 0 ? (
                <Card className="p-8 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg mb-2">
                    No sent requests
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    You haven&apos;t sent any connection requests yet
                  </p>
                  <Button asChild>
                    <Link href="/search">Find Skills</Link>
                  </Button>
                </Card>
              ) : (
                sentRequests.map((request) => (
                  <Card
                    key={request.id}
                    className="p-6 hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        {request.receiver.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={request.receiver.image}
                            alt={getDisplayName(request.receiver)}
                            className="w-full h-full rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-white">
                            {getInitials(request.receiver)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold text-foreground">
                              {getDisplayName(request.receiver)}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {request.receiver.skillsOffered.map((skill) => (
                                <Badge
                                  key={skill.name}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {skill.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-blue-500 text-blue-600"
                          >
                            Pending
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Sent {formatRelativeTime(request.createdAt)}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          {request.creditsHeld} credits on hold
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent"
                          asChild
                        >
                          <Link href={`/profile/${request.receiver.id}`}>
                            View Profile
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Blocked Users Tab */}
            <TabsContent value="blocked" className="space-y-4">
              {blockedUsers.length === 0 ? (
                <Card className="p-8 text-center">
                  <UserX className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg mb-2">
                    No blocked users
                  </h3>
                  <p className="text-muted-foreground">
                    Users you block will appear here
                  </p>
                </Card>
              ) : (
                blockedUsers.map((block) => (
                  <Card
                    key={block.id}
                    className="p-6 hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        {block.blocked.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={block.blocked.image}
                            alt={getDisplayName(block.blocked)}
                            className="w-full h-full rounded-lg object-cover opacity-50"
                          />
                        ) : (
                          <span className="text-sm font-bold text-white">
                            {getInitials(block.blocked)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div>
                            <p className="font-semibold text-foreground">
                              {getDisplayName(block.blocked)}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {block.blocked.skillsOffered.map((skill) => (
                                <Badge
                                  key={skill.name}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {skill.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="border-red-500 text-red-600"
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Blocked
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Blocked {formatRelativeTime(block.createdAt)}
                        </p>
                        {block.reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Reason: {block.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <UnblockButton
                          userId={block.blocked.id}
                          userName={getDisplayName(block.blocked)}
                        />
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <MobileNav />
    </>
  );
}
