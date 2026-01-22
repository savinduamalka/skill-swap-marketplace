'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Users, Star, Calendar, Settings, Bookmark, History } from 'lucide-react';
import Link from 'next/link';
import { UserPostsSection } from './user-posts-section';
import { CreditTransactionHistoryDialog } from '@/components/credit-transaction-history';

// Profile data type
interface ProfileData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  bio: string | null;
  timeZone: string;
  isVerified: boolean;
  memberSince: string;
  rating: number;
  reviewCount: number;
  creditsBalance: number;
  connectionsCount: number;
  activeSessionsCount: number;
  skillsOffered: {
    id: string;
    name: string;
    description: string;
    proficiency: string;
    yearsExperience: number;
    teachingFormat: string;
    studentCount: number;
  }[];
  skillsLearning: {
    id: string;
    name: string;
    description: string | null;
    proficiencyTarget: string | null;
  }[];
  testimonials: {
    id: string;
    authorName: string;
    authorImage: string | null;
    content: string | null;
    rating: number;
    skillName: string;
    createdAt: string;
  }[];
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch('/api/user/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <main className="pb-20 md:pb-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card className="p-8 mb-8">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <Skeleton className="w-24 h-24 rounded-xl" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </Card>
              ))}
            </div>
          </div>
        </main>
        <MobileNav />
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <Header />
        <main className="pb-20 md:pb-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {error || 'Failed to load profile'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </Card>
          </div>
        </main>
        <MobileNav />
      </>
    );
  }

  const initials = getInitials(profile.name);

  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Header Card */}
          <Card className="p-8 mb-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Avatar */}
              {profile.image ? (
                <img
                  src={profile.image}
                  alt={profile.name}
                  className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl font-bold text-primary-foreground">
                    {initials}
                  </span>
                </div>
              )}

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-3xl font-bold text-foreground">
                        {profile.name}
                      </h1>
                      {profile.isVerified && (
                        <Badge variant="secondary" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {profile.reviewCount > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-semibold">
                            {profile.rating}
                          </span>
                          <span className="text-muted-foreground">
                            ({profile.reviewCount} reviews)
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {formatDate(profile.memberSince)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Link href="/saved-posts">
                      <Button variant="outline" className="bg-transparent">
                        <Bookmark className="w-4 h-4 mr-2" />
                        Saved Posts
                      </Button>
                    </Link>
                    <Link href="/settings">
                      <Button variant="outline" className="bg-transparent">
                        <Settings className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                    </Link>
                  </div>
                </div>

                <p className="text-foreground mb-3">
                  {profile.bio || 'No bio yet. Add one in settings!'}
                </p>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Timezone: {profile.timeZone}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Statistics Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 text-center relative group">
              <p className="text-sm text-muted-foreground mb-1">
                Credits Balance
              </p>
              <p className="text-2xl font-bold text-secondary">
                {profile.creditsBalance}
              </p>
              <div className="mt-2">
                <CreditTransactionHistoryDialog
                  currentBalance={profile.creditsBalance}
                  trigger={
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      <History className="w-3 h-3" />
                      View History
                    </Button>
                  }
                />
              </div>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                Skills Offered
              </p>
              <p className="text-2xl font-bold text-primary">
                {profile.skillsOffered.length}
              </p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                Active Sessions
              </p>
              <p className="text-2xl font-bold text-accent">
                {profile.activeSessionsCount}
              </p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Connections</p>
              <p className="text-2xl font-bold text-orange-500">
                {profile.connectionsCount}
              </p>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Skills Offered and Learning - Left Column */}
            <div className="md:col-span-2">
              {/* Skills I Offer */}
              <Card className="p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Skills I Offer
                </h2>
                {profile.skillsOffered.length > 0 ? (
                  <div className="space-y-4">
                    {profile.skillsOffered.map((skill) => (
                      <div key={skill.id} className="p-4 bg-muted rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-foreground">
                            {skill.name}
                          </h3>
                          <Badge variant="secondary">{skill.proficiency}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {skill.yearsExperience} years experience ·{' '}
                          {skill.studentCount} students taught
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          {skill.description}
                        </p>
                        <Badge variant="outline">{skill.teachingFormat}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No skills added yet.</p>
                    <Link href="/settings">
                      <Button variant="outline" className="mt-4">
                        Add Your Skills
                      </Button>
                    </Link>
                  </div>
                )}
              </Card>

              {/* Skills I'm Learning */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Skills I Want to Learn
                </h2>
                {profile.skillsLearning.length > 0 ? (
                  <div className="space-y-4">
                    {profile.skillsLearning.map((skill) => (
                      <div
                        key={skill.id}
                        className="p-4 bg-muted rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {skill.name}
                          </h3>
                          {skill.description && (
                            <p className="text-sm text-muted-foreground">
                              {skill.description}
                            </p>
                          )}
                        </div>
                        {skill.proficiencyTarget && (
                          <Badge variant="default">
                            Target: {skill.proficiencyTarget}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No learning goals set yet.</p>
                    <Link href="/settings">
                      <Button variant="outline" className="mt-4">
                        Add Learning Goals
                      </Button>
                    </Link>
                  </div>
                )}
              </Card>
            </div>

            {/* Testimonials - Right Column */}
            <div>
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Testimonials</h2>
                {profile.testimonials.length > 0 ? (
                  <div className="space-y-4">
                    {profile.testimonials.map((testimonial) => (
                      <div
                        key={testimonial.id}
                        className="p-4 border border-border rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {testimonial.authorImage ? (
                            <img
                              src={testimonial.authorImage}
                              alt={testimonial.authorName}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded flex items-center justify-center text-xs font-bold text-primary-foreground">
                              {getInitials(testimonial.authorName)}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {testimonial.authorName}
                            </p>
                            <div className="flex gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span
                                  key={i}
                                  className={
                                    i < testimonial.rating
                                      ? 'text-yellow-500'
                                      : 'text-muted'
                                  }
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        {testimonial.content && (
                          <p className="text-sm text-muted-foreground">
                            {testimonial.content}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          For: {testimonial.skillName}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No testimonials yet.</p>
                    <p className="text-sm mt-2">
                      Complete sessions to receive reviews!
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Posts Section */}
          {profile && <UserPostsSection userId={profile.id} />}
        </div>
      </main>

      <MobileNav />
    </>
  );
}
