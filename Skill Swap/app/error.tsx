/**
 * Error Boundary Page
 *
 * Catches and displays runtime errors in the application. Provides
 * users with a friendly error message and options to retry or
 * navigate home. The reset function re-renders the failed segment.
 *
 * @fileoverview Application error boundary with recovery options
 */
"use client"

import Link from "next/link"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorPageProps) {
  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
          </div>

          {/* Error Message */}
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Something Went Wrong
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            We encountered an unexpected error. Please try again or return home.
          </p>

          {/* Recovery Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => reset()}>
              Try Again
            </Button>
            <Link href="/">
              <Button size="lg" variant="outline" className="bg-transparent">
                Go Home
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <MobileNav />
    </>
  )
}
