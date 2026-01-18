/**
 * Dashboard Page
 *
 * The main hub for authenticated users. Displays key statistics,
 * recent activity, upcoming sessions, and quick actions. This is
 * where users manage their day-to-day skill exchange activities.
 *
 * @fileoverview User dashboard with stats, posts, and session management
 */
import { Suspense } from 'react';
import { DashboardContent } from '@/components/dashboard-client';

export const metadata = {
  title: 'Dashboard | SkillSwap',
  description: 'Your skill exchange dashboard',
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

