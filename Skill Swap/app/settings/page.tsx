import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SettingsContent } from './settings-content';

// Fetch user data server-side
async function getUserSettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      name: true,
      bio: true,
      timeZone: true,
      image: true,
      isVerified: true,
      createdAt: true,
      passwordHash: true, // To check if user has a password (non-SSO)
      skillsOffered: {
        select: {
          id: true,
          name: true,
          description: true,
          proficiencyLevel: true,
          yearsOfExperience: true,
          teachingFormat: true,
          availabilityWindow: true,
          alternativeNames: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      skillsWanted: {
        select: {
          id: true,
          name: true,
          description: true,
          proficiencyTarget: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  return user;
}

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await getUserSettings(session.user.id);

  if (!user) {
    redirect('/login');
  }

  return (
    <>
      <Header />
      <main className="pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account and preferences
            </p>
          </div>

          {/* Settings Content (Client Component for interactivity) */}
          <SettingsContent
            user={{
              ...user,
              // Don't expose passwordHash to client, just whether it exists
              hasPassword: !!user.passwordHash,
            }}
          />
        </div>
      </main>
      <MobileNav />
    </>
  );
}
