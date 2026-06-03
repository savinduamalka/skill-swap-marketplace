/**
 * Header Component
 *
 * The main navigation header that appears on all pages.
 * Includes logo, desktop navigation, notifications, messages, and user menu.
 * Responsive design shows full navigation on desktop, condensed on mobile.
 *
 * @fileoverview Global header with navigation and user controls
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageSquare, User, LogOut, Loader2 } from 'lucide-react';

/**
 * Formats a badge count for display, capping at 99+ for overflow
 */
function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}
import { useWallet } from '@/contexts/wallet-context';
import { useUnreadMessages } from '@/contexts/unread-messages-context';
import { NotificationsMenu } from '@/components/notifications/notifications-menu';
import { useNotifications } from '@/contexts/notifications-context';
import { Users } from 'lucide-react';

// Navigation links for desktop menu
const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/search', label: 'Search Skills' },
  { href: '/roadmap', label: 'Roadmap' },
  { href: '/newsfeed', label: 'Newsfeed' },
  { href: '/sessions', label: 'Sessions' },
] as const;

export function Header() {
  const { data: session } = useSession();
  const { wallet, isLoading: walletLoading } = useWallet();
  const { unreadCount } = useUnreadMessages();
  const { pendingConnections, pendingSessions } = useNotifications();

  /**
   * Clear search-related cookies
   */
  const clearSearchCookies = () => {
    // Clear last search cookie
    document.cookie =
      'skillswap_last_search=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
    document.cookie =
      'skillswap_search_cleared=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
  };

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    try {
      // Clear search cookies first (user should have fresh search on re-login)
      clearSearchCookies();
      // Clear cookies via API first
      await fetch('/api/auth/logout', { method: 'POST' });
      // Then use NextAuth signOut
      signOut({ callbackUrl: '/login', redirect: true });
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: force redirect to signout
      window.location.href = '/api/auth/signout';
    }
  };

  /**
   * Get user initials for avatar fallback
   */
  const getUserInitials = () => {
    if (!session?.user?.name) return 'U';
    const names = session.user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/skillswap-logo.png"
            alt="SkillSwap Logo"
            width={44}
            height={44}
            className="w-11 h-11 object-contain"
            priority
          />
          <span className="hidden sm:inline font-bold text-xl text-foreground">
            SkillSwap
          </span>
        </Link>

        {/* Desktop Navigation - Only show when logged in */}
        {session?.user && (
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative text-sm font-medium text-foreground hover:text-primary transition flex items-center"
              >
                {link.label}
                {link.label === 'Sessions' && pendingSessions > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-4 min-w-[1rem] px-1 text-[0.65rem] rounded-full flex items-center justify-center">
                    {formatBadgeCount(pendingSessions)}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              {/* Authenticated User UI */}
              {/* Credit Balance Indicator */}
              <div className="hidden sm:flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="bg-secondary/10 text-secondary border-0"
                >
                  {walletLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <span className="font-semibold">
                      {wallet?.availableBalance ?? 0}
                    </span>
                  )}{' '}
                  Credits
                </Badge>
              </div>

              {/* Connections Button with Unread Count */}
              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link href="/connections">
                  <Users className="w-5 h-5" />
                  {pendingConnections > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 py-0 flex items-center justify-center text-[0.65rem] font-bold leading-none rounded-full"
                    >
                      {formatBadgeCount(pendingConnections)}
                    </Badge>
                  )}
                </Link>
              </Button>

              {/* Messages Button with Unread Count */}
              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link href="/messages">
                  <MessageSquare className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 py-0 flex items-center justify-center text-[0.65rem] font-bold leading-none rounded-full"
                    >
                      {formatBadgeCount(unreadCount)}
                    </Badge>
                  )}
                </Link>
              </Button>

              {/* Notifications Menu */}
              <NotificationsMenu />

              {/* User Account Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={session?.user?.image || undefined}
                        alt={session?.user?.name || 'User'}
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* User Info */}
                  <div className="px-2 py-2 border-b">
                    <p className="text-sm font-medium truncate">
                      {session?.user?.name || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive cursor-pointer"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {/* Non-authenticated User UI */}
              <Button variant="ghost" asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
