/**
 * Saved Posts Page
 *
 * Displays the current user's saved posts with infinite scroll,
 * wrapped in the same 3-column layout as the newsfeed for UI consistency.
 *
 * @fileoverview User's saved posts collection page
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { SavedPostsContent } from './saved-posts-content';
import { prisma } from '@/lib/prisma';
import type { NewsfeedSkill } from '../newsfeed/page';

export const metadata = {
  title: 'Saved Posts - Skill Swap',
  description: 'View your saved posts',
};

export default async function SavedPostsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Fetch sidebar data in parallel
  const [savedCount, userPostsCount, recentSkillsQuery] = await Promise.all([
    prisma.savedPost.count({ where: { userId } }),
    prisma.newsfeedPost.count({ where: { authorId: userId } }),
    prisma.skill.findMany({
      where: {
        isTeaching: true,
        ownerId: { not: userId },
      },
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, fullName: true, name: true, image: true },
        },
      },
    }),
  ]);

  const recentSkills: NewsfeedSkill[] = recentSkillsQuery.map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    proficiencyLevel: skill.proficiencyLevel,
    teachingFormat: skill.teachingFormat,
    createdAt: skill.createdAt,
    owner: {
      id: skill.owner.id,
      name: skill.owner.fullName || skill.owner.name || 'Anonymous',
      image: skill.owner.image,
    },
  }));

  return (
    <>
      <Header />
      <MobileNav />

      <main className="pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SavedPostsContent
            currentUserId={userId}
            savedCount={savedCount}
            userPostsCount={userPostsCount}
            recentSkills={recentSkills}
          />
        </div>
      </main>
    </>
  );
}
