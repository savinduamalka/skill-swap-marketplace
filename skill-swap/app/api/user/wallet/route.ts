/**
 * User Wallet API Route
 *
 * GET - Retrieve wallet details for the currently authenticated user.
 *
 * @fileoverview /api/user/wallet
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        availableBalance: wallet.availableBalance,
        outgoingBalance: wallet.outgoingBalance,
        incomingBalance: wallet.incomingBalance,
      },
    });
  } catch (error) {
    console.error('Error fetching user wallet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet information' },
      { status: 500 }
    );
  }
}
