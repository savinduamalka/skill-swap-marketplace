'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useNotifications } from '@/contexts/notifications-context';

import { Badge } from '@/components/ui/badge';
import {
  Home,
  Search,
  Compass,
  CalendarCheck,
  Newspaper,
  Map as MapIcon,
} from 'lucide-react';

// Routes where the bottom nav should be hidden
const HIDDEN_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];

// Navigation item type for proper TypeScript inference
interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  badgeCount?: number;
}

/**
 * Formats a badge count for display, capping at 99+
 */
function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

export function MobileNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { pendingSessions } = useNotifications();

  // Don't render while loading auth state to prevent flash
  if (status === 'loading') return null;

  // Hide when not authenticated
  if (!session?.user) return null;

  // Hide on auth-related pages and the root landing page
  if (pathname === '/' || HIDDEN_ROUTES.some((route) => pathname.startsWith(route))) return null;

  // Navigation items
  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/newsfeed', label: 'Feed', icon: Newspaper },
    { href: '/sessions', label: 'Sessions', icon: CalendarCheck, badgeCount: pendingSessions },
    { href: '/roadmap', label: 'Roadmap', icon: MapIcon },
  ];

  /**
   * Determines if the current path matches or is a child of the given path.
   * Used to highlight the active navigation item.
   */
  const isActivePath = (path: string): boolean => {
    if (path === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <nav
      className="mobile-bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-40"
      role="navigation"
      aria-label="Mobile navigation"
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50" />

      <div className="relative flex items-center justify-around h-16 px-1"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = isActivePath(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 min-w-[3rem] relative transition-all duration-200 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-current={isActive ? 'page' : undefined}
              id={`mobile-nav-${item.label.toLowerCase()}`}
            >
              {/* Active indicator pill */}
              {isActive && (
                <span className="absolute -top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary mobile-nav-active-pill" />
              )}

              <div className="relative">
                <IconComponent
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110' : ''
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {/* Badge indicator */}
                {item.badgeCount != null && item.badgeCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-3 min-w-[1.1rem] h-[1.1rem] px-1 py-0 flex items-center justify-center text-[0.6rem] font-bold leading-none rounded-full"
                  >
                    {formatBadgeCount(item.badgeCount)}
                  </Badge>
                )}
              </div>

              <span
                className={`text-[0.625rem] leading-tight font-medium transition-all duration-200 ${
                  isActive ? 'opacity-100' : 'opacity-70'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
