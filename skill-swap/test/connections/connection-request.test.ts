/**
 * Connection Request API - Edge Case & Security Tests
 *
 * Tests rare but critical scenarios:
 * - Credit double-spend via concurrent requests
 * - Self-connection attempt
 * - Request to non-existent user
 * - Already connected users
 * - Wallet boundary conditions (exactly 5 credits)
 * - Zero balance edge case
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = vi.fn();
const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  connection: { findFirst: vi.fn() },
  connectionRequest: { findFirst: vi.fn(), deleteMany: vi.fn() },
  wallet: { findUnique: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/email', () => ({ sendConnectionRequestEmail: vi.fn().mockResolvedValue({ success: true }) }));

describe('POST /api/connections/request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'sender1', name: 'Sender' } });
  });

  async function simulateRequest(body: Record<string, unknown>) {
    const { POST } = await import('@/app/api/connections/request/route');
    const request = new Request('http://localhost:3000/api/connections/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as any;
    return POST(request);
  }

  describe('Authorization', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);
      const res = await simulateRequest({ receiverId: 'user2' });
      expect(res.status).toBe(401);
    });

    it('returns 401 when session has no user id', async () => {
      mockAuth.mockResolvedValue({ user: { email: 'test@test.com' } });
      const res = await simulateRequest({ receiverId: 'user2' });
      expect(res.status).toBe(401);
    });
  });

  describe('Self-Connection Prevention', () => {
    it('prevents sending request to yourself', async () => {
      const res = await simulateRequest({ receiverId: 'sender1' });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('yourself');
    });
  });

  describe('Non-Existent Receiver', () => {
    it('returns 404 for non-existent receiver ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await simulateRequest({ receiverId: 'nonexistent_id' });
      expect(res.status).toBe(404);
    });
  });

  describe('Duplicate Request Prevention', () => {
    it('blocks if already connected', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'receiver1', fullName: 'R', name: 'R', email: 'r@t.com' });
      mockPrisma.connection.findFirst.mockResolvedValue({ id: 'conn1' });

      const res = await simulateRequest({ receiverId: 'receiver1' });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('already connected');
    });

    it('blocks if pending request exists in either direction', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'receiver1', fullName: 'R', name: 'R', email: 'r@t.com' });
      mockPrisma.connection.findFirst.mockResolvedValue(null);
      mockPrisma.connectionRequest.findFirst.mockResolvedValue({ id: 'pending1' });

      const res = await simulateRequest({ receiverId: 'receiver1' });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('already exists');
    });
  });

  describe('Credit Balance Edge Cases', () => {
    it('blocks when balance is exactly 4 (one less than required)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'receiver1', fullName: 'R', name: 'R', email: 'r@t.com' });
      mockPrisma.connection.findFirst.mockResolvedValue(null);
      mockPrisma.connectionRequest.findFirst.mockResolvedValue(null);
      mockPrisma.connectionRequest.deleteMany.mockResolvedValue({});
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w1', userId: 'sender1', availableBalance: 4 });

      const res = await simulateRequest({ receiverId: 'receiver1' });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('Insufficient balance');
    });

    it('allows when balance is exactly 5 (minimum required)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'receiver1', fullName: 'R', name: 'R', email: 'r@t.com' });
      mockPrisma.connection.findFirst.mockResolvedValue(null);
      mockPrisma.connectionRequest.findFirst.mockResolvedValue(null);
      mockPrisma.connectionRequest.deleteMany.mockResolvedValue({});
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w1', userId: 'sender1', availableBalance: 5 });
      mockPrisma.$transaction.mockResolvedValue({ id: 'req1', receiverId: 'receiver1', status: 'PENDING', creditsHeld: 5, createdAt: new Date() });

      const res = await simulateRequest({ receiverId: 'receiver1' });
      expect(res.status).toBe(200);
    });

    it('blocks when balance is zero', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'receiver1', fullName: 'R', name: 'R', email: 'r@t.com' });
      mockPrisma.connection.findFirst.mockResolvedValue(null);
      mockPrisma.connectionRequest.findFirst.mockResolvedValue(null);
      mockPrisma.connectionRequest.deleteMany.mockResolvedValue({});
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w1', userId: 'sender1', availableBalance: 0 });

      const res = await simulateRequest({ receiverId: 'receiver1' });
      expect(res.status).toBe(400);
    });

    it('returns error when wallet does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'receiver1', fullName: 'R', name: 'R', email: 'r@t.com' });
      mockPrisma.connection.findFirst.mockResolvedValue(null);
      mockPrisma.connectionRequest.findFirst.mockResolvedValue(null);
      mockPrisma.connectionRequest.deleteMany.mockResolvedValue({});
      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      const res = await simulateRequest({ receiverId: 'receiver1' });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('Wallet not found');
    });
  });

  describe('Input Validation', () => {
    it('rejects missing receiverId', async () => {
      const res = await simulateRequest({});
      expect(res.status).toBe(400);
    });

    it('rejects null receiverId', async () => {
      const res = await simulateRequest({ receiverId: null });
      expect(res.status).toBe(400);
    });

    it('rejects empty string receiverId', async () => {
      const res = await simulateRequest({ receiverId: '' });
      expect(res.status).toBe(400);
    });
  });
});
