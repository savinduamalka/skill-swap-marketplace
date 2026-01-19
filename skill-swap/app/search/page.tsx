import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SearchContent } from './search-content';

// Cookie name for last search (must match client-side)
const LAST_SEARCH_COOKIE = 'skillswap_last_search';
const SEARCH_CLEARED_COOKIE = 'skillswap_search_cleared';

// Types for search params
interface SearchParams {
  q?: string;
  format?: string;
  proficiency?: string;
  minYears?: string;
  maxYears?: string;
  page?: string;
}

// Types for skill results
export interface SkillResult {
  id: string;
  name: string;
  description: string;
  proficiencyLevel: string;
  yearsOfExperience: number;
  teachingFormat: string;
  availabilityWindow: string;
  alternativeNames: string | null;
  owner: {
    id: string;
    fullName: string | null;
    name: string | null;
    image: string | null;
    bio: string | null;
  };
  reviewCount: number;
  averageRating: number | null;
}

// Types for search history
export interface SearchHistoryItem {
  id: string;
  query: string;
  searchedAt: Date;
}

// Proficiency levels for filtering
const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const TEACHING_FORMATS = ['Online', 'In-Person', 'Hybrid'];
const ITEMS_PER_PAGE = 10;

/**
 * Server-side search function with optimized queries
 * Only executes when there's an actual search query
 * Searches both name and alternativeNames fields
 */
async function searchSkills(
  searchParams: SearchParams,
  currentUserId: string
): Promise<{
  skills: SkillResult[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
} | null> {
  const query = searchParams.q?.trim() || '';

  // Return null if no search query - don't fetch any skills
  if (!query || query.length === 0) {
    return null;
  }

  const format = searchParams.format;
  const proficiency = searchParams.proficiency;
  const minYears = searchParams.minYears
    ? parseInt(searchParams.minYears)
    : undefined;
  const maxYears = searchParams.maxYears
    ? parseInt(searchParams.maxYears)
    : undefined;
  const page = Math.max(1, parseInt(searchParams.page || '1'));

  // Get blocked user IDs (users current user blocked + users who blocked current user)
  // Use sequential queries to avoid exhausting connection pool
  const blockedByMe = await prisma.blockedUser.findMany({
    where: { blockerId: currentUserId },
    select: { blockedId: true },
  });
  const blockedMe = await prisma.blockedUser.findMany({
    where: { blockedId: currentUserId },
    select: { blockerId: true },
  });

  const blockedUserIds = [
    ...blockedByMe.map((b) => b.blockedId),
    ...blockedMe.map((b) => b.blockerId),
  ];

  // Build where clause for filtering
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {
    isTeaching: true,
    // Exclude current user's skills
    ownerId: {
      not: currentUserId,
      // Exclude blocked users' skills
      notIn: blockedUserIds.length > 0 ? blockedUserIds : undefined,
    },
    // Search query - search in name AND alternativeNames (case-insensitive)
    OR: [
      { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
      { alternativeNames: { contains: query, mode: Prisma.QueryMode.insensitive } },
      { description: { contains: query, mode: Prisma.QueryMode.insensitive } },
    ],
  };

  // Format filter (skip if 'all' or empty)
  if (format && format !== 'all' && TEACHING_FORMATS.includes(format)) {
    whereClause.teachingFormat = format;
  }

  // Proficiency filter (skip if 'all' or empty)
  if (
    proficiency &&
    proficiency !== 'all' &&
    PROFICIENCY_LEVELS.includes(proficiency)
  ) {
    whereClause.proficiencyLevel = proficiency;
  }

  // Years of experience filter
  if (minYears !== undefined || maxYears !== undefined) {
    whereClause.yearsOfExperience = {};
    if (minYears !== undefined) {
      whereClause.yearsOfExperience.gte = minYears;
    }
    if (maxYears !== undefined) {
      whereClause.yearsOfExperience.lte = maxYears;
    }
  }

  // Get total count for pagination
  const totalCount = await prisma.skill.count({ where: whereClause });
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Fetch skills with owner info and reviews
  const skills = await prisma.skill.findMany({
    where: whereClause,
    include: {
      owner: {
        select: {
          id: true,
          fullName: true,
          name: true,
          image: true,
          bio: true,
        },
      },
      reviews: {
        select: {
          rating: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    skip: (page - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
  });

  // Transform results with computed review stats
  const skillResults: SkillResult[] = skills.map((skill) => {
    const reviewCount = skill.reviews.length;
    const averageRating =
      reviewCount > 0
        ? skill.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : null;

    return {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      proficiencyLevel: skill.proficiencyLevel,
      yearsOfExperience: skill.yearsOfExperience,
      teachingFormat: skill.teachingFormat,
      availabilityWindow: skill.availabilityWindow,
      alternativeNames: skill.alternativeNames,
      owner: skill.owner,
      reviewCount,
      averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
    };
  });

  return {
    skills: skillResults,
    totalCount,
    totalPages,
    currentPage: page,
  };
}

/**
 * Get user's search history (last 5 searches)
 */
async function getSearchHistory(userId: string): Promise<SearchHistoryItem[]> {
  const history = await prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { searchedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      query: true,
      searchedAt: true,
    },
  });

  return history;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const params = await searchParams;
  const hasSearchQuery = params.q && params.q.trim().length > 0;

  // Server-side auto-restore: If no query but has saved search cookie, redirect immediately
  // This prevents the flash of empty state when returning to search page
  if (!hasSearchQuery) {
    const cookieStore = await cookies();
    const lastSearchCookie = cookieStore.get(LAST_SEARCH_COOKIE);
    const searchClearedCookie = cookieStore.get(SEARCH_CLEARED_COOKIE);

    // Only redirect if there's a saved search AND user didn't explicitly clear
    if (lastSearchCookie?.value && !searchClearedCookie?.value) {
      redirect(`/search?q=${encodeURIComponent(lastSearchCookie.value)}`);
    }
  }

  // Only fetch skills if there's a search query
  // Always fetch search history for the empty state
  const [searchResults, searchHistory] = await Promise.all([
    hasSearchQuery
      ? searchSkills(params, session.user.id)
      : Promise.resolve(null),
    getSearchHistory(session.user.id),
  ]);

  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Search Skills
            </h1>
            <p className="text-muted-foreground">
              {searchResults
                ? `Found ${searchResults.totalCount} ${
                    searchResults.totalCount === 1 ? 'skill' : 'skills'
                  } for "${params.q}"`
                : 'Find experts to learn from by searching for skills'}
            </p>
          </div>

          <Suspense fallback={<SearchLoadingSkeleton />}>
            <SearchContent
              initialResults={searchResults}
              searchHistory={searchHistory}
              proficiencyLevels={PROFICIENCY_LEVELS}
              teachingFormats={TEACHING_FORMATS}
              currentQuery={params.q || ''}
            />
          </Suspense>
        </div>
      </main>

      <MobileNav />
    </>
  );
}

function SearchLoadingSkeleton() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="h-14 bg-muted animate-pulse rounded-lg mb-8" />
      <div className="grid grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
}
