/**
 * Mobile Navigation Component
 *
 * Bottom navigation bar for mobile devices. Provides quick access to the
 * five most important sections of the app with visual feedback for the
 * currently active route.
 *
 * @fileoverview Mobile-only bottom navigation with route awareness
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Home, Search, Plus, MessageSquare, User } from 'lucide-react';

// Navigation item type for proper TypeScript inference
interface NavItem {
  href: string;
  label: string | null;
  icon: typeof Home;
  isAction?: boolean;
  badgeCount?: number;
}

// Navigation items with their routes and icons
const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/create', label: null, icon: Plus, isAction: true },
  { href: '/messages', label: 'Chat', icon: MessageSquare, badgeCount: 3 },
  { href: '/profile', label: 'Profile', icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  /**
   * Determines if the current path matches or is a child of the given path.
   * Used to highlight the active navigation item.
   */
  const isActivePath = (path: string): boolean => {
    return pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const IconComponent = item.icon;
          const isActive = isActivePath(item.href);

          // Special styling for the center "create" action button
          if (item.isAction) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 p-2 text-primary bg-primary/10 rounded-full"
              >
                <IconComponent className="w-6 h-6" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 p-2 relative ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <IconComponent className="w-5 h-5" />

              {/* Unread message indicator */}
              {item.badgeCount && item.badgeCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute top-0 right-1 w-4 h-4 p-0 flex items-center justify-center text-xs"
                >
                  {item.badgeCount}
                </Badge>
              )}

              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
