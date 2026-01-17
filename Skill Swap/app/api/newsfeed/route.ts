import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadMediaToStorage } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Number of posts to fetch per page
const POSTS_PER_PAGE = 12;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(
      searchParams.get('limit') || String(POSTS_PER_PAGE),
      10
    );

    // Get blocked user IDs (users blocked by current user AND users who blocked current user)
    const [blockedByMe, blockedMe] = await Promise.all([
      prisma.blockedUser.findMany({
        where: { blockerId: session.user.id },
        select: { blockedId: true },
      }),
      prisma.blockedUser.findMany({
        where: { blockedId: session.user.id },
        select: { blockerId: true },
      }),
    ]);

    const blockedUserIds = [
      ...blockedByMe.map((b: { blockedId: string }) => b.blockedId),
      ...blockedMe.map((b: { blockerId: string }) => b.blockerId),
    ];

    // Fetch posts with cursor-based pagination
    const posts = await prisma.newsfeedPost.findMany({
      where: {
        authorId: {
          notIn: blockedUserIds,
        },
      },
      take: limit + 1, // Fetch one extra to determine if there are more posts
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor post
      }),
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
            skillsOffered: {
              take: 3,
              select: {
                name: true,
              },
            },
          },
        },
        likes: {
          where: {
            userId: session.user.id,
          },
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    // Determine if there are more posts
    const hasMore = posts.length > limit;
    const postsToReturn = hasMore ? posts.slice(0, -1) : posts;

    // Get the next cursor
    const nextCursor = hasMore
      ? postsToReturn[postsToReturn.length - 1]?.id
      : null;

    // Transform posts to include isLiked flag
    const transformedPosts = postsToReturn.map((post) => ({
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
    }));

    return NextResponse.json({
      posts: transformedPosts,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching newsfeed posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const hashtags = formData.get('hashtags') as string | null;
    const media = formData.get('media') as File | null;

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Validate title and content length
    if (title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be less than 200 characters' },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Content must be less than 5000 characters' },
        { status: 400 }
      );
    }

    let mediaUrl: string | null = null;

    // Handle media upload if provided
    if (media && media.size > 0) {
      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
      ];
      if (!allowedTypes.includes(media.type)) {
        return NextResponse.json(
          {
            error:
              'Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM',
          },
          { status: 400 }
        );
      }

      // Validate file size (max 10MB for images, 50MB for videos)
      const maxSize = media.type.startsWith('video/')
        ? 50 * 1024 * 1024
        : 10 * 1024 * 1024;
      if (media.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        return NextResponse.json(
          { error: `File size must be less than ${maxSizeMB}MB` },
          { status: 400 }
        );
      }

      // Check if Supabase is configured
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.SUPABASE_SERVICE_ROLE_KEY
      ) {
        console.warn('Supabase not configured, skipping media upload');
      } else {
        // Generate unique filename
        const fileExt = media.name.split('.').pop() || 'jpg';
        const fileName = `${session.user.id}/${uuidv4()}.${fileExt}`;

        // Convert file to buffer
        const arrayBuffer = await media.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        mediaUrl = await uploadMediaToStorage(buffer, fileName, media.type);

        if (!mediaUrl) {
          // Log warning but don't fail the post creation
          console.warn(
            'Media upload failed, creating post without media. Check Supabase RLS policies and bucket configuration.'
          );
        }
      }
    }

    // Create the post
    const post = await prisma.newsfeedPost.create({
      data: {
        authorId: session.user.id,
        title: title.trim(),
        content: content.trim(),
        hashtags: hashtags?.trim() || null,
        mediaUrl,
      },
      include: {
        author: {
          select: {
            id: true,
            fullName: true,
            name: true,
            image: true,
            skillsOffered: {
              take: 3,
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        post: {
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
          isLiked: false,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
