/**
 * User Wallet API Route
 *
 * Fetches the current user's wallet balance.
 *
 * @fileoverview GET /api/user/wallet
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET - Fetch user's wallet balance
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
      select: {
        availableBalance: true,
        outgoingBalance: true,
        incomingBalance: true,
      },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist (first-time user)
      const newWallet = await prisma.wallet.create({
        data: {
          userId: session.user.id,
          availableBalance: 100, // Starting balance
          outgoingBalance: 0,
          incomingBalance: 0,
        },
        select: {
          availableBalance: true,
          outgoingBalance: true,
          incomingBalance: true,
        },
      });

      return NextResponse.json({ wallet: newWallet });
    }

    return NextResponse.json({ wallet });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet' },
      { status: 500 }
    );
  }
}
