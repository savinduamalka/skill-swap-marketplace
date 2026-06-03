/**
 * Learning Roadmap Page (SSR)
 *
 * @fileoverview /roadmap
 */
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { RoadmapContent } from './roadmap-content';
import {
  computeProgress,
  countSteps,
  type LearningRoadmapContent,
} from '@/lib/roadmap';

export const metadata = {
  title: 'Learning Roadmap | SkillSwap',
  description: 'Get a personalized, step-by-step path for the skills you want to learn',
};

export const dynamic = 'force-dynamic';

async function getSkillsWanted(userId: string) {
  try {
    return await prisma.skillWant.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        description: true,
        proficiencyTarget: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error fetching learning goals:', error);
    return [];
  }
}

async function getSavedRoadmaps(userId: string) {
  try {
    const roadmaps = await prisma.learningRoadmap.findMany({
      where: { userId, isArchived: false },
      orderBy: { updatedAt: 'desc' },
    });

    return roadmaps.map((r) => {
      const content = r.content as unknown as LearningRoadmapContent;
      return {
        id: r.id,
        skillName: r.skillName,
        skillDescription: r.skillDescription,
        proficiencyTarget: r.proficiencyTarget,
        title: r.title,
        summary: r.summary,
        estimatedDuration: r.estimatedDuration,
        content,
        completedSteps: r.completedSteps,
        totalSteps: countSteps(content),
        progress: computeProgress(content, r.completedSteps),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });
  } catch (error) {
    // A missing/empty roadmaps table must never hide the user's learning goals.
    console.error('Error fetching saved roadmaps:', error);
    return [];
  }
}

async function getRoadmapPageData(userId: string) {
  // Fetch independently so one failing query can't blank out the other.
  const [skillsWanted, savedRoadmaps] = await Promise.all([
    getSkillsWanted(userId),
    getSavedRoadmaps(userId),
  ]);

  return { skillsWanted, savedRoadmaps };
}

export default async function RoadmapPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { skillsWanted, savedRoadmaps } = await getRoadmapPageData(
    session.user.id
  );

  return (
    <>
      <Header />
      <main className="pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Learning Roadmap
            </h1>
            <p className="text-muted-foreground">
              Pick a skill you want to learn and get a personalized, step-by-step
              path you can follow day by day.
            </p>
          </div>

          <RoadmapContent
            skillsWanted={skillsWanted}
            initialRoadmaps={savedRoadmaps}
          />
        </div>
      </main>
      <MobileNav />
    </>
  );
}
