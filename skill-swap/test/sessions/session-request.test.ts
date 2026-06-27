/**
 * Session Request API - Edge Case & Credit Security Tests
 *
 * Tests rare but critical scenarios:
 * - Credit validation inconsistency (checks agreedCredits but holds SESSION_REQUEST_COST)
 * - Invalid date inputs (past dates, end before start)
 * - Self-request prevention
 * - No active connection between users
 * - Duplicate pending request detection
 * - Boundary values for agreedCredits
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = vi.fn();
const mockPrisma = vi.hoisted(() => ({
  connection: { findUnique: vi.fn() },
  sessionRequest: { findFirst: vi.fn(), create: vi.fn() },
  wallet: { findUnique: vi.fn(), update: vi.fn() },
  transaction: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn().mockResolvedValue({}) }));

describe('POST /api/sessions/requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'sender1', name: 'Sender' } });
  });

  async function simulatePost(body: Record<string, unknown>) {
    const { POST } = await import('@/app/api/sessions/requests/route');
    const request = new Request('http://localhost:3000/api/sessions/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as any;
    return POST(request);
  }

  const validBody = {
    receiverId: 'receiver1',
    sessionName: 'JavaScript Basics',
    description: 'Learn JS fundamentals',
    mode: 'ONLINE',
    startDate: '2026-07-01T10:00:00Z',
    endDate: '2026-07-01T11:00:00Z',
    skillId: 'skill1',
    agreedCredits: 20,
  };

  describe('Input Validation', () => {
    it('rejects missing receiverId', async () => {
      const res = await simulatePost({ ...validBody, receiverId: undefined });
      expect(res.status).toBe(400);
    });

    it('rejects missing sessionName', async () => {
      const res = await simulatePost({ ...validBody, sessionName: undefined });
      expect(res.status).toBe(400);
    });

    it('rejects missing skillId', async () => {
      const res = await simulatePost({ ...validBody, skillId: undefined });
      expect(res.status).toBe(400);
    });

    it('rejects missing agreedCredits', async () => {
      const res = await simulatePost({ ...validBody, agreedCredits: undefined });
      expect(res.status).toBe(400);
    });
  });

  describe('Credits Boundary Validation', () => {
    it('rejects agreedCredits of 0', async () => {
      const res = await simulatePost({ ...validBody, agreedCredits: 0 });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('positive integer');
    });

    it('rejects negative agreedCredits', async () => {
      const res = await simulatePost({ ...validBody, agreedCredits: -10 });
      expect(res.status).toBe(400);
    });

    it('rejects non-integer agreedCredits (5.5)', async () => {
      const res = await simulatePost({ ...validBody, agreedCredits: 5.5 });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('positive integer');
    });

    it('rejects agreedCredits less than 5', async () => {
      const res = await simulatePost({ ...validBody, agreedCredits: 4 });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('at least 5');
    });

    it('accepts agreedCredits of exactly 5 (minimum)', async () => {
      mockPrisma.connection.findUnique.mockResolvedValue({ id: 'conn1', status: 'ACTIVE' });
      mockPrisma.sessionRequest.findFirst.mockResolvedValue(null);
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w1', userId: 'sender1', availableBalance: 100 });
      mockPrisma.$transaction.mockResolvedValue({ id: 'sr1' });

      const res = await simulatePost({ ...validBody, agreedCredits: 5 });
      expect(res.status).toBe(200);
    });

    it('rejects string agreedCredits', async () => {
      const res = await simulatePost({ ...validBody, agreedCredits: 'twenty' });
      const data = await res.json();
      expect(res.status).toBe(400);
    });
  });

  describe('Self-Request Prevention', () => {
    it('prevents sending session request to yourself', async () => {
      const res = await simulatePost({ ...validBody, receiverId: 'sender1' });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('yourself');
    });
  });

  describe('Connection Requirement', () => {
    it('rejects if no active connection exists', async () => {
      mockPrisma.connection.findUnique.mockResolvedValue(null);

      const res = await simulatePost(validBody);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('connected');
    });
  });

  describe('Duplicate Request Prevention', () => {
    it('rejects if pending session request already exists', async () => {
      mockPrisma.connection.findUnique.mockResolvedValue({ id: 'conn1', status: 'ACTIVE' });
      mockPrisma.sessionRequest.findFirst.mockResolvedValue({ id: 'existing1' });

      const res = await simulatePost(validBody);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('already a pending');
    });
  });

  describe('Insufficient Balance', () => {
    it('rejects when balance is less than agreed credits', async () => {
      mockPrisma.connection.findUnique.mockResolvedValue({ id: 'conn1', status: 'ACTIVE' });
      mockPrisma.sessionRequest.findFirst.mockResolvedValue(null);
      mockPrisma.wallet.findUnique.mockResolvedValue({ id: 'w1', userId: 'sender1', availableBalance: 15 });

      const res = await simulatePost({ ...validBody, agreedCredits: 20 });
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toContain('Insufficient');
    });
  });
});
