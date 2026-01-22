'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen,
  Users,
  Zap,
  MessageSquare,
  Plus,
  CheckCircle2,
  Calendar,
  Star,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Target,
  Eye,
  Heart,
  RefreshCw,
  Video,
  MapPin,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

// Types for dashboard data
interface DashboardStats {
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

interface UpcomingSession {
  id: string;
  sessionName: string;
  skillName: string;
  startDate: string;
  endDate: string;
  mode: string;
  partner: {
    id: string;
    name: string;
    image: string | null;
  };
  role: 'learner' | 'provider';
}

interface ChartData {
  sessionActivity: { month: string; completed: number; active: number; asLearner: number; asProvider: number }[];
  creditFlow: { week: string; earned: number; spent: number }[];
  skillsDistribution: { level: string; count: number }[];
  sessionModes: { online: number; physical: number };
}

interface DashboardData {
  stats: DashboardStats;
  upcomingSessions: UpcomingSession[];
  charts: ChartData;
}

// Chart colors
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/dashboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Show success toast on login redirect
  useEffect(() => {
    const loginStatus = searchParams.get('login');
    if (loginStatus === 'success') {
      const oauthProvider = sessionStorage.getItem('skillswap_oauth_pending');
      sessionStorage.removeItem('skillswap_oauth_pending');

      toast.success(`Welcome ${session?.user?.name || 'back'}!`, {
        description: oauthProvider
          ? `Successfully signed in with ${oauthProvider.charAt(0).toUpperCase() + oauthProvider.slice(1)}`
          : 'You are now logged in.',
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        duration: 5000,
      });
    }
  }, [searchParams, session?.user?.name]);

  const stats = dashboardData?.stats;
  const charts = dashboardData?.charts;
  const upcomingSessions = dashboardData?.upcomingSessions || [];

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <MobileNav />

      <main className="flex-1 overflow-auto">
        <div className="space-y-6 p-4 md:p-6">
          {/* Welcome Section */}
          <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Welcome back, {session?.user?.name || 'User'}!
              </h1>
              <p className="text-sm text-muted-foreground md:text-base">
                Here&apos;s your skill exchange dashboard overview.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="w-fit"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </section>

          {/* Error State */}
          {error && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="flex items-center gap-2 p-4">
                <span className="text-destructive">{error}</span>
                <Button variant="outline" size="sm" onClick={fetchDashboardData}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats Grid */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Credits Balance"
              value={stats?.wallet.availableBalance ?? 0}
              icon={Zap}
              description={`${stats?.wallet.outgoingBalance ?? 0} pending outgoing`}
              trend={stats?.wallet.incomingBalance ? { value: stats.wallet.incomingBalance, positive: true } : undefined}
              isLoading={isLoading}
              href="/settings"
              colorClass="text-yellow-500"
            />
            <StatCard
              title="Skills Offered"
              value={stats?.skills.offered ?? 0}
              icon={BookOpen}
              description={`${stats?.skills.wanted ?? 0} skills wanted`}
              isLoading={isLoading}
              href="/profile"
              colorClass="text-blue-500"
            />
            <StatCard
              title="Active Connections"
              value={stats?.connections.active ?? 0}
              icon={Users}
              description={`${stats?.connections.pendingRequests ?? 0} pending requests`}
              isLoading={isLoading}
              href="/connections"
              colorClass="text-green-500"
            />
            <StatCard
              title="Unread Messages"
              value={stats?.messages.unread ?? 0}
              icon={MessageSquare}
              description="View conversations"
              isLoading={isLoading}
              href="/messages"
              colorClass="text-purple-500"
            />
          </section>

          {/* Sessions & Activity Overview */}
          <section className="grid gap-4 lg:grid-cols-3">
            {/* Session Stats */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Sessions Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between rounded-lg bg-green-500/10 p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium">Active</span>
                      </div>
                      <span className="text-lg font-bold">{stats?.sessions.active ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-blue-500/10 p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Completed</span>
                      </div>
                      <span className="text-lg font-bold">{stats?.sessions.completed ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-orange-500/10 p-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Pending Requests</span>
                      </div>
                      <span className="text-lg font-bold">{stats?.sessions.pendingRequests ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Cancelled</span>
                      </div>
                      <span className="text-lg font-bold text-muted-foreground">
                        {stats?.sessions.cancelled ?? 0}
                      </span>
                    </div>
                    <Button asChild className="mt-2 w-full">
                      <Link href="/sessions">View All Sessions</Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Session Activity Chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5" />
                  Session Activity (Last 6 Months)
                </CardTitle>
                <CardDescription>Your learning and teaching sessions over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={charts?.sessionActivity || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="asLearner"
                        name="As Learner"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="asProvider"
                        name="As Provider"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Main Content Area */}
          <section className="grid gap-4 lg:grid-cols-2">
            {/* Credit Flow Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5" />
                  Credit Flow (Last 4 Weeks)
                </CardTitle>
                <CardDescription>Track your credits earned and spent</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[220px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={charts?.creditFlow || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="week"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="earned"
                        name="Earned"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="spent"
                        name="Spent"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Reviews & Rating */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Star className="h-5 w-5" />
                  Your Rating
                </CardTitle>
                <CardDescription>
                  Based on {stats?.reviews.received ?? 0} reviews received
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Overall Rating */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-4xl font-bold">
                        {stats?.reviews.averageRating.toFixed(1) || '0.0'}
                        <Star className="h-8 w-8 fill-yellow-500 text-yellow-500" />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>{stats?.reviews.received ?? 0} reviews received</p>
                        <p>{stats?.reviews.given ?? 0} reviews given</p>
                      </div>
                    </div>

                    {/* Rating Breakdown */}
                    <div className="space-y-2">
                      <RatingBar
                        label="Teaching Clarity"
                        value={stats?.reviews.breakdown.teachingClarity ?? 0}
                      />
                      <RatingBar
                        label="Responsiveness"
                        value={stats?.reviews.breakdown.responsiveness ?? 0}
                      />
                      <RatingBar
                        label="Reliability"
                        value={stats?.reviews.breakdown.reliability ?? 0}
                      />
                      <RatingBar
                        label="Punctuality"
                        value={stats?.reviews.breakdown.punctuality ?? 0}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Distribution Charts */}
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Skills Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5" />
                  Skills by Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="mx-auto h-[200px] w-[200px] rounded-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={charts?.skillsDistribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="level"
                        label={({ level, count }) => (count > 0 ? level : '')}
                        labelLine={false}
                      >
                        {charts?.skillsDistribution?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((level, i) => (
                    <Badge
                      key={level}
                      variant="outline"
                      className="gap-1"
                      style={{ borderColor: PIE_COLORS[i] }}
                    >
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i] }}
                      />
                      {level}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Session Modes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Session Modes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-500/10 p-2">
                          <Video className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium">Online</p>
                          <p className="text-sm text-muted-foreground">Virtual sessions</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold">{charts?.sessionModes.online ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-green-500/10 p-2">
                          <MapPin className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">Physical</p>
                          <p className="text-sm text-muted-foreground">In-person sessions</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold">{charts?.sessionModes.physical ?? 0}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Post Engagement */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="h-5 w-5" />
                  Post Engagement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold">{stats?.posts.total ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Posts</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold">{stats?.posts.views ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span className="text-2xl font-bold">{stats?.posts.likes ?? 0}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Likes</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <span className="text-2xl font-bold">{stats?.posts.comments ?? 0}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Comments</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Upcoming Sessions & Quick Actions */}
          <section className="grid gap-4 lg:grid-cols-2">
            {/* Upcoming Sessions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Upcoming Sessions
                </CardTitle>
                <CardDescription>Your scheduled learning and teaching sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : upcomingSessions.length > 0 ? (
                  <ScrollArea className="h-[280px] pr-4">
                    <div className="space-y-3">
                      {upcomingSessions.map((upcomingSession) => (
                        <div
                          key={upcomingSession.id}
                          className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={upcomingSession.partner.image || undefined} />
                            <AvatarFallback>
                              {upcomingSession.partner.name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{upcomingSession.sessionName}</p>
                              <Badge variant={upcomingSession.role === 'learner' ? 'default' : 'secondary'}>
                                {upcomingSession.role === 'learner' ? 'Learning' : 'Teaching'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {upcomingSession.skillName} with {upcomingSession.partner.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(upcomingSession.startDate), 'MMM d, yyyy h:mm a')}
                              <Badge variant="outline" className="ml-1">
                                {upcomingSession.mode === 'ONLINE' ? (
                                  <Video className="mr-1 h-3 w-3" />
                                ) : (
                                  <MapPin className="mr-1 h-3 w-3" />
                                )}
                                {upcomingSession.mode}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="mb-2 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No upcoming sessions</p>
                    <Button asChild variant="link" className="mt-2">
                      <Link href="/search">Find skills to learn</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common actions to get you started</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild size="lg" className="h-auto flex-col gap-2 py-4">
                    <Link href="/create">
                      <Plus className="h-6 w-6" />
                      <span>Create New Post</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="relative h-auto flex-col gap-2 py-4">
                    <Link href="/messages">
                      <MessageSquare className="h-6 w-6" />
                      <span>View Messages</span>
                      {stats?.messages.unread ? (
                        <Badge variant="destructive" className="absolute -right-1 -top-1">
                          {stats.messages.unread}
                        </Badge>
                      ) : null}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-auto flex-col gap-2 py-4">
                    <Link href="/search">
                      <Target className="h-6 w-6" />
                      <span>Discover Skills</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="relative h-auto flex-col gap-2 py-4">
                    <Link href="/connections">
                      <Users className="h-6 w-6" />
                      <span>Connections</span>
                      {stats?.connections.pendingRequests ? (
                        <Badge variant="secondary" className="absolute -right-1 -top-1">
                          {stats.connections.pendingRequests}
                        </Badge>
                      ) : null}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-auto flex-col gap-2 py-4">
                    <Link href="/sessions">
                      <Calendar className="h-6 w-6" />
                      <span>Manage Sessions</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-auto flex-col gap-2 py-4">
                    <Link href="/profile">
                      <Award className="h-6 w-6" />
                      <span>Edit Profile</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  isLoading,
  href,
  colorClass,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  trend?: { value: number; positive: boolean };
  isLoading: boolean;
  href?: string;
  colorClass?: string;
}) {
  const content = (
    <Card className="relative overflow-hidden transition-colors hover:bg-muted/50">
      <CardContent className="p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <Icon className={`h-5 w-5 ${colorClass || 'text-muted-foreground'}`} />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-bold md:text-3xl">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
              {trend && (
                <span
                  className={`flex items-center text-xs ${trend.positive ? 'text-green-500' : 'text-red-500'}`}
                >
                  {trend.positive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  +{trend.value}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// Rating Bar Component
function RatingBar({ label, value }: { label: string; value: number }) {
  const percentage = (value / 5) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toFixed(1)}/5</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
