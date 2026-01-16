import type { NextAuthConfig } from 'next-auth';

/**
 * Base auth configuration for middleware (Edge-compatible)
 * Does not include Prisma adapter or database operations
 * Providers are defined in the full auth.ts - this only handles route protection
 */
export const authConfig: NextAuthConfig = {
  providers: [], // Providers are added in auth.ts
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    /**
     * Authorized callback - controls access to pages (runs in middleware)
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
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
};
