import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        fullName,
        name: fullName,
        passwordHash,
        isVerified: false,
      },
    });

    // Create wallet with initial 100 credits
    await prisma.wallet.create({
      data: {
        userId: user.id,
        availableBalance: 100,
        outgoingBalance: 0,
        incomingBalance: 0,
      },
    });

    // Create initial transaction record
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    if (wallet) {
      await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount: 100,
          type: 'INITIAL_ALLOCATION',
          status: 'COMPLETED',
          note: 'Welcome bonus credits',
        },
      });
    }

    return NextResponse.json(
      {
        message: 'Account created successfully',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
