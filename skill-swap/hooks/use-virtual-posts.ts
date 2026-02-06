'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseVirtualPostsOptions<T> {
  items: T[];
  estimatedItemHeight: number;
  overscan?: number; // Number of items to render outside the visible area
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface VirtualItem<T> {
  index: number;
  item: T;
  style: React.CSSProperties;
}

export function useVirtualPosts<T>({
  items,
  estimatedItemHeight,
  overscan = 3,
  containerRef,
}: UseVirtualPostsOptions<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const itemHeights = useRef<Map<number, number>>(new Map());

  // Calculate total height
  const getTotalHeight = useCallback(() => {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += itemHeights.current.get(i) ?? estimatedItemHeight;
    }
    return total;
  }, [items.length, estimatedItemHeight]);

  // Get item offset from top
  const getItemOffset = useCallback(
    (index: number) => {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += itemHeights.current.get(i) ?? estimatedItemHeight;
      }
      return offset;
    },
    [estimatedItemHeight]
  );

  // Find visible range
  const getVisibleRange = useCallback(() => {
    if (!containerHeight) return { start: 0, end: Math.min(overscan * 2, items.length) };

    let start = 0;
    let accumulatedHeight = 0;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const height = itemHeights.current.get(i) ?? estimatedItemHeight;
      if (accumulatedHeight + height > scrollTop) {
        start = i;
        break;
      }
      accumulatedHeight += height;
    }

    // Find end index
    let end = start;
    let visibleHeight = 0;
    for (let i = start; i < items.length; i++) {
      const height = itemHeights.current.get(i) ?? estimatedItemHeight;
      visibleHeight += height;
      end = i + 1;
      if (visibleHeight > containerHeight) {
        break;
      }
    }

    // Apply overscan
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan),
    };
  }, [scrollTop, containerHeight, items.length, estimatedItemHeight, overscan]);

  // Set measured height for an item
  const setItemHeight = useCallback((index: number, height: number) => {
    const prevHeight = itemHeights.current.get(index);
    if (prevHeight !== height) {
      itemHeights.current.set(index, height);
    }
  }, []);

  // Handle scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Use window scroll position since we're not using a custom scroll container
      setScrollTop(window.scrollY);
    };

    const handleResize = () => {
      setContainerHeight(window.innerHeight);
    };

    // Initial measurements
    handleResize();
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [containerRef]);

  // Calculate virtual items
  const virtualItems = useMemo((): VirtualItem<T>[] => {
    const { start, end } = getVisibleRange();
    const result: VirtualItem<T>[] = [];

    for (let i = start; i < end; i++) {
      result.push({
        index: i,
        item: items[i],
        style: {
          position: 'absolute' as const,
          top: getItemOffset(i),
          left: 0,
          right: 0,
          minHeight: itemHeights.current.get(i) ?? estimatedItemHeight,
        },
      });
    }

    return result;
  }, [items, getVisibleRange, getItemOffset, estimatedItemHeight]);

  const totalHeight = useMemo(() => getTotalHeight(), [getTotalHeight]);

  return {
    virtualItems,
    totalHeight,
    setItemHeight,
    visibleRange: getVisibleRange(),
  };
}
