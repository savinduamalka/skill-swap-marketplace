/**
 * Dashboard Statistics API Route
 *
 * Fetches comprehensive statistics for the user's dashboard.
 * Uses getDashboardData from lib/dashboard to avoid code duplication.
 *
 * @fileoverview GET /api/dashboard
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDashboardData } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

/**
 * GET - Fetch comprehensive dashboard statistics
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getDashboardData(session.user.id);
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
