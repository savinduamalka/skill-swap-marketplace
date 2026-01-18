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

    const { name, description, proficiencyTarget } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Skill name is required' },
        { status: 400 }
      );
    }

    // Create skill want
    const skillWant = await prisma.skillWant.create({
      data: {
        userId,
        name: name.trim(),
        description: description?.trim() || null,
        proficiencyTarget: proficiencyTarget || null,
      },
    });

    return NextResponse.json({ success: true, skillWant }, { status: 201 });
  } catch (error) {
    console.error('Error creating skill want:', error);
    return NextResponse.json(
      { error: 'Failed to create learning goal' },
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
    const skillWantId = searchParams.get('id');

    if (!skillWantId) {
      return NextResponse.json(
        { error: 'Skill ID is required' },
        { status: 400 }
      );
    }

    // Verify the skill want belongs to the user
    const skillWant = await prisma.skillWant.findFirst({
      where: { id: skillWantId, userId },
    });

    if (!skillWant) {
      return NextResponse.json(
        { error: 'Learning goal not found' },
        { status: 404 }
      );
    }

    // Delete the skill want
    await prisma.skillWant.delete({
      where: { id: skillWantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting skill want:', error);
    return NextResponse.json(
      { error: 'Failed to delete learning goal' },
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

    const { id, name, description, proficiencyTarget } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Skill ID is required' },
        { status: 400 }
      );
    }

    // Verify the skill want belongs to the user
    const existingSkillWant = await prisma.skillWant.findFirst({
      where: { id, userId },
    });

    if (!existingSkillWant) {
      return NextResponse.json(
        { error: 'Learning goal not found' },
        { status: 404 }
      );
    }

    // Update the skill want
    const skillWant = await prisma.skillWant.update({
      where: { id },
      data: {
        name: name?.trim() || existingSkillWant.name,
        description: description?.trim() || existingSkillWant.description,
        proficiencyTarget:
          proficiencyTarget || existingSkillWant.proficiencyTarget,
      },
    });

    return NextResponse.json({ success: true, skillWant });
  } catch (error) {
    console.error('Error updating skill want:', error);
    return NextResponse.json(
      { error: 'Failed to update learning goal' },
      { status: 500 }
    );
  }
}
