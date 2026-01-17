import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MAX_SEARCH_HISTORY = 5;

/**
 * GET /api/user/search-history
 * Returns the user's 5 most recent searches
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchHistory = await prisma.searchHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { searchedAt: 'desc' },
      take: MAX_SEARCH_HISTORY,
      select: {
        id: true,
        query: true,
        searchedAt: true,
      },
    });

    return NextResponse.json({ searchHistory });
  } catch (error) {
    console.error('Error fetching search history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch search history' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/search-history
 * Adds a new search query to history with LRU mechanism
 * If query already exists, updates its timestamp (moves to top)
 * Maintains only 5 most recent searches
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim().toLowerCase();

    // Use upsert to either create or update the search timestamp
    // This moves existing queries to the top (most recent)
    await prisma.searchHistory.upsert({
      where: {
        userId_query: {
          userId: session.user.id,
          query: trimmedQuery,
        },
      },
      update: {
        searchedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        query: trimmedQuery,
      },
    });

    // Clean up: Keep only the 5 most recent searches (LRU mechanism)
    // Get all searches ordered by date
    const allSearches = await prisma.searchHistory.findMany({
      where: { userId: session.user.id },
      orderBy: { searchedAt: 'desc' },
      select: { id: true },
    });

    // If more than 5, delete the oldest ones
    if (allSearches.length > MAX_SEARCH_HISTORY) {
      const idsToDelete = allSearches
        .slice(MAX_SEARCH_HISTORY)
        .map((s) => s.id);

      await prisma.searchHistory.deleteMany({
        where: {
          id: { in: idsToDelete },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving search history:', error);
    return NextResponse.json(
      { error: 'Failed to save search history' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/search-history
 * Deletes a specific search from history or clears all history
 * Query params:
 *   - id: Delete specific search by ID
 *   - all: Set to 'true' to clear all history
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('all') === 'true';

    if (clearAll) {
      // Clear all search history for the user
      await prisma.searchHistory.deleteMany({
        where: { userId: session.user.id },
      });

      return NextResponse.json({
        success: true,
        message: 'All history cleared',
      });
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Search ID is required' },
        { status: 400 }
      );
    }

    // Delete specific search entry (verify ownership)
    const deleted = await prisma.searchHistory.deleteMany({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Search entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting search history:', error);
    return NextResponse.json(
      { error: 'Failed to delete search history' },
      { status: 500 }
    );
  }
}
