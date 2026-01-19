import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { NewsfeedContent } from './newsfeed-content';

// Number of posts per page
const POSTS_PER_PAGE = 12;

// Force dynamic rendering for personalized content
export const dynamic = 'force-dynamic';

// Post type for TypeScript
export interface NewsfeedPost {
  id: string;
  title: string;
  content: string;
  mediaUrl: string | null;
  hashtags: string[];
  viewCount: number;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    image: string | null;
    skills: string[];
  };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved?: boolean;
}

/**
 * Fetch initial posts from the database
 */
async function getInitialPosts(userId: string): Promise<{
  posts: NewsfeedPost[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  try {
    // Get blocked user IDs (sequential to avoid connection pool exhaustion)
    const blockedByMe = await prisma.blockedUser.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    const blockedMe = await prisma.blockedUser.findMany({
      where: { blockedId: userId },
      select: { blockerId: true },
    });

    const blockedUserIds = new Set([
      ...blockedByMe.map((b) => b.blockedId),
      ...blockedMe.map((b) => b.blockerId),
    ]);

    // Fetch posts
    const posts = await prisma.newsfeedPost.findMany({
      where: {
        authorId: {
          notIn: Array.from(blockedUserIds),
        },
      },
      take: POSTS_PER_PAGE + 1,
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
            userId: userId,
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

    const hasMore = posts.length > POSTS_PER_PAGE;
    const postsToReturn = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore
      ? postsToReturn[postsToReturn.length - 1]?.id
      : null;

    const transformedPosts: NewsfeedPost[] = postsToReturn.map((post) => ({
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

    return { posts: transformedPosts, nextCursor, hasMore };
  } catch (error) {
    console.error('Error fetching newsfeed posts:', error);
    return { posts: [], nextCursor: null, hasMore: false };
  }
}

export default async function NewsfeedPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const initialData = await getInitialPosts(session.user.id);

  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <NewsfeedContent
            initialPosts={initialData.posts}
            initialCursor={initialData.nextCursor}
            initialHasMore={initialData.hasMore}
            currentUserId={session.user.id}
          />
        </div>
      </main>

      <MobileNav />
    </>
  );
}
