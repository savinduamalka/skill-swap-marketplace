/**
 * Global test setup for Vitest
 * Mocks external dependencies (Prisma, Auth, Resend, Supabase)
 */

import { vi } from 'vitest';

// Mock Prisma globally
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    wallet: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
      update: vi.fn(),
    },
    connection: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
    },
    connectionRequest: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    newsfeedPost: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    blockedUser: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    sessionRequest: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    skillWant: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb({
      connectionRequest: { create: vi.fn(), delete: vi.fn(), update: vi.fn() },
      wallet: { update: vi.fn() },
      transaction: { create: vi.fn(), update: vi.fn() },
      connection: { upsert: vi.fn() },
      sessionRequest: { create: vi.fn() },
    })),
  },
  default: {},
}));

// Mock Auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock Notifications
vi.mock('@/lib/notifications', () => ({
  createNotification: vi.fn().mockResolvedValue({}),
}));

// Mock Email
vi.mock('@/lib/email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
  sendConnectionRequestEmail: vi.fn().mockResolvedValue({ success: true }),
  sendNewMessageEmail: vi.fn().mockResolvedValue({ success: true }),
}));
