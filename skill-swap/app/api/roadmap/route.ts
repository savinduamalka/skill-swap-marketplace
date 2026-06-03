/**
 * Learning Roadmaps Collection API Route
 *
 * GET  - list the current user's saved roadmaps (with progress).
 * POST - save a generated roadmap so the user can follow it day by day.
 *
 * @fileoverview GET/POST /api/roadmap
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  computeProgress,
  countSteps,
  normalizeProficiency,
  type LearningRoadmapContent,
} from '@/lib/roadmap';

export const dynamic = 'force-dynamic';

/** GET - list saved roadmaps for the dashboard / My Roadmaps tab. */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roadmaps = await prisma.learningRoadmap.findMany({
      where: { userId: session.user.id, isArchived: false },
      orderBy: { updatedAt: 'desc' },
    });

    const data = roadmaps.map((r) => {
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
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    return NextResponse.json(
      { success: true, roadmaps: data },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching roadmaps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roadmaps' },
      { status: 500 }
    );
  }
}

/** POST - persist a generated roadmap. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { skillName, skillDescription, proficiencyTarget, skillWantId, content } =
      body as {
        skillName?: string;
        skillDescription?: string | null;
        proficiencyTarget?: string | null;
        skillWantId?: string | null;
        content?: LearningRoadmapContent;
      };

    // Validate the structured plan before persisting.
    if (!skillName?.trim()) {
      return NextResponse.json(
        { error: 'Skill name is required' },
        { status: 400 }
      );
    }

    if (
      !content ||
      !Array.isArray(content.phases) ||
      content.phases.length === 0
    ) {
      return NextResponse.json(
        { error: 'A valid roadmap is required to save' },
        { status: 400 }
      );
    }

    // If linked to a learning goal, confirm it belongs to the user.
    let validSkillWantId: string | null = null;
    if (skillWantId) {
      const owned = await prisma.skillWant.findFirst({
        where: { id: skillWantId, userId },
        select: { id: true },
      });
      validSkillWantId = owned?.id ?? null;
    }

    const roadmap = await prisma.learningRoadmap.create({
      data: {
        userId,
        skillWantId: validSkillWantId,
        skillName: skillName.trim(),
        skillDescription: skillDescription?.trim() || null,
        proficiencyTarget: normalizeProficiency(proficiencyTarget),
        title: content.title?.trim() || `Learning Path: ${skillName.trim()}`,
        summary: content.summary?.trim() || null,
        estimatedDuration:
          typeof content.estimatedDuration === 'string'
            ? content.estimatedDuration.trim() || null
            : null,
        // Prisma Json field — cast through unknown to satisfy the input type.
        content: content as unknown as object,
        completedSteps: [],
      },
    });

    return NextResponse.json(
      { success: true, id: roadmap.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving roadmap:', error);
    return NextResponse.json(
      { error: 'Failed to save roadmap' },
      { status: 500 }
    );
  }
}
