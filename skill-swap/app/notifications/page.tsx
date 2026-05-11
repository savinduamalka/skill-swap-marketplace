import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { NotificationsList } from '@/components/notifications/notifications-list';

export const dynamic = 'force-dynamic';

export default function NotificationsPage() {
  return (
    <>
      <Header />
      <main className="pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-xl font-semibold mb-4">Notifications</h1>
          <NotificationsList />
        </div>
      </main>
      <MobileNav />
    </>
  );
}
