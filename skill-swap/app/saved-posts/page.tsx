/**
 * Saved Posts Page
 *
 * Displays the current user's saved posts with infinite scroll
 *
 * @fileoverview User's saved posts collection page
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Card } from '@/components/ui/card';
import { SavedPostsContent } from './saved-posts-content';

export const metadata = {
  title: 'Saved Posts - Skill Swap',
  description: 'View your saved posts',
};

export default async function SavedPostsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobileNav />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Saved Posts</h1>
          <p className="text-muted-foreground">
            View all posts you've saved for later
          </p>
        </div>

        <SavedPostsContent currentUserId={session.user.id} />
      </main>
    </div>
  );
}
