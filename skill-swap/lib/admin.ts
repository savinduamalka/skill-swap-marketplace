/**
 * Admin Utilities
 *
 * Centralized admin verification and security helpers.
 * All admin API routes must use verifyAdmin() before processing requests.
 *
 * Security: isAdmin can ONLY be set directly in the database.
 * No API endpoint accepts isAdmin in request body.
 * The register endpoint, settings endpoint, and all user-facing APIs
 * use explicit field whitelists — never spread request body into Prisma.
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Verifies the current session belongs to an admin user.
 * Always verifies against the database (not JWT claims) to prevent token manipulation.
 *
 * @returns { session, error } - session if admin, NextResponse error if not
 */
export async function verifyAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // Always verify isAdmin from database, never trust client claims
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { session, error: null };
}

/**
 * Sanitize pagination params to prevent abuse
 * Clamps page to >= 1 and limit to 1-50 range
 * Default: 10 per page
 */
export function sanitizePagination(params: URLSearchParams) {
  const page = Math.max(1, parseInt(params.get('page') || '1') || 1);
  const limit = Math.min(50, Math.max(1, parseInt(params.get('limit') || '10') || 10));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
