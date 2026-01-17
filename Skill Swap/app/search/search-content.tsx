'use client';

import { useState, useCallback, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Clock,
  Users,
  MapPin,
  Star,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import type { SkillResult, SearchHistoryItem } from './page';

// Cookie names for last search (must match server-side)
const LAST_SEARCH_COOKIE = 'skillswap_last_search';
const SEARCH_CLEARED_COOKIE = 'skillswap_search_cleared';

// Helper to set a cookie
function setCookie(name: string, value: string, days: number = 30) {
  const expires = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000
  ).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/; SameSite=Lax`;
}

// Helper to delete a cookie
function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

// Helper to get a cookie value
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

interface SearchContentProps {
  initialResults: {
    skills: SkillResult[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
  } | null;
  searchHistory: SearchHistoryItem[];
  proficiencyLevels: string[];
  teachingFormats: string[];
  currentQuery: string;
}

export function SearchContent({
  initialResults,
  searchHistory: initialSearchHistory,
  proficiencyLevels,
  teachingFormats,
  currentQuery,
}: SearchContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state for form inputs
  const [searchQuery, setSearchQuery] = useState(currentQuery);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [selectedProficiency, setSelectedProficiency] = useState('');
  const [minYears, setMinYears] = useState('');
  const [maxYears, setMaxYears] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchHistory, setSearchHistory] =
    useState<SearchHistoryItem[]>(initialSearchHistory);
  const [isDeletingHistory, setIsDeletingHistory] = useState<string | null>(
    null
  );
  const [isRefetchingHistory, setIsRefetchingHistory] = useState(false);

  // Refs for maintaining focus and restoration tracking
  const mainSearchRef = useRef<HTMLInputElement>(null);
  const hasAttemptedRestore = useRef(false);

  // Refetch search history
  const refetchSearchHistory = useCallback(async () => {
    setIsRefetchingHistory(true);
    try {
      const response = await fetch('/api/user/search-history');
      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.searchHistory || []);
      }
    } catch (error) {
      console.error('Failed to fetch search history:', error);
    } finally {
      setIsRefetchingHistory(false);
    }
  }, []);

  // Auto-restore last search when returning to empty search page
  // NOTE: Server-side redirect handles this now, but keep client-side as fallback
  useEffect(() => {
    if (hasAttemptedRestore.current) return;
    hasAttemptedRestore.current = true;

    const stored = getCookie(LAST_SEARCH_COOKIE);
    const wasExplicitlyCleared = getCookie(SEARCH_CLEARED_COOKIE);

    if (stored && !currentQuery && !wasExplicitlyCleared) {
      startTransition(() => {
        router.push(`/search?q=${encodeURIComponent(stored)}`, {
          scroll: false,
        });
      });
    }

    if (wasExplicitlyCleared) {
      deleteCookie(SEARCH_CLEARED_COOKIE);
    }
  }, []);

  // Save current query to cookie when it changes
  useEffect(() => {
    if (currentQuery && currentQuery.trim()) {
      setCookie(LAST_SEARCH_COOKIE, currentQuery);
      deleteCookie(SEARCH_CLEARED_COOKIE);
    }
  }, [currentQuery]);

  // Build URL with search params
  const buildSearchUrl = useCallback(
    (overrides: Record<string, string | undefined> = {}) => {
      const params = new URLSearchParams();

      const values = {
        q: searchQuery,
        format: selectedFormat,
        proficiency: selectedProficiency,
        minYears,
        maxYears,
        ...overrides,
      };

      Object.entries(values).forEach(([key, value]) => {
        if (value && value !== '' && value !== 'all') {
          params.set(key, value);
        }
      });

      if (!overrides.page) {
        params.delete('page');
      }

      return `/search?${params.toString()}`;
    },
    [searchQuery, selectedFormat, selectedProficiency, minYears, maxYears]
  );

  // Save search to history
  const saveSearchToHistory = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      try {
        await fetch('/api/user/search-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.trim() }),
        });
        await refetchSearchHistory();
      } catch (error) {
        console.error('Failed to save search history:', error);
      }
    },
    [refetchSearchHistory]
  );

  // Delete search from history
  const deleteSearchHistory = useCallback(
    async (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setIsDeletingHistory(id);
      try {
        const response = await fetch(`/api/user/search-history?id=${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setSearchHistory((prev) => prev.filter((item) => item.id !== id));
        }
      } catch (error) {
        console.error('Failed to delete search history:', error);
      } finally {
        setIsDeletingHistory(null);
      }
    },
    []
  );

  // Handle search submission
  const handleSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();

      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) return;

      saveSearchToHistory(trimmedQuery);

      startTransition(() => {
        router.push(buildSearchUrl(), { scroll: false });
      });
    },
    [router, buildSearchUrl, searchQuery, saveSearchToHistory]
  );

  // Handle search history click
  const handleHistoryClick = useCallback(
    (query: string) => {
      setSearchQuery(query);
      saveSearchToHistory(query);
      startTransition(() => {
        router.push(`/search?q=${encodeURIComponent(query)}`, {
          scroll: false,
        });
      });
    },
    [router, saveSearchToHistory]
  );

  // Handle filter changes
  const handleFilterChange = useCallback(() => {
    if (!searchQuery.trim()) return;
    startTransition(() => {
      router.push(buildSearchUrl(), { scroll: false });
    });
  }, [router, buildSearchUrl, searchQuery]);

  // Handle pagination
  const handlePageChange = useCallback(
    (page: number) => {
      startTransition(() => {
        router.push(buildSearchUrl({ page: page.toString() }), {
          scroll: false,
        });
      });
    },
    [router, buildSearchUrl]
  );

  // Reset all filters and go back to search home
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedFormat('');
    setSelectedProficiency('');
    setMinYears('');
    setMaxYears('');
    // Clear the search cookie completely so it won't auto-restore
    deleteCookie(LAST_SEARCH_COOKIE);
    setCookie(SEARCH_CLEARED_COOKIE, 'true', 1);
    startTransition(() => {
      router.push('/search', { scroll: false });
    });
    setMobileFiltersOpen(false);
    refetchSearchHistory();
  }, [router, refetchSearchHistory]);

  // Get initials for avatar fallback
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if any filters are active
  const hasActiveFilters =
    selectedFormat || selectedProficiency || minYears || maxYears;

  // Check if we have search results
  const hasResults = initialResults !== null;

  // Filter sidebar content
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Teaching Format */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Teaching Format
        </Label>
        <Select
          value={selectedFormat}
          onValueChange={(value) => {
            setSelectedFormat(value);
            if (searchQuery.trim()) {
              startTransition(() => {
                const params = new URLSearchParams();
                params.set('q', searchQuery);
                if (value && value !== 'all') params.set('format', value);
                if (selectedProficiency && selectedProficiency !== 'all')
                  params.set('proficiency', selectedProficiency);
                if (minYears) params.set('minYears', minYears);
                if (maxYears) params.set('maxYears', maxYears);
                router.push(`/search?${params.toString()}`, { scroll: false });
              });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="All formats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All formats</SelectItem>
            {teachingFormats.map((format) => (
              <SelectItem key={format} value={format}>
                {format}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Proficiency Level */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Proficiency Level
        </Label>
        <Select
          value={selectedProficiency}
          onValueChange={(value) => {
            setSelectedProficiency(value);
            if (searchQuery.trim()) {
              startTransition(() => {
                const params = new URLSearchParams();
                params.set('q', searchQuery);
                if (selectedFormat && selectedFormat !== 'all')
                  params.set('format', selectedFormat);
                if (value && value !== 'all') params.set('proficiency', value);
                if (minYears) params.set('minYears', minYears);
                if (maxYears) params.set('maxYears', maxYears);
                router.push(`/search?${params.toString()}`, { scroll: false });
              });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {proficiencyLevels.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Experience Range */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          Years of Experience
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            placeholder="Min"
            min="0"
            value={minYears}
            onChange={(e) => setMinYears(e.target.value)}
            onBlur={handleFilterChange}
          />
          <Input
            type="number"
            placeholder="Max"
            min="0"
            value={maxYears}
            onChange={(e) => setMaxYears(e.target.value)}
            onBlur={handleFilterChange}
          />
        </div>
      </div>

      {/* Reset Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleResetFilters}
        >
          <X className="mr-2 h-4 w-4" />
          Reset Filters
        </Button>
      )}
    </div>
  );

  // Empty state - no search query entered
  if (!hasResults) {
    return (
      <div className="max-w-2xl mx-auto">
        {/* Search Form */}
        <div className="mb-6 p-6 bg-card rounded-lg">
          <form onSubmit={handleSearch}>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={mainSearchRef}
                  placeholder="Search for skills..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={!searchQuery.trim() || isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Search'
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Recent Searches */}
        {searchHistory.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Recent Searches
              </h3>
              {isRefetchingHistory && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item) => (
                <Badge
                  key={item.id}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80 pr-1 gap-1"
                  onClick={() => handleHistoryClick(item.query)}
                >
                  <Clock className="h-3 w-3" />
                  {item.query}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 hover:bg-destructive/20 hover:text-destructive rounded-full"
                    onClick={(e) => deleteSearchHistory(item.id, e)}
                    disabled={isDeletingHistory === item.id}
                  >
                    {isDeletingHistory === item.id ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <X className="h-2.5 w-2.5" />
                    )}
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {searchHistory.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Enter a skill name to find experts</p>
          </div>
        )}
      </div>
    );
  }

  // Results view - search query was entered
  return (
    <div className="grid md:grid-cols-4 gap-6">
      {/* Desktop Sidebar Filters */}
      <div className="hidden md:block md:col-span-1">
        <Card className="p-4 sticky top-24">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="mb-4">
            <Label className="text-sm font-medium mb-2 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full mt-2"
              size="sm"
              disabled={!searchQuery.trim() || isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search
            </Button>
          </form>

          <Separator className="my-4" />

          <FilterContent />
        </Card>
      </div>

      {/* Mobile Filter Button */}
      <div className="md:hidden">
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full mb-4">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  Active
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Refine your search results</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results */}
      <div className="md:col-span-3">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {initialResults.totalCount}{' '}
            {initialResults.totalCount === 1 ? 'result' : 'results'}
          </p>
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            Clear Search
          </Button>
        </div>

        {/* Results Grid */}
        {initialResults.skills.length > 0 ? (
          <div className="space-y-4">
            {initialResults.skills.map((skill) => (
              <Card
                key={skill.id}
                className="p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={skill.owner.image || undefined}
                      alt={skill.owner.fullName || 'User'}
                    />
                    <AvatarFallback>
                      {getInitials(skill.owner.fullName || skill.owner.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {skill.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          by {skill.owner.fullName || skill.owner.name}
                        </p>
                      </div>
                      {skill.averageRating && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{skill.averageRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {skill.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {skill.proficiencyLevel}
                      </Badge>
                      <Badge variant="outline">{skill.teachingFormat}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {skill.yearsOfExperience}{' '}
                        {skill.yearsOfExperience === 1 ? 'year' : 'years'} exp
                      </span>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-end gap-2">
                    <Link href={`/profile/${skill.owner.id}`}>
                      <Button size="sm">View Profile</Button>
                    </Link>
                  </div>
                </div>

                {/* Mobile View Profile Button */}
                <div className="sm:hidden mt-3">
                  <Link href={`/profile/${skill.owner.id}`} className="block">
                    <Button size="sm" className="w-full">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold mb-2">No results found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search or filters
            </p>
            <Button variant="outline" onClick={handleResetFilters}>
              Clear Filters
            </Button>
          </Card>
        )}

        {/* Pagination */}
        {initialResults.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(initialResults.currentPage - 1)}
              disabled={initialResults.currentPage <= 1 || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-sm text-muted-foreground px-4">
              Page {initialResults.currentPage} of {initialResults.totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(initialResults.currentPage + 1)}
              disabled={
                initialResults.currentPage >= initialResults.totalPages ||
                isPending
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
