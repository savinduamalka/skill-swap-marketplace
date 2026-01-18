import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const { fullName, bio, timeZone } = body;

    // Validate required fields
    if (!fullName || fullName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      );
    }

    // Update user in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName.trim(),
        name: fullName.trim(), // Also update name field for consistency
        bio: bio?.trim() || null,
        timeZone: timeZone || 'UTC',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        name: true,
        bio: true,
        timeZone: true,
        image: true,
        isVerified: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/settings
 *
 * Gets the authenticated user's account settings
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

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
        skillsOffered: {
          select: {
            id: true,
            name: true,
            proficiencyLevel: true,
            yearsOfExperience: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}
