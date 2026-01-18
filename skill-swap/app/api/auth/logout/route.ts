import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Clear all auth-related cookies
    const authCookies = [
      'authjs.session-token',
      'authjs.csrf-token',
      'authjs.callback-url',
      '__Secure-authjs.session-token',
      '__Secure-authjs.csrf-token',
      '__Host-authjs.csrf-token',
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.csrf-token',
    ];

    for (const cookieName of authCookies) {
      cookieStore.delete(cookieName);
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to logout' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Redirect to login after clearing cookies via POST
  return NextResponse.redirect(
    new URL('/login', process.env.NEXTAUTH_URL || 'http://localhost:3000')
  );
}
