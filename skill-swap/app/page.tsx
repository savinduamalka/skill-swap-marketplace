/**
 * Landing Page - SkillSwap
 *
 * A fully redesigned, animated landing page showcasing everything
 * the platform offers: skill exchange, real-time messaging, video calls,
 * community, credits system, and more.
 *
 * @fileoverview Interactive homepage with scroll animations and feature showcase
 */
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ArrowRight,
  Users,
  BookOpen,
  Zap,
  MessageSquare,
  Video,
  Search,
  Star,
  Shield,
  Globe,
  TrendingUp,
  Heart,
  Sparkles,
  CheckCircle,
  ArrowDown,
} from 'lucide-react';

// ─── Scroll Animation Hook ───────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

// ─── Animated Counter Component ──────────────────────────────────────────────
function AnimatedCounter({ target, label }: { target: string; label: string }) {
  const { ref, isVisible } = useScrollReveal();
  const [count, setCount] = useState(0);
  const numericTarget = parseInt(target.replace(/[^0-9]/g, ''));

  useEffect(() => {
    if (!isVisible) return;
    let current = 0;
    const increment = Math.ceil(numericTarget / 40);
    const timer = setInterval(() => {
      current += increment;
      if (current >= numericTarget) {
        setCount(numericTarget);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [isVisible, numericTarget]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
        {isVisible ? `${count}${target.replace(/[0-9]/g, '')}` : '0'}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

// ─── Floating Emoji Animation ────────────────────────────────────────────────
function FloatingEmoji({ emoji, delay, duration, left }: {
  emoji: string; delay: string; duration: string; left: string;
}) {
  return (
    <span
      className="absolute text-2xl md:text-3xl animate-float pointer-events-none select-none"
      style={{
        animationDelay: delay,
        animationDuration: duration,
        left,
        top: '100%',
      }}
    >
      {emoji}
    </span>
  );
}

// ─── Platform Features Data ──────────────────────────────────────────────────
const CORE_FEATURES = [
  {
    icon: Search,
    emoji: '🔍',
    title: 'Discover Skills',
    description: 'Search and find people who have the skills you want to learn. Filter by category, level, and availability.',
  },
  {
    icon: Users,
    emoji: '🤝',
    title: 'Connect & Network',
    description: 'Send connection requests, build your network, and find the perfect learning partners.',
  },
  {
    icon: MessageSquare,
    emoji: '💬',
    title: 'Real-time Chat',
    description: 'Message your connections instantly. Share files, emojis, and coordinate your skill exchange sessions.',
  },
  {
    icon: Video,
    emoji: '📹',
    title: 'Video & Audio Calls',
    description: 'Jump into live video or audio sessions to teach and learn in real-time. No external apps needed.',
  },
  {
    icon: BookOpen,
    emoji: '📚',
    title: 'Skill Sessions',
    description: 'Schedule structured learning sessions. Track your progress and keep both parties accountable.',
  },
  {
    icon: Zap,
    emoji: '⚡',
    title: 'Credit System',
    description: 'Earn credits by teaching. Spend credits to learn. A fair exchange that values everyone\'s time.',
  },
  {
    icon: Globe,
    emoji: '🌍',
    title: 'Community Newsfeed',
    description: 'Share knowledge posts, tips, and updates. Like, comment, and save posts from the community.',
  },
  {
    icon: TrendingUp,
    emoji: '📈',
    title: 'AI Roadmaps',
    description: 'Get personalized learning roadmaps powered by AI. Know exactly what steps to take next.',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    emoji: '📝',
    title: 'Create Your Profile',
    description: 'Sign up and list the skills you can teach and the ones you want to learn.',
  },
  {
    step: '02',
    emoji: '🔎',
    title: 'Find Your Match',
    description: 'Browse the community or use smart search to find someone with complementary skills.',
  },
  {
    step: '03',
    emoji: '📨',
    title: 'Connect & Chat',
    description: 'Send a connection request, start chatting, and propose a skill exchange offer.',
  },
  {
    step: '04',
    emoji: '🎥',
    title: 'Learn Together',
    description: 'Hop on a video call or exchange through messages. Earn credits as you teach!',
  },
];



// ─── Section Wrapper with Scroll Animation ───────────────────────────────────
function AnimatedSection({ children, className = '', delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-10'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── Main Landing Page ───────────────────────────────────────────────────────
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0 overflow-hidden">
        {/* ═══════════════════════════════════════════════════════════════════
            HERO SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-20 px-4 overflow-hidden">
          {/* Background Floating Emojis */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <FloatingEmoji emoji="🎨" delay="0s" duration="6s" left="10%" />
            <FloatingEmoji emoji="💻" delay="1s" duration="8s" left="20%" />
            <FloatingEmoji emoji="🎵" delay="2s" duration="7s" left="35%" />
            <FloatingEmoji emoji="📐" delay="0.5s" duration="9s" left="50%" />
            <FloatingEmoji emoji="🌐" delay="3s" duration="6s" left="65%" />
            <FloatingEmoji emoji="✏️" delay="1.5s" duration="8s" left="80%" />
            <FloatingEmoji emoji="🧠" delay="2.5s" duration="7s" left="90%" />
          </div>

          {/* Hero Content */}
          <div className={`relative z-10 max-w-5xl mx-auto text-center transition-all duration-1000 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse-subtle">
              <Sparkles className="w-4 h-4" />
              The Future of Peer-to-Peer Learning
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              Swap Skills,{' '}
              <span className="text-primary relative">
                Grow Together
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 10C50 4 100 2 150 6C200 10 250 4 298 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="animate-draw-line" />
                </svg>
              </span>{' '}
              🚀
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              Connect with people who have the skills you need. Teach what you know, 
              learn what you love — <strong>no money involved</strong>, just pure knowledge exchange. 🎯
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  Start Swapping Skills
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/search">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 bg-transparent hover:scale-105 transition-all">
                  <Search className="w-5 h-5 mr-2" />
                  Explore Skills
                </Button>
              </Link>
            </div>

            {/* Scroll indicator */}
            <div className="animate-bounce mt-8">
              <ArrowDown className="w-6 h-6 text-muted-foreground mx-auto" />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            STATS SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-16 px-4 border-b border-border/50">
          <div className="max-w-5xl mx-auto">
            <AnimatedSection>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <AnimatedCounter target="5000+" label="Active Learners" />
                <AnimatedCounter target="200+" label="Skills Available" />
                <AnimatedCounter target="12000+" label="Sessions Completed" />
                <AnimatedCounter target="98+" label="% Satisfaction" />
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            WHAT IS SKILLSWAP SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <AnimatedSection>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                What is SkillSwap? 🤔
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                SkillSwap is a <strong>peer-to-peer learning platform</strong> where you trade skills instead of money. 
                Want to learn guitar? Offer your coding knowledge in exchange! 🎸↔️💻 
                It&apos;s like a marketplace, but instead of buying courses, you connect directly with real people 
                and learn from each other through live video calls, chat, and structured sessions.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            CORE FEATURES SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <AnimatedSection>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Everything You Need to Learn & Grow ✨
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  From finding people to live video sessions — we&apos;ve got it all covered.
                </p>
              </div>
            </AnimatedSection>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {CORE_FEATURES.map((feature, index) => (
                <AnimatedSection key={feature.title} delay={index * 100}>
                  <Card className="p-6 h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group cursor-default border-border/50 hover:border-primary/30">
                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">
                      {feature.emoji}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <feature.icon className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            HOW IT WORKS SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <AnimatedSection>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  How It Works 🛠️
                </h2>
                <p className="text-lg text-muted-foreground">
                  Four simple steps to start your skill exchange journey
                </p>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-4 gap-8">
              {HOW_IT_WORKS.map((step, index) => (
                <AnimatedSection key={step.step} delay={index * 150}>
                  <div className="text-center relative">
                    {/* Connector line (hidden on last item and mobile) */}
                    {index < HOW_IT_WORKS.length - 1 && (
                      <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/40 to-primary/10" />
                    )}
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-2xl mb-4 ring-4 ring-background">
                      {step.emoji}
                    </div>
                    <div className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                      Step {step.step}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            WHY SKILLSWAP SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-4 bg-gradient-to-b from-secondary/5 to-transparent">
          <div className="max-w-5xl mx-auto">
            <AnimatedSection>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Why People Love SkillSwap 💜
                </h2>
                <p className="text-lg text-muted-foreground">
                  Here&apos;s what makes us different from traditional learning platforms
                </p>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: Heart, emoji: '💰', title: 'Completely Free', desc: 'No subscriptions, no hidden fees. Exchange skills purely based on mutual value.' },
                { icon: Shield, emoji: '🔒', title: 'Safe & Trusted', desc: 'Verified profiles, ratings, and reviews. Connect with real people you can trust.' },
                { icon: Video, emoji: '🖥️', title: 'Built-in Video Calls', desc: 'No need to switch to Zoom or Meet. Start a video or audio call right from your chat.' },
                { icon: Star, emoji: '⭐', title: 'Earn Recognition', desc: 'Build your reputation as a teacher. Earn credits, badges, and community trust.' },
                { icon: Sparkles, emoji: '🤖', title: 'AI-Powered Roadmaps', desc: 'Get personalized learning paths generated by AI based on your goals and level.' },
                { icon: Globe, emoji: '🌐', title: 'Global Community', desc: 'Connect with learners and teachers from around the world. No boundaries.' },
              ].map((item, index) => (
                <AnimatedSection key={item.title} delay={index * 100}>
                  <div className="flex gap-4 p-6 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all duration-300">
                    <div className="text-3xl flex-shrink-0">{item.emoji}</div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>



        {/* ═══════════════════════════════════════════════════════════════════
            SKILLS SHOWCASE
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-4 bg-muted/30 overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <AnimatedSection>
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Popular Skills Being Swapped 🔥
                </h2>
                <p className="text-lg text-muted-foreground">
                  From coding to cooking — every skill has value here
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  '💻 Web Development', '🎨 Graphic Design', '📸 Photography',
                  '🎵 Music Production', '✍️ Creative Writing', '📊 Data Science',
                  '🗣️ Public Speaking', '🧘 Yoga & Meditation', '🍳 Cooking',
                  '📱 Mobile Development', '🎬 Video Editing', '🌍 Languages',
                  '🧮 Mathematics', '🎸 Guitar', '🖌️ Digital Art',
                  '📈 Marketing', '🏋️ Fitness Training', '🎭 Acting',
                ].map((skill) => (
                  <span
                    key={skill}
                    className="px-4 py-2 bg-card border border-border/50 rounded-full text-sm font-medium hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 cursor-default hover:scale-105"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            WHAT YOU CAN DO SECTION
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <AnimatedSection>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  What Can You Do on SkillSwap? 🎯
                </h2>
              </div>
            </AnimatedSection>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { text: 'Create a profile showcasing your skills', emoji: '👤' },
                { text: 'Search and discover skilled people nearby or globally', emoji: '🌍' },
                { text: 'Send connection requests and build relationships', emoji: '🤝' },
                { text: 'Chat in real-time with instant messaging', emoji: '💬' },
                { text: 'Share files, images, and resources in chat', emoji: '📎' },
                { text: 'Start video or audio calls with one click', emoji: '📞' },
                { text: 'Schedule and manage skill sessions', emoji: '📅' },
                { text: 'Send and receive skill exchange offers', emoji: '🔄' },
                { text: 'Earn and spend credits fairly', emoji: '💎' },
                { text: 'Post updates to the community newsfeed', emoji: '📰' },
                { text: 'Get AI-generated learning roadmaps', emoji: '🗺️' },
                { text: 'Review sessions and rate your experience', emoji: '⭐' },
              ].map((item, index) => (
                <AnimatedSection key={item.text} delay={index * 50}>
                  <div className="flex items-center gap-3 p-4 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-xl">{item.emoji}</span>
                    <CheckCircle className="w-4 h-4 text-secondary flex-shrink-0" />
                    <span className="text-foreground">{item.text}</span>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>




      </main>

      <MobileNav />
    </>
  );
}
