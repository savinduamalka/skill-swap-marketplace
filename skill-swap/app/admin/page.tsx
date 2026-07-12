'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  MessageSquare,
  Flag,
  UserX,
  Link2,
  CalendarDays,
  FileText,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  newUsersThisMonth: number;
  newUsersThisWeek: number;
  activeConnections: number;
  totalSessions: number;
  pendingReports: number;
  totalReports: number;
  suspendedUsers: number;
  totalPosts: number;
  totalMessages: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Platform overview and management</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-11 w-11 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <Skeleton className="h-5 w-48 mb-4" />
            <Skeleton className="h-4 w-64" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-5 w-36 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'New This Week',
      value: stats.newUsersThisWeek,
      icon: TrendingUp,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Active Connections',
      value: stats.activeConnections,
      icon: Link2,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Total Sessions',
      value: stats.totalSessions,
      icon: CalendarDays,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      label: 'Total Messages',
      value: stats.totalMessages,
      icon: MessageSquare,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'Newsfeed Posts',
      value: stats.totalPosts,
      icon: FileText,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
    },
    {
      label: 'Pending Reports',
      value: stats.pendingReports,
      icon: Flag,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      href: '/admin/reports',
    },
    {
      label: 'Suspended Users',
      value: stats.suspendedUsers,
      icon: UserX,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      href: '/admin/users?filter=suspended',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const content = (
            <Card key={stat.label} className="p-6 hover:shadow-md transition-shadow cursor-default">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value.toLocaleString()}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );

          if (stat.href) {
            return (
              <Link key={stat.label} href={stat.href}>
                {content}
              </Link>
            );
          }
          return content;
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" />
            Reports Requiring Attention
          </h2>
          {stats.pendingReports > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You have <Badge variant="destructive">{stats.pendingReports}</Badge> pending reports awaiting review.
              </p>
              <Link
                href="/admin/reports"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                Review Reports →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">All reports have been reviewed.</p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Growth Summary
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">New users (30 days)</span>
              <span className="font-medium">+{stats.newUsersThisMonth}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New users (7 days)</span>
              <span className="font-medium">+{stats.newUsersThisWeek}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total reports filed</span>
              <span className="font-medium">{stats.totalReports}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
