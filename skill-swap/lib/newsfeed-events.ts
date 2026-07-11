/**
 * Newsfeed Real-time Event Broadcaster
 *
 * Sends events to the socket server which broadcasts them to all connected clients.
 * Enables live feed updates (likes, comments, new posts) across all users.
 */

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL;
const SOCKET_SECRET = process.env.SOCKET_SECRET;

type NewsfeedEvent =
  | { event: 'post_liked'; data: { postId: string; userId: string; userName: string; likesCount: number; isLiked: boolean } }
  | { event: 'post_commented'; data: { postId: string; comment: any; commentsCount: number } }
  | { event: 'comment_liked'; data: { postId: string; commentId: string; userId: string; likesCount: number; isLiked: boolean } }
  | { event: 'comment_replied'; data: { postId: string; parentId: string; reply: any } }
  | { event: 'post_created'; data: { post: any } };

export async function broadcastNewsfeedEvent(payload: NewsfeedEvent): Promise<void> {
  if (!SOCKET_SERVER_URL || !SOCKET_SECRET) return;

  try {
    await fetch(`${SOCKET_SERVER_URL}/internal/newsfeed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-socket-secret': SOCKET_SECRET,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Fire-and-forget — don't break the main operation
    console.error('[Newsfeed Broadcast] Error:', error);
  }
}
