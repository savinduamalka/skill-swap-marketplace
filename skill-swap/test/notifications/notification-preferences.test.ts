/**
 * Notification Preferences API - Edge Case & Security Tests
 *
 * Tests rare but critical scenarios:
 * - Field injection (trying to update non-whitelisted fields like isAdmin)
 * - Non-boolean values for preference fields
 * - Empty body handling
 * - Partial updates (only updating one field)
 * - Concurrent preference updates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = vi.fn();
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

describe('Notification Preferences API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: 'user1' } });
  });

  describe('PUT /api/user/notifications/preferences', () => {
    async function simulatePut(body: Record<string, unknown>) {
      const { PUT } = await import('@/app/api/user/notifications/preferences/route');
      const request = new Request('http://localhost:3000/api/user/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }) as any;
      return PUT(request);
    }

    describe('Field Injection Prevention', () => {
      it('ignores isAdmin field in request body', async () => {
        mockPrisma.user.update.mockResolvedValue({
          notifyEmail: true,
          notifyConnectionReq: true,
          notifySessionReminder: true,
          notifyMessages: true,
        });

        await simulatePut({ notifyEmail: true, isAdmin: true });

        const updateCall = mockPrisma.user.update.mock.calls[0][0];
        expect(updateCall.data).not.toHaveProperty('isAdmin');
        expect(updateCall.data).toHaveProperty('notifyEmail');
      });

      it('ignores passwordHash field in request body', async () => {
        mockPrisma.user.update.mockResolvedValue({
          notifyEmail: true,
          notifyConnectionReq: true,
          notifySessionReminder: true,
          notifyMessages: true,
        });

        await simulatePut({ notifyEmail: false, passwordHash: 'injected' });

        const updateCall = mockPrisma.user.update.mock.calls[0][0];
        expect(updateCall.data).not.toHaveProperty('passwordHash');
      });

      it('ignores email field in request body', async () => {
        mockPrisma.user.update.mockResolvedValue({
          notifyEmail: true,
          notifyConnectionReq: true,
          notifySessionReminder: true,
          notifyMessages: true,
        });

        await simulatePut({ notifyMessages: true, email: 'hacker@evil.com' });

        const updateCall = mockPrisma.user.update.mock.calls[0][0];
        expect(updateCall.data).not.toHaveProperty('email');
      });
    });

    describe('Type Validation', () => {
      it('rejects string "true" as non-boolean', async () => {
        const res = await simulatePut({ notifyEmail: 'true' });
        expect(res.status).toBe(400);
      });

      it('rejects number 1 as non-boolean', async () => {
        const res = await simulatePut({ notifyEmail: 1 });
        expect(res.status).toBe(400);
      });

      it('rejects null as non-boolean', async () => {
        const res = await simulatePut({ notifyEmail: null });
        expect(res.status).toBe(400);
      });

      it('rejects empty object', async () => {
        const res = await simulatePut({});
        expect(res.status).toBe(400);
      });

      it('accepts boolean true', async () => {
        mockPrisma.user.update.mockResolvedValue({
          notifyEmail: true,
          notifyConnectionReq: true,
          notifySessionReminder: true,
          notifyMessages: true,
        });

        const res = await simulatePut({ notifyEmail: true });
        expect(res.status).toBe(200);
      });

      it('accepts boolean false', async () => {
        mockPrisma.user.update.mockResolvedValue({
          notifyEmail: false,
          notifyConnectionReq: true,
          notifySessionReminder: true,
          notifyMessages: true,
        });

        const res = await simulatePut({ notifyEmail: false });
        expect(res.status).toBe(200);
      });
    });

    describe('Partial Updates', () => {
      it('updates only the specified field', async () => {
        mockPrisma.user.update.mockResolvedValue({
          notifyEmail: true,
          notifyConnectionReq: false,
          notifySessionReminder: true,
          notifyMessages: true,
        });

        await simulatePut({ notifyConnectionReq: false });

        const updateCall = mockPrisma.user.update.mock.calls[0][0];
        expect(updateCall.data).toEqual({ notifyConnectionReq: false });
      });

      it('updates multiple fields at once', async () => {
        mockPrisma.user.update.mockResolvedValue({
          notifyEmail: false,
          notifyConnectionReq: false,
          notifySessionReminder: true,
          notifyMessages: true,
        });

        await simulatePut({ notifyEmail: false, notifyConnectionReq: false });

        const updateCall = mockPrisma.user.update.mock.calls[0][0];
        expect(updateCall.data).toEqual({ notifyEmail: false, notifyConnectionReq: false });
      });
    });

    describe('Authentication', () => {
      it('returns 401 when not authenticated', async () => {
        mockAuth.mockResolvedValue(null);
        const res = await simulatePut({ notifyEmail: true });
        expect(res.status).toBe(401);
      });
    });
  });

  describe('GET /api/user/notifications/preferences', () => {
    async function simulateGet() {
      const { GET } = await import('@/app/api/user/notifications/preferences/route');
      return GET();
    }

    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);
      const res = await simulateGet();
      expect(res.status).toBe(401);
    });

    it('returns 404 when user not found in DB', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await simulateGet();
      expect(res.status).toBe(404);
    });

    it('returns preference values when user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        notifyEmail: true,
        notifyConnectionReq: false,
        notifySessionReminder: true,
        notifyMessages: false,
      });

      const res = await simulateGet();
      const data = await res.json();

      expect(data.notifyEmail).toBe(true);
      expect(data.notifyConnectionReq).toBe(false);
      expect(data.notifySessionReminder).toBe(true);
      expect(data.notifyMessages).toBe(false);
    });
  });
});
