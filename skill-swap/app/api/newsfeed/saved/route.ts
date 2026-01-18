/**
 * Saved Posts API Route
 *
 * Handles fetching the current user's saved posts
 * GET /api/newsfeed/saved - Fetch user's saved posts
 *
 * @fileoverview API route for fetching saved posts
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/newsfeed/saved
 * Fetch the current user's saved posts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    // Fetch saved posts
    const savedPosts = await prisma.savedPost.findMany({
      where: { userId: session.user.id },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                fullName: true,
                name: true,
                image: true,
              },
            },
            likes: {
              where: { userId: session.user.id },
              select: { id: true },
            },
            comments: {
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    });

    // Get author skills for each post
    const postsWithSkills = await Promise.all(
      savedPosts.map(async (saved) => {
        const authorSkills = await prisma.user.findUnique({
          where: { id: saved.post.authorId },
          select: {
            skillsOffered: {
              select: { name: true },
            },
          },
        });

        return {
          id: saved.post.id,
          title: saved.post.title,
          content: saved.post.content,
          mediaUrl: saved.post.mediaUrl,
          hashtags: saved.post.hashtags?.split(',').filter(Boolean) || [],
          viewCount: saved.post.viewCount,
          createdAt: saved.post.createdAt,
          updatedAt: saved.post.updatedAt,
          author: {
            id: saved.post.author.id,
            name:
              saved.post.author.fullName ||
              saved.post.author.name ||
              'Anonymous',
            image: saved.post.author.image,
            skills: authorSkills?.skillsOffered.map((s) => s.name) || [],
          },
          likesCount: saved.post.likes.length,
          commentsCount: saved.post.comments.length,
          isLiked: saved.post.likes.length > 0,
        };
      })
    );

    return NextResponse.json({
      posts: postsWithSkills,
      total: await prisma.savedPost.count({
        where: { userId: session.user.id },
      }),
    });
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved posts' },
      { status: 500 }
    );
  }
}
