import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Fetch comments with author info
    const comments = await prisma.postComment.findMany({
      where: { postId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        commenter: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      comments: comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        commenter: {
          id: comment.commenter.id,
          name:
            comment.commenter.fullName || comment.commenter.name || 'Anonymous',
          image: comment.commenter.image,
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();
    const { content } = body;

    // Validate input
    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'Comment must be less than 1000 characters' },
        { status: 400 }
      );
    }

    // Check if post exists
    const post = await prisma.newsfeedPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Create comment
    const comment = await prisma.postComment.create({
      data: {
        postId,
        commenterId: session.user.id,
        content: content.trim(),
      },
      include: {
        commenter: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        commenter: {
          id: comment.commenter.id,
          name:
            comment.commenter.fullName || comment.commenter.name || 'Anonymous',
          image: comment.commenter.image,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
