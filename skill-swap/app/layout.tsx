/**
 * Root Layout Component
 * 
 * This is the main application layout that wraps all pages.
 * It provides the base HTML structure, font configuration, and global styles.
 * 
 * @fileoverview Application root layout with font setup and metadata configuration
 */
import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { WalletProvider } from "@/contexts/wallet-context"
import { UnreadMessagesProvider } from "@/contexts/unread-messages-context"
import { CallProvider } from "@/contexts/call-context"

// Configure primary sans-serif font with Latin character support
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
})

// Configure monospace font for code blocks and technical content
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

// SEO and metadata configuration for the application
export const metadata: Metadata = {
  title: {
    default: "SkillSwap - Peer-to-Peer Skill Exchange",
    template: "%s | SkillSwap",
  },
  description:
    "Connect with peers to exchange skills and knowledge. Learn from experts in your community while teaching what you love.",
  keywords: ["skill exchange", "peer learning", "community", "education", "tutoring", "skill sharing"],
  authors: [{ name: "SkillSwap Team" }],
  creator: "SkillSwap",
  icons: {
    icon: "/skillswap-logo.png",
    shortcut: "/skillswap-logo.png",
    apple: "/skillswap-logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "SkillSwap",
    title: "SkillSwap - Peer-to-Peer Skill Exchange",
    description: "Connect with peers to exchange skills and knowledge.",
  },
}

// Viewport configuration for responsive design
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <AuthProvider>
          <WalletProvider>
            <UnreadMessagesProvider>
              <CallProvider>
                {children}
              </CallProvider>
            </UnreadMessagesProvider>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
