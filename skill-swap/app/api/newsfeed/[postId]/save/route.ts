import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;

    // Check if post exists
    const post = await prisma.newsfeedPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if already saved
    const existingSave = await prisma.savedPost.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: session.user.id,
        },
      },
    });

    if (existingSave) {
      // Unsave the post
      await prisma.savedPost.delete({
        where: {
          postId_userId: {
            postId,
            userId: session.user.id,
          },
        },
      });

      return NextResponse.json({ isSaved: false }, { status: 200 });
    } else {
      // Save the post
      await prisma.savedPost.create({
        data: {
          postId,
          userId: session.user.id,
        },
      });

      return NextResponse.json({ isSaved: true }, { status: 201 });
    }
  } catch (error) {
    console.error('Error saving/unsaving post:', error);
    return NextResponse.json(
      { error: 'Failed to save/unsave post' },
      { status: 500 }
    );
  }
}
