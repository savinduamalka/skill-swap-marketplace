"use client";

/**
 * Authentication Provider Component
 * 
 * Wraps the application with NextAuth SessionProvider for
 * client-side session management.
 * 
 * @author SkillSwap Development Team
 * @version 1.0.0
 */

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

interface AuthProviderProps {
  children: React.ReactNode;
  session?: Session | null;
}

export function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}
