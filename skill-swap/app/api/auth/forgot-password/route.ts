import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // To prevent email enumeration, return a generic message even if the user is not found
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If this email is registered, a password reset link has been generated.',
      });
    }

    // Generate token and expiration (1 hour from now)
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    // Store in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;



    // Send email via Brevo API using native fetch
    if (process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL) {
      try {
        const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: 'SkillSwap',
              email: process.env.BREVO_SENDER_EMAIL,
            },
            to: [
              {
                email: user.email,
              },
            ],
            subject: 'Reset your SkillSwap Password',
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
                <h2 style="color: #2563eb; text-align: center; margin-bottom: 20px;">Reset your Password</h2>
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">Hello,</p>
                <p style="color: #374151; font-size: 16px; line-height: 1.5;">We received a request to reset your password for your SkillSwap account. Click the button below to choose a new password. This link is valid for 1 hour.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">Reset Password</a>
                </div>
                <p style="color: #374151; font-size: 14px; line-height: 1.5;">Or, copy and paste this URL into your browser:</p>
                <p style="word-break: break-all; color: #2563eb; font-size: 14px; line-height: 1.5;">${resetLink}</p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                <p style="font-size: 12px; color: #9ca3af; text-align: center;">If you did not request a password reset, please ignore this email.</p>
              </div>
            `,
          }),
        });

        if (!emailRes.ok) {
          const emailError = await emailRes.json();
          console.error('Brevo API dispatch error:', emailError);
        } else {
          console.log(`Email successfully dispatched via Brevo to ${user.email}`);
        }
      } catch (emailErr) {
        console.error('Failed to dispatch email via Brevo fetch:', emailErr);
      }
    } else {
      console.warn('BREVO_API_KEY or BREVO_SENDER_EMAIL is not configured in .env. Password reset email was not sent.');
    }

    return NextResponse.json({
      success: true,
      message: 'If this email is registered, a password reset link has been generated.',
    });
  } catch (error) {
    console.error('Forgot password API error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : `Forgot password error: ${message}`
      },
      { status: 500 }
    );
  }
}
