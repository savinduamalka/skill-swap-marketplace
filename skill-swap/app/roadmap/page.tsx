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

async function getRoadmapPageData(userId: string) {
  try {
    const [skillsWanted, roadmaps] = await Promise.all([
      prisma.skillWant.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          description: true,
          proficiencyTarget: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.learningRoadmap.findMany({
        where: { userId, isArchived: false },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const savedRoadmaps = roadmaps.map((r) => {
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

    return { skillsWanted, savedRoadmaps };
  } catch (error) {
    console.error('Error fetching roadmap page data:', error);
    return { skillsWanted: [], savedRoadmaps: [] };
  }
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
