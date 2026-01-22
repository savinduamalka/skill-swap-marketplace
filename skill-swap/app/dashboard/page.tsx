/**
 * Dashboard Page (SSR Optimized)
 *
 * The main hub for authenticated users. Displays key statistics,
 * recent activity, upcoming sessions, and quick actions. This is
 * where users manage their day-to-day skill exchange activities.
 *
 * Features:
 * - Server-side data fetching for instant page load
 * - Cached data with smart revalidation
 * - Lazy-loaded charts for reduced bundle size
 *
 * @fileoverview User dashboard with SSR + lazy loading optimizations
 */
import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { getDashboardData } from '@/lib/dashboard';
import { DashboardContent } from '@/components/dashboard/dashboard-content';
import DashboardLoading from './loading';

export const metadata = {
  title: 'Dashboard | SkillSwap',
  description: 'Your skill exchange dashboard',
};

// Revalidate every 30 seconds for fresh data
export const revalidate = 30;

/**
 * Fetch dashboard data on the server
 */
async function getServerDashboardData() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return null;
    }

    const data = await getDashboardData(session.user.id);
    return data;
  } catch (error) {
    console.error('Error fetching server dashboard data:', error);
    return null;
  }
}

export default async function DashboardPage() {
  // Fetch data on the server for SSR
  const initialData = await getServerDashboardData();

  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent initialData={initialData} />
    </Suspense>
  );
}

