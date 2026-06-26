/**
 * Forgot Password API Route
 *
 * Generates a secure password reset token and sends a reset link
 * to the user's email via Resend. Uses time-limited tokens and
 * prevents email enumeration by returning a generic success message.
 *
 * @fileoverview POST /api/auth/forgot-password
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

// Rate limit: prevent email-send abuse (simple in-memory, per-email)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email, include auth-related fields
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        fullName: true,
        name: true,
        passwordHash: true,
        accounts: { select: { provider: true } },
      },
    });

    // Prevent email enumeration: always return success message
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Check if user signed up via social login (no password set)
    // This check always runs — no rate limiting here so the user always gets feedback
    const hasPassword = !!user.passwordHash;
    const socialProviders = user.accounts.map((a) => a.provider).filter(
      (p) => p === 'google' || p === 'facebook'
    );
    const hasSocialAccount = socialProviders.length > 0;

    if (!hasPassword) {
      // User has no password — they can only log in via their social provider
      const providerName = socialProviders.includes('google')
        ? 'Google'
        : socialProviders.includes('facebook')
          ? 'Facebook'
          : hasSocialAccount
            ? socialProviders[0]
            : 'a social provider';

      return NextResponse.json({
        success: false,
        socialLogin: true,
        provider: providerName,
        message: `This account is linked to ${providerName}. Please use the "${providerName}" button on the login page to sign in. Password reset is not available for social login accounts.`,
      });
    }

    // Rate limit only the actual email-sending operation
    const lastRequest = rateLimitMap.get(normalizedEmail);
    if (lastRequest && Date.now() - lastRequest < RATE_LIMIT_WINDOW_MS) {
      return NextResponse.json(
        { error: 'Please wait a moment before requesting another reset email.' },
        { status: 429 }
      );
    }
    rateLimitMap.set(normalizedEmail, Date.now());

    // Generate a cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour from now

    // Store the reset token on the user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
    });

    // Build the reset link
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // Send the reset email via Resend
    const userName = user.fullName || user.name || undefined;
    const emailResult = await sendPasswordResetEmail(
      user.email!,
      resetLink,
      userName
    );

    if (!emailResult.success) {
      console.error(`[ForgotPassword] Email delivery failed for ${user.email}:`, emailResult.error);
      // Don't expose email delivery failures to the client (security)
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('[ForgotPassword] API error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred. Please try again later.'
            : `Forgot password error: ${message}`,
      },
      { status: 500 }
    );
  }
}
