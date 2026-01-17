import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Facebook from 'next-auth/providers/facebook';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { NextAuthConfig } from 'next-auth';
import { authConfig } from './auth.config';

/**
 * Full NextAuth configuration with Prisma adapter
 */
const fullAuthConfig: NextAuthConfig = {
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.passwordHash) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.fullName || user.name,
            image: user.avatarUrl || user.image,
          };
        } catch (error) {
          console.error('Authorize error:', error);
          return null;
        }
      },
    }),
  ],
  // Use JWT strategy for all providers (including credentials)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    /**
     * Create wallet for new users and mark OAuth users as verified
     */
    async createUser({ user }) {
      if (user.id) {
        try {
          // Create wallet with initial 100 credits for new users
          await prisma.wallet.create({
            data: {
              userId: user.id,
              availableBalance: 100,
              outgoingBalance: 0,
              incomingBalance: 0,
            },
          });

          // Mark user as verified if they signed up via OAuth
          // OAuth providers (Google, Facebook) have already verified the email
          await prisma.user.update({
            where: { id: user.id },
            data: {
              emailVerified: new Date(),
              isVerified: true,
            },
          });
        } catch (error) {
          console.error('Error in createUser event:', error);
        }
      }
    },
  },
  callbacks: {
    /**
     * JWT callback - called whenever a JWT is created or updated
     */
    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      // Add flag to indicate new login
      if (trigger === 'signIn') {
        token.isNewLogin = true;
      }
      return token;
    },
    /**
     * Session callback - called whenever a session is checked
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
    /**
     * SignIn callback - called when user signs in
     */
    async signIn({ user, account }) {
      // Allow OAuth sign ins
      if (account?.provider === 'google' || account?.provider === 'facebook') {
        return true;
      }
      // Allow credentials sign in
      if (account?.provider === 'credentials') {
        return true;
      }
      return true;
    },
    /**
     * Authorized callback - controls access to pages
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Public routes that don't require authentication
      const publicRoutes = ['/', '/login', '/signup'];
      const isPublicRoute = publicRoutes.includes(pathname);

      // Auth routes (login/signup) - redirect to dashboard if already logged in
      const isAuthRoute = pathname === '/login' || pathname === '/signup';

      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      // Allow public routes
      if (isPublicRoute) {
        return true;
      }

      // All other routes require authentication
      if (!isLoggedIn) {
        return Response.redirect(new URL('/login', nextUrl));
      }

      return true;
    },
  },
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
};

export const { handlers, auth, signIn, signOut } = NextAuth(fullAuthConfig);
