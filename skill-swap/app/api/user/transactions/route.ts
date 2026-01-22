/**
 * User Transactions API Route
 *
 * Fetches the current user's credit transaction history.
 *
 * @fileoverview GET /api/user/transactions
 */
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface TransactionWithRelations {
  id: string;
  walletId: string;
  amount: number;
  type: string;
  status: string;
  relatedUserId: string | null;
  note: string | null;
  createdAt: Date;
  connectionRequest: {
    sender: { id: string; name: string | null; image: string | null };
    receiver: { id: string; name: string | null; image: string | null };
  } | null;
  sessionRequest: {
    sessionName: string;
    sender: { id: string; name: string | null; image: string | null };
    receiver: { id: string; name: string | null; image: string | null };
  } | null;
  session: {
    id: string;
    sessionName: string;
    learner: { id: string; name: string | null; image: string | null };
    provider: { id: string; name: string | null; image: string | null };
    skill: { name: string } | null;
  } | null;
}

/**
 * GET - Fetch user's transaction history
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type'); // Optional filter by type

    // First, get the user's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!wallet) {
      return NextResponse.json({
        transactions: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Build where clause
    const whereClause: {
      walletId: string;
      type?: string;
    } = {
      walletId: wallet.id,
    };

    if (type) {
      whereClause.type = type;
    }

    // Get total count
    const total = await prisma.transaction.count({
      where: whereClause,
    });

    // Get transactions with related data
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        connectionRequest: {
          select: {
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            receiver: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        sessionRequest: {
          select: {
            sessionName: true,
            sender: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            receiver: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        session: {
          select: {
            id: true,
            sessionName: true,
            learner: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            provider: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            skill: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }) as TransactionWithRelations[];

    // Format transactions for the frontend
    const formattedTransactions = transactions.map((tx) => {
      // Determine the related user and context
      let relatedUser = null;
      let context = '';
      let skillName = '';

      if (tx.connectionRequest) {
        // Connection-related transaction
        const isOutgoing =
          tx.type === 'CONNECTION_REQUEST_SENT' ||
          tx.type === 'CONNECTION_REQUEST_REFUNDED';
        relatedUser = isOutgoing
          ? tx.connectionRequest.receiver
          : tx.connectionRequest.sender;
        context = 'Connection Request';
      } else if (tx.sessionRequest) {
        // Session request-related transaction
        const isOutgoing =
          tx.type === 'SESSION_REQUEST_SENT' ||
          tx.type === 'SESSION_REQUEST_REFUNDED';
        relatedUser = isOutgoing
          ? tx.sessionRequest.receiver
          : tx.sessionRequest.sender;
        context = tx.sessionRequest.sessionName
          ? `Session Request - ${tx.sessionRequest.sessionName}`
          : 'Session Request';
      } else if (tx.session) {
        // Session-related transaction
        relatedUser =
          tx.type === 'SESSION_COMPLETED'
            ? tx.session.learner // Provider receives from learner
            : tx.session.provider;
        skillName = tx.session.skill?.name || '';
        context = tx.session.sessionName
          ? `Session - ${tx.session.sessionName}`
          : skillName
          ? `Session - ${skillName}`
          : 'Session';
      }

      // Determine if credit or debit
      const isCredit = tx.amount > 0;

      return {
        id: tx.id,
        amount: Math.abs(tx.amount),
        isCredit,
        type: tx.type,
        status: tx.status,
        note: tx.note,
        context,
        skillName,
        relatedUser: relatedUser
          ? {
              id: relatedUser.id,
              name: relatedUser.name,
              image: relatedUser.image,
            }
          : null,
        createdAt: tx.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
