'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Flag, Users } from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/users', label: 'Users', icon: Users },
];

export function AdminMobileHeader() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden border-b bg-card sticky top-0 z-40">
      <div className="flex items-center px-4 py-3">
        <div className="flex items-center gap-2">
          <Image
            src="/skillswap-logo.png"
            alt="SkillSwap"
            width={24}
            height={24}
            className="rounded-sm"
          />
          <span className="font-semibold">Admin Panel</span>
        </div>
      </div>
      <nav className="flex border-t overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
