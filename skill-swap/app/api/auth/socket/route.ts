import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import jwt from 'jsonwebtoken';

export async function GET() {
  const session = await auth();

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // We sign a token that simply contains the User ID
  // This token is valid for only 1 minute (short-lived for security)
  // The User ID must match what is in your database (session.user.id)
  const token = jwt.sign(
    { userId: (session.user as any).id },
    process.env.SOCKET_SECRET!,
    { expiresIn: '1m' }
  );

  return NextResponse.json({ token });
}
