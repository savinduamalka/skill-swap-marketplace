/**
 * Single Learning Roadmap API Route
 *
 * PATCH  - toggle a step's completion (day-by-day progress tracking).
 * DELETE - remove a saved roadmap.
 *
 * @fileoverview PATCH/DELETE /api/roadmap/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  computeProgress,
  countSteps,
  type LearningRoadmapContent,
} from '@/lib/roadmap';

export const dynamic = 'force-dynamic';

/** Collects the set of valid step ids from a roadmap's content. */
function getValidStepIds(content: LearningRoadmapContent): Set<string> {
  const ids = new Set<string>();
  content.phases?.forEach((phase) =>
    phase.steps?.forEach((step) => ids.add(step.id))
  );
  return ids;
}

/** PATCH - update which steps are completed. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { stepId, completed } = body as {
      stepId?: string;
      completed?: boolean;
    };

    if (!stepId) {
      return NextResponse.json({ error: 'stepId is required' }, { status: 400 });
    }

    const roadmap = await prisma.learningRoadmap.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!roadmap) {
      return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
    }

    const content = roadmap.content as unknown as LearningRoadmapContent;
    const validIds = getValidStepIds(content);

    if (!validIds.has(stepId)) {
      return NextResponse.json(
        { error: 'Unknown step for this roadmap' },
        { status: 400 }
      );
    }

    // Build the new completed set, ignoring any stale ids.
    const current = new Set(
      roadmap.completedSteps.filter((s) => validIds.has(s))
    );
    if (completed) {
      current.add(stepId);
    } else {
      current.delete(stepId);
    }
    const completedSteps = Array.from(current);

    const updated = await prisma.learningRoadmap.update({
      where: { id: roadmap.id },
      data: { completedSteps },
      select: { completedSteps: true },
    });

    return NextResponse.json({
      success: true,
      completedSteps: updated.completedSteps,
      totalSteps: countSteps(content),
      progress: computeProgress(content, updated.completedSteps),
    });
  } catch (error) {
    console.error('Error updating roadmap progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

/** DELETE - remove a saved roadmap. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Ensure ownership before deleting.
    const roadmap = await prisma.learningRoadmap.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!roadmap) {
      return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
    }

    await prisma.learningRoadmap.delete({ where: { id: roadmap.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting roadmap:', error);
    return NextResponse.json(
      { error: 'Failed to delete roadmap' },
      { status: 500 }
    );
  }
}
