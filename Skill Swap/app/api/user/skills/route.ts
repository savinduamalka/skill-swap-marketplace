import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      name,
      description,
      proficiencyLevel,
      yearsOfExperience,
      teachingFormat,
      availabilityWindow,
      timeZone,
      alternativeNames,
    } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Skill name is required' },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!proficiencyLevel) {
      return NextResponse.json(
        { error: 'Proficiency level is required' },
        { status: 400 }
      );
    }

    if (!yearsOfExperience || yearsOfExperience < 0) {
      return NextResponse.json(
        { error: 'Valid years of experience is required' },
        { status: 400 }
      );
    }

    if (!teachingFormat) {
      return NextResponse.json(
        { error: 'Teaching format is required' },
        { status: 400 }
      );
    }

    // Create skill
    const skill = await prisma.skill.create({
      data: {
        ownerId: userId,
        name: name.trim(),
        description: description.trim(),
        proficiencyLevel,
        yearsOfExperience: parseInt(yearsOfExperience),
        teachingFormat,
        availabilityWindow: availabilityWindow || '09:00-17:00',
        timeZone: timeZone || 'UTC',
        alternativeNames: alternativeNames?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, skill }, { status: 201 });
  } catch (error) {
    console.error('Error creating skill:', error);
    return NextResponse.json(
      { error: 'Failed to create skill' },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get('id');

    if (!skillId) {
      return NextResponse.json(
        { error: 'Skill ID is required' },
        { status: 400 }
      );
    }

    // Verify the skill belongs to the user
    const skill = await prisma.skill.findFirst({
      where: { id: skillId, ownerId: userId },
    });

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    // Delete the skill
    await prisma.skill.delete({
      where: { id: skillId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting skill:', error);
    return NextResponse.json(
      { error: 'Failed to delete skill' },
      { status: 500 }
    );
  }
}
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      id,
      name,
      description,
      proficiencyLevel,
      yearsOfExperience,
      teachingFormat,
      availabilityWindow,
      timeZone,
      alternativeNames,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Skill ID is required' },
        { status: 400 }
      );
    }

    // Verify the skill belongs to the user
    const existingSkill = await prisma.skill.findFirst({
      where: { id, ownerId: userId },
    });

    if (!existingSkill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    // Update the skill
    const skill = await prisma.skill.update({
      where: { id },
      data: {
        name: name?.trim() || existingSkill.name,
        description: description?.trim() || existingSkill.description,
        proficiencyLevel: proficiencyLevel || existingSkill.proficiencyLevel,
        yearsOfExperience:
          yearsOfExperience !== undefined
            ? parseInt(yearsOfExperience)
            : existingSkill.yearsOfExperience,
        teachingFormat: teachingFormat || existingSkill.teachingFormat,
        availabilityWindow:
          availabilityWindow || existingSkill.availabilityWindow,
        timeZone: timeZone || existingSkill.timeZone,
        alternativeNames:
          alternativeNames !== undefined
            ? alternativeNames?.trim() || null
            : existingSkill.alternativeNames,
      },
    });

    return NextResponse.json({ success: true, skill });
  } catch (error) {
    console.error('Error updating skill:', error);
    return NextResponse.json(
      { error: 'Failed to update skill' },
      { status: 500 }
    );
  }
}
