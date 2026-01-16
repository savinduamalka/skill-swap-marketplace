import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes intelligently, handling conflicts and duplicates.
 * Combines clsx for conditional classes with tailwind-merge for deduplication.
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date to a human-readable relative time string.
 * Returns "Just now", "X minutes ago", "X hours ago", etc.
 *
 * @param date - Date to format (Date object or ISO string)
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor(
    (now.getTime() - targetDate.getTime()) / 1000
  );

  if (diffInSeconds < 60) {
    return 'Just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
  }

  // Fall back to formatted date for older dates
  return targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year:
      targetDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Generates initials from a full name (max 2 characters).
 * Used for avatar placeholders when no image is available.
 *
 * @param name - Full name to extract initials from
 * @returns Two-character initials string
 */
export function getInitials(name: string): string {
  if (!name?.trim()) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Formats a number as a credit amount with appropriate suffix.
 *
 * @param credits - Number of credits
 * @returns Formatted credit string (e.g., "50 credits")
 */
export function formatCredits(credits: number): string {
  return `${credits.toLocaleString()} ${credits === 1 ? 'credit' : 'credits'}`;
}

/**
 * Truncates text to a specified length with ellipsis.
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3).trim() + '...';
}

/**
 * Debounces a function call to prevent excessive executions.
 * Useful for search inputs, resize handlers, etc.
 *
 * @param func - Function to debounce
 * @param waitMs - Milliseconds to wait before executing
 * @returns Debounced function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}

/**
 * Generates a random ID for client-side use.
 * Note: Use server-generated UUIDs for production data.
 */
export function generateClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
