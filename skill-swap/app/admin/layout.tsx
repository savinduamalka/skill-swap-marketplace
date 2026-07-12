import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { AdminSidebar } from './components/admin-sidebar';
import { AdminMobileHeader } from './components/admin-mobile-header';

export const metadata = {
  title: 'Admin Dashboard | SkillSwap',
  description: 'SkillSwap platform administration',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, fullName: true, name: true, image: true, email: true },
  });

  if (!user?.isAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        user={{
          name: user.fullName || user.name || 'Admin',
          email: user.email || '',
          image: user.image || '',
        }}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminMobileHeader />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
