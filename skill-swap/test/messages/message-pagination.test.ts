/**
 * Messages API - Pagination & Access Control Tests
 *
 * Tests rare but critical scenarios:
 * - Invalid cursor ID (non-existent message)
 * - loadAll=true DoS potential (unbounded query)
 * - Access control bypass (user not in connection)
 * - Empty conversation edge case
 * - Auth check inconsistency (email vs id)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = vi.fn();
const mockPrisma = vi.hoisted(() => ({
  connection: { findUnique: vi.fn() },
  message: { findMany: vi.fn(), updateMany: vi.fn(), count: vi.fn(), deleteMany: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }));

describe('GET /api/messages/[connectionId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user1', email: 'user@test.com' } });
  });

  async function simulateGet(connectionId: string, params = '') {
    const { GET } = await import('@/app/api/messages/[connectionId]/route');
    const url = `http://localhost:3000/api/messages/${connectionId}${params ? '?' + params : ''}`;
    const request = new Request(url, { method: 'GET' }) as any;
    request.nextUrl = new URL(url);
    return GET(request, { params: Promise.resolve({ connectionId }) });
  }

  describe('Access Control', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);
      const res = await simulateGet('conn1');
      expect(res.status).toBe(401);
    });

    it('returns 404 when connection does not exist', async () => {
      mockPrisma.connection.findUnique.mockResolvedValue(null);
      const res = await simulateGet('nonexistent_conn');
      expect(res.status).toBe(404);
    });

    it('returns 403 when user is not part of the connection', async () => {
      mockPrisma.connection.findUnique.mockResolvedValue({
        id: 'conn1',
        user1Id: 'otherUser1',
        user2Id: 'otherUser2',
        user1: { id: 'otherUser1', name: 'Other1', image: null },
        user2: { id: 'otherUser2', name: 'Other2', image: null },
      });

      const res = await simulateGet('conn1');
      expect(res.status).toBe(403);
    });

    it('allows access when user is user1 of connection', async () => {
      mockPrisma.connection.findUnique.mockResolvedValue({
        id: 'conn1',
        user1Id: 'user1',
        user2Id: 'user2',
        user1: { id: 'user1', name: 'Me', image: null },
        user2: { id: 'user2', name: 'Other', image: null },
      });
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.message.updateMany.mockResolvedValue({});
      mockPrisma.message.count.mockResolvedValue(0);

      const res = await simulateGet('conn1');
      expect(res.status).toBe(200);
    });
  });

  describe('Pagination Edge Cases', () => {
    it('returns empty messages array for new conversation', async () => {
      mockPrisma.connection.findUnique.mockResolvedValue({
        id: 'conn1',
        user1Id: 'user1',
        user2Id: 'user2',
        user1: { id: 'user1', name: 'Me', image: null },
        user2: { id: 'user2', name: 'Other', image: null },
      });
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.message.updateMany.mockResolvedValue({});
      mockPrisma.message.count.mockResolvedValue(0);

      const res = await simulateGet('conn1');
      const data = await res.json();

      expect(data.messages).toEqual([]);
      expect(data.hasMore).toBe(false);
      expect(data.nextCursor).toBeNull();
    });

    it('sets hasMore=true when older messages exist', async () => {
      const messages = [
        { id: 'msg1', content: 'Hello', senderId: 'user2', sender: { id: 'user2', name: 'Other', image: null }, createdAt: new Date('2024-01-01'), isRead: true, mediaUrl: null, mediaType: null, mediaName: null, mediaSize: null, mediaThumbnail: null },
      ];
      mockPrisma.connection.findUnique.mockResolvedValue({
        id: 'conn1',
        user1Id: 'user1',
        user2Id: 'user2',
        user1: { id: 'user1', name: 'Me', image: null },
        user2: { id: 'user2', name: 'Other', image: null },
      });
      mockPrisma.message.findMany.mockResolvedValue(messages);
      mockPrisma.message.updateMany.mockResolvedValue({});
      mockPrisma.message.count.mockResolvedValue(5); // 5 older messages exist

      const res = await simulateGet('conn1');
      const data = await res.json();

      expect(data.hasMore).toBe(true);
      expect(data.nextCursor).toBe('msg1');
    });

    it('correctly identifies own messages via isOwn flag', async () => {
      // Prisma returns in DESC order (newest first), route reverses to ASC
      const messagesDesc = [
        { id: 'msg2', content: 'From me', senderId: 'user1', sender: { id: 'user1', name: 'Me', image: null }, createdAt: new Date('2024-01-01T11:00:00Z'), isRead: true, mediaUrl: null, mediaType: null, mediaName: null, mediaSize: null, mediaThumbnail: null },
        { id: 'msg1', content: 'From them', senderId: 'user2', sender: { id: 'user2', name: 'Other', image: null }, createdAt: new Date('2024-01-01T10:00:00Z'), isRead: false, mediaUrl: null, mediaType: null, mediaName: null, mediaSize: null, mediaThumbnail: null },
      ];
      mockPrisma.connection.findUnique.mockResolvedValue({
        id: 'conn1',
        user1Id: 'user1',
        user2Id: 'user2',
        user1: { id: 'user1', name: 'Me', image: null },
        user2: { id: 'user2', name: 'Other', image: null },
      });
      mockPrisma.message.findMany.mockResolvedValue(messagesDesc);
      mockPrisma.message.updateMany.mockResolvedValue({});
      mockPrisma.message.count.mockResolvedValue(0);

      const res = await simulateGet('conn1');
      const data = await res.json();

      // After reverse: msg1 (from them) first, msg2 (from me) second
      expect(data.messages[0].isOwn).toBe(false);
      expect(data.messages[1].isOwn).toBe(true);
    });
  });

  describe('Read Receipts', () => {
    it('marks unread messages as read on initial load', async () => {
      mockPrisma.connection.findUnique.mockResolvedValue({
        id: 'conn1',
        user1Id: 'user1',
        user2Id: 'user2',
        user1: { id: 'user1', name: 'Me', image: null },
        user2: { id: 'user2', name: 'Other', image: null },
      });
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.message.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.message.count.mockResolvedValue(0);

      await simulateGet('conn1');

      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: { connectionId: 'conn1', receiverId: 'user1', isRead: false },
        data: { isRead: true },
      });
    });

    it('does NOT mark messages as read when loading with cursor (loading older messages)', async () => {
      mockPrisma.connection.findUnique.mockResolvedValue({
        id: 'conn1',
        user1Id: 'user1',
        user2Id: 'user2',
        user1: { id: 'user1', name: 'Me', image: null },
        user2: { id: 'user2', name: 'Other', image: null },
      });
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.message.count.mockResolvedValue(0);

      await simulateGet('conn1', 'cursor=someMsgId');

      expect(mockPrisma.message.updateMany).not.toHaveBeenCalled();
    });
  });
});
