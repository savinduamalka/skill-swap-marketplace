/**
 * Roadmap Generation API Route
 *
 * Generates a personalized learning roadmap from a skill the user wants to
 * learn. The result is returned but NOT saved — the client invites the user to
 * save it. If they don't, it simply disappears.
 *
 * @fileoverview POST /api/roadmap/generate
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateRoadmap, normalizeProficiency } from '@/lib/roadmap';
import { LLMError } from '@/lib/llm';

export const dynamic = 'force-dynamic';
// Roadmap generation can take several seconds on the LLM.
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { skillWantId } = body;

    let skillName: string | undefined = body.skillName;
    let skillDescription: string | null = body.skillDescription ?? null;
    let proficiencyTarget: string | null = body.proficiencyTarget ?? null;

    // Prefer the authoritative DB record when a saved learning goal is selected.
    if (skillWantId) {
      const skillWant = await prisma.skillWant.findFirst({
        where: { id: skillWantId, userId },
        select: { name: true, description: true, proficiencyTarget: true },
      });

      if (!skillWant) {
        return NextResponse.json(
          { error: 'Learning goal not found' },
          { status: 404 }
        );
      }

      skillName = skillWant.name;
      skillDescription = skillWant.description;
      proficiencyTarget = skillWant.proficiencyTarget;
    }

    if (!skillName?.trim()) {
      return NextResponse.json(
        { error: 'A skill is required to generate a roadmap' },
        { status: 400 }
      );
    }

    // Personalize using the learner's name and the skills they already teach,
    // so the mentor avoids re-teaching basics the user already knows.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        name: true,
        skillsOffered: { select: { name: true }, take: 10 },
      },
    });

    const content = await generateRoadmap({
      skillName: skillName.trim(),
      skillDescription,
      proficiencyTarget: normalizeProficiency(proficiencyTarget),
      learnerName: user?.fullName || user?.name || null,
      knownSkills: user?.skillsOffered.map((s) => s.name) ?? [],
    });

    return NextResponse.json({
      success: true,
      roadmap: {
        skillName: skillName.trim(),
        skillDescription,
        proficiencyTarget: normalizeProficiency(proficiencyTarget),
        skillWantId: skillWantId || null,
        content,
      },
    });
  } catch (error) {
    if (error instanceof LLMError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error generating roadmap:', error);
    return NextResponse.json(
      { error: 'Failed to generate roadmap' },
      { status: 500 }
    );
  }
}
