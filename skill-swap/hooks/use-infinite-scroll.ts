'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  /** Callback when more items should be loaded */
  onLoadMore: () => Promise<void>;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Root margin to trigger loading before reaching the end */
  rootMargin?: string;
  /** Threshold for intersection observer */
  threshold?: number;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = '400px',
  threshold = 0.1,
}: UseInfiniteScrollOptions) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  const handleIntersection = useCallback(
    async (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      setIsIntersecting(entry.isIntersecting);

      if (entry.isIntersecting && hasMore && !isLoading) {
        await onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    // Disconnect existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create new observer with configured options
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null, // Use viewport as root
      rootMargin, // Load before reaching the end
      threshold,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, rootMargin, threshold]);

  return {
    loadMoreRef,
    isIntersecting,
  };
}

/**
 * Hook to observe when an element enters the viewport
 * Useful for lazy loading individual post content (images, videos)
 */
interface UseLazyLoadOptions {
  /** Root margin for earlier loading */
  rootMargin?: string;
  /** Threshold for visibility */
  threshold?: number;
  /** Whether to unobserve after first intersection */
  once?: boolean;
}

export function useLazyLoad({
  rootMargin = '200px',
  threshold = 0.1,
  once = true,
}: UseLazyLoadOptions = {}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Skip if already visible and using "once" mode
    if (once && hasBeenVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);

        if (visible && once) {
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin, threshold, once, hasBeenVisible]);

  return {
    ref: elementRef,
    isVisible: once ? hasBeenVisible : isVisible,
  };
}
