/**
 * Auth Status Check API
 *
 * Lightweight endpoint to verify if the current user's account is still active.
 * Called by SuspensionGuard on every page load.
 * Returns 403 if the account is suspended, forcing client-side sign-out.
 *
 * @fileoverview GET /api/auth/check-status
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ status: 'unauthenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isVerified: true },
    });

    if (!user || !user.isVerified) {
      return NextResponse.json(
        { status: 'suspended', message: 'Your account has been suspended.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ status: 'active' });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
