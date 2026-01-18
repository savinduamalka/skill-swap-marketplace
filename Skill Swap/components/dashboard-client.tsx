'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Users, Zap, MessageSquare, Plus, CheckCircle2 } from 'lucide-react';

// Dashboard statistics configuration with icons and colors
const DASHBOARD_STATS = [
  {
    label: 'Credits Balance',
    value: '250',
    icon: Zap,
    colorClass: 'text-secondary',
  },
  {
    label: 'Skills Offered',
    value: '4',
    icon: BookOpen,
    colorClass: 'text-primary',
  },
  {
    label: 'Active Connections',
    value: '12',
    icon: Users,
    colorClass: 'text-accent',
  },
  {
    label: 'Pending Requests',
    value: '3',
    icon: MessageSquare,
    colorClass: 'text-orange-500',
  },
] as const;

// Featured learning sessions for the dashboard
const FEATURED_SESSIONS = [
  {
    id: '1',
    title: 'Advanced TypeScript Patterns',
    instructor: 'Sarah Chen',
    duration: '45 mins',
    date: '2024-01-25',
  },
  {
    id: '2',
    title: 'UI Design Fundamentals',
    instructor: 'Alex Johnson',
    duration: '60 mins',
    date: '2024-01-26',
  },
  {
    id: '3',
    title: 'React Performance Optimization',
    instructor: 'Marcus Davis',
    duration: '50 mins',
    date: '2024-01-27',
  },
] as const;

// User's active skills and learning interests
const USER_ACTIVITIES = [
  {
    id: '1',
    skill: 'JavaScript',
    level: 'Expert',
    description: 'Teaching modern JavaScript and async patterns',
    status: 'active' as const,
  },
  {
    id: '2',
    skill: 'UI/UX Design',
    level: 'Intermediate',
    description: 'Learning Figma and design thinking',
    status: 'active' as const,
  },
  {
    id: '3',
    skill: 'DevOps',
    level: 'Beginner',
    description: 'Starting to explore Docker and Kubernetes',
    status: 'pending' as const,
  },
] as const;

export function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

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

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />
      <MobileNav />

      <main className="flex-1 overflow-auto">
        <div className="space-y-6 p-6">
          {/* Welcome Section */}
          <section className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {session?.user?.name || 'User'}!</h1>
            <p className="text-muted-foreground">
              Here's your skill exchange dashboard. Manage your learning and teaching activities.
            </p>
          </section>

          {/* Statistics Grid */}
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {DASHBOARD_STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                    <Icon className={`h-8 w-8 ${stat.colorClass}`} />
                  </div>
                </Card>
              );
            })}
          </section>

          {/* Main Content Tabs */}
          <section>
            <Tabs defaultValue="sessions" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="sessions">Featured Sessions</TabsTrigger>
                <TabsTrigger value="skills">Your Skills</TabsTrigger>
                <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
              </TabsList>

              {/* Featured Sessions Tab */}
              <TabsContent value="sessions" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {FEATURED_SESSIONS.map((session) => (
                    <Card key={session.id} className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{session.title}</h3>
                        <p className="text-sm text-muted-foreground">by {session.instructor}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>{session.date}</span>
                          <span>•</span>
                          <span>{session.duration}</span>
                        </div>
                        <Button size="sm" className="mt-2 w-full">
                          Join Session
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-4">
                <div className="space-y-3">
                  {USER_ACTIVITIES.map((activity) => (
                    <Card key={activity.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{activity.skill}</h3>
                            <Badge variant={activity.status === 'active' ? 'default' : 'secondary'}>
                              {activity.level}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
                        </div>
                        <Badge variant={activity.status === 'active' ? 'default' : 'outline'}>
                          {activity.status === 'active' ? 'Active' : 'Pending'}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Quick Actions Tab */}
              <TabsContent value="quick-actions" className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Button asChild size="lg" className="gap-2">
                    <Link href="/create">
                      <Plus className="h-4 w-4" />
                      Create New Post
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/messages">View Messages</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/search">Discover Skills</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/settings">Manage Profile</Link>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </main>
    </div>
  );
}
