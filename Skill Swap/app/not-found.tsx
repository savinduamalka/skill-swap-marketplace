/**
 * 404 Not Found Page
 *
 * Custom 404 error page displayed when a user navigates to a route
 * that doesn't exist. Provides navigation options to return home
 * or go back to the previous page.
 *
 * @fileoverview Custom 404 page with navigation recovery options
 */
"use client"

import Link from "next/link"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function NotFound() {
  /**
   * Navigate back to the previous page in browser history
   */
  const handleGoBack = () => {
    window.history.back()
  }

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
            Page Not Found
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          {/* Navigation Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button size="lg">Go Home</Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent"
              onClick={handleGoBack}
            >
              Go Back
            </Button>
          </div>
        </div>
      </main>

      <MobileNav />
    </>
  )
}
