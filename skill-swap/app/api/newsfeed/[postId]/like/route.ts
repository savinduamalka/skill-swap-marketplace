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

    // Check if user already liked the post
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: session.user.id,
        },
      },
    });

    let isLiked: boolean;

    if (existingLike) {
      // Unlike: Remove the like
      await prisma.postLike.delete({
        where: { id: existingLike.id },
      });
      isLiked = false;
    } else {
      // Like: Create a new like
      await prisma.postLike.create({
        data: {
          postId,
          userId: session.user.id,
        },
      });
      isLiked = true;
    }

    // Get updated like count
    const likesCount = await prisma.postLike.count({
      where: { postId },
    });

    return NextResponse.json({
      isLiked,
      likesCount,
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}
