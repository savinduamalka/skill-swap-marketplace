/**
 * Dashboard Page
 *
 * The main hub for authenticated users. Displays key statistics,
 * recent activity, upcoming sessions, and quick actions. This is
 * where users manage their day-to-day skill exchange activities.
 *
 * @fileoverview User dashboard with stats, posts, and session management
 */
"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { toast } from "sonner"

import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Users, Zap, MessageSquare, Plus, CheckCircle2 } from "lucide-react"

// Dashboard statistics configuration with icons and colors
const DASHBOARD_STATS = [
  {
    label: "Credits Balance",
    value: "250",
    icon: Zap,
    colorClass: "text-secondary",
  },
  {
    label: "Skills Offered",
    value: "4",
    icon: BookOpen,
    colorClass: "text-primary",
  },
  {
    label: "Active Connections",
    value: "12",
    icon: Users,
    colorClass: "text-accent",
  },
  {
    label: "Pending Requests",
    value: "3",
    icon: MessageSquare,
    colorClass: "text-orange-500",
  },
] as const

// Sample posts data - would come from API in production
const RECENT_POSTS = [
  {
    id: "post-1",
    author: "Priya Sharma",
    avatar: "PS",
    skill: "UI/UX Design",
    title: "Looking to learn React development",
    description:
      "I have 5 years of experience in Figma and can teach advanced prototyping techniques. Looking for someone to help me transition into frontend development with React.",
    credits: 55,
    requestedSkills: ["React", "TypeScript"],
    timestamp: "2 hours ago",
  },
  {
    id: "post-2",
    author: "Marcus Williams",
    avatar: "MW",
    skill: "Backend Development",
    title: "Spanish conversation practice available",
    description:
      "Native Spanish speaker from Barcelona. Happy to do conversation practice in exchange for help with Node.js and API design patterns.",
    credits: 70,
    requestedSkills: ["Node.js"],
    timestamp: "4 hours ago",
  },
  {
    id: "post-3",
    author: "Aisha Patel",
    avatar: "AP",
    skill: "Music Theory",
    title: "Guitar lessons for data analysis help",
    description:
      "Classically trained guitarist offering lessons for beginners and intermediate players. Looking for help understanding Python for data analysis.",
    credits: 80,
    requestedSkills: ["Python", "Data Analysis"],
    timestamp: "6 hours ago",
  },
] as const

// Upcoming scheduled sessions
const UPCOMING_SESSIONS = [
  {
    id: "session-1",
    peer: "Jordan Lee",
    avatar: "JL",
    skill: "Photography Basics",
    dateTime: "Tomorrow at 2:00 PM",
    status: "confirmed" as const,
  },
  {
    id: "session-2",
    peer: "Taylor Morgan",
    avatar: "TM",
    skill: "Digital Marketing",
    dateTime: "Friday at 3:30 PM",
    status: "pending" as const,
  },
] as const

export default function DashboardPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()

  // Show success toast on login redirect
  useEffect(() => {
    const loginStatus = searchParams.get('login')
    if (loginStatus === 'success') {
      const oauthProvider = sessionStorage.getItem('skillswap_oauth_pending')
      sessionStorage.removeItem('skillswap_oauth_pending')
      
      toast.success(`Welcome ${session?.user?.name || 'back'}!`, {
        description: oauthProvider 
          ? `Successfully signed in with ${oauthProvider.charAt(0).toUpperCase() + oauthProvider.slice(1)}`
          : 'You are now logged in.',
        icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        duration: 5000,
      })

      // Clean up the URL without causing a refresh
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams, session])

  // Get user's first name for greeting
  const userName = session?.user?.name?.split(' ')[0] || 'User'

  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome back, {userName}!
            </h1>
            <p className="text-muted-foreground">
              Here's your learning activity for today
            </p>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {DASHBOARD_STATS.map((stat) => {
              const IconComponent = stat.icon
              return (
                <Card key={stat.label} className="p-6 flex flex-col items-start">
                  <div className="flex items-center justify-between w-full mb-4">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <div className={`p-2 bg-muted rounded-lg ${stat.colorClass}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                </Card>
              )
            })}
          </div>

          {/* Content Tabs for Posts and Sessions */}
          <Tabs defaultValue="posts" className="space-y-6">
            <TabsList className="grid grid-cols-2 md:w-96">
              <TabsTrigger value="posts">Recent Posts</TabsTrigger>
              <TabsTrigger value="sessions">Upcoming Sessions</TabsTrigger>
            </TabsList>

            {/* Recent Community Posts */}
            <TabsContent value="posts" className="space-y-4">
              {RECENT_POSTS.map((post) => (
                <Card key={post.id} className="p-6 hover:shadow-md transition">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary-foreground">
                        {post.avatar}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <p className="font-semibold text-foreground">{post.author}</p>
                          <p className="text-sm text-muted-foreground">{post.timestamp}</p>
                        </div>
                        <Badge variant="secondary">{post.skill}</Badge>
                      </div>

                      <h3 className="font-semibold text-foreground mb-2">{post.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{post.description}</p>

                      <div className="flex flex-wrap items-center gap-3">
                        <Badge variant="outline">
                          <Zap className="w-3 h-3 mr-1" />
                          {post.credits} credits
                        </Badge>
                        {post.requestedSkills.map((skill) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-border">
                    <Button size="sm" className="flex-1">
                      Connect
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                      View Profile
                    </Button>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Upcoming Learning Sessions */}
            <TabsContent value="sessions" className="space-y-4">
              {UPCOMING_SESSIONS.length > 0 ? (
                UPCOMING_SESSIONS.map((session) => (
                  <Card key={session.id} className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-secondary to-accent rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-secondary-foreground">
                          {session.avatar}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{session.peer}</p>
                        <p className="text-sm text-muted-foreground">{session.dateTime}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={session.status === "confirmed" ? "default" : "secondary"}>
                        {session.status === "confirmed" ? "Confirmed" : "Pending"}
                      </Badge>
                      <Button size="sm" variant="outline">
                        Join
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">No upcoming sessions</p>
                  <Link href="/search">
                    <Button>Find Learning Opportunities</Button>
                  </Link>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Quick Actions Section */}
          <div className="mt-12 pt-8 border-t border-border">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/create">
                <Button variant="outline" className="w-full justify-start bg-transparent" size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Post
                </Button>
              </Link>

              <Link href="/search">
                <Button variant="outline" className="w-full justify-start bg-transparent" size="lg">
                  <Users className="w-4 h-4 mr-2" />
                  Find Connections
                </Button>
              </Link>
              <Link href="/messages">
                <Button variant="outline" className="w-full justify-start bg-transparent" size="lg">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View Messages
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </>
  )
}
