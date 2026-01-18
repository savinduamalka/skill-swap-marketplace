/**
 * Landing Page
 *
 * The main entry point for new visitors. Showcases the platform's value
 * proposition with a hero section, feature highlights, and call-to-action.
 *
 * @fileoverview Homepage with marketing content and navigation to key features
 */
'use client';

import Link from 'next/link';

import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, Users, BookOpen, Zap } from 'lucide-react';

// Platform feature highlights displayed on the landing page
const PLATFORM_FEATURES = [
  {
    title: 'Connect',
    description:
      'Find peers with skills you want to learn and share your expertise',
    icon: Users,
    colorClass: 'bg-primary/10 text-primary',
  },
  {
    title: 'Learn & Teach',
    description:
      'Exchange skills through sessions, posts, or casual conversations',
    icon: BookOpen,
    colorClass: 'bg-secondary/10 text-secondary',
  },
  {
    title: 'Build Reputation',
    description:
      'Earn credits and grow your profile as a trusted community member',
    icon: Zap,
    colorClass: 'bg-accent/10 text-accent',
  },
] as const;

export default function LandingPage() {
  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        {/* Hero Section - Primary value proposition */}
        <section className="bg-gradient-to-b from-primary/10 to-transparent py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Exchange Skills, Build Community
            </h1>

            <p className="text-lg text-muted-foreground mb-8">
              Connect with peers to learn and teach skills you're passionate
              about. No money, just pure skill exchange.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>

              <Link href="/search">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto bg-transparent"
                >
                  Browse Skills
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section - How the platform works */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              How SkillSwap Works
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {PLATFORM_FEATURES.map((feature) => {
                const IconComponent = feature.icon;
                return (
                  <Card key={feature.title} className="p-6 text-center">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 ${feature.colorClass}`}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section - Final conversion push */}
        <section className="bg-primary text-primary-foreground py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Start Learning?
            </h2>

            <p className="text-lg mb-8 opacity-90">
              Join thousands of learners and teachers sharing knowledge in
              real-time
            </p>

            <Link href="/dashboard">
              <Button size="lg" variant="secondary">
                Join Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <MobileNav />
    </>
  );
}
