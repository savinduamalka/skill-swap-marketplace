/**
 * User Posts API Route
 *
 * Handles fetching posts by a specific user
 * GET /api/users/[userId]/posts - Fetch user's posts
 *
 * @fileoverview API route for fetching user posts
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/[userId]/posts
 * Fetch posts created by a specific user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    // Get posts by user
    const posts = await prisma.newsfeedPost.findMany({
      where: { authorId: userId },
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
            skillsOffered: {
              select: { name: true },
            },
          },
        },
        likes: {
          where: { userId: session?.user?.id },
          select: { id: true },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        savedBy: {
          where: { userId: session?.user?.id },
          select: { id: true },
        },
      },
    });

    return NextResponse.json({
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        mediaUrl: post.mediaUrl,
        hashtags:
          post.hashtags
            ?.split(',')
            .map((tag) => tag.trim())
            .filter(Boolean) || [],
        viewCount: post.viewCount,
        createdAt: post.createdAt,
        author: {
          id: post.author.id,
          name: post.author.fullName || post.author.name || 'Anonymous',
          image: post.author.image,
          skills: post.author.skillsOffered.map((s) => s.name),
        },
        likesCount: post._count.likes,
        commentsCount: post._count.comments,
        isLiked: post.likes.length > 0,
        isSaved: post.savedBy.length > 0,
      })),
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user posts' },
      { status: 500 }
    );
  }
}
