/**
 * Sessions Page
 *
 * Displays the user's learning sessions organized into upcoming and past tabs.
 * Users can manage session status, join online sessions, and review completed
 * exchanges with ratings and notes.
 *
 * @fileoverview Session management dashboard with calendar integration
 */
"use client"

import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, MapPin, Video } from "lucide-react"

/**
 * User's scheduled and completed learning sessions
 * In production, this would be fetched from an API with calendar integration
 */
const USER_SESSIONS = {
  upcoming: [
    {
      id: "session-ava-ui",
      peer: "Ava Martinez",
      avatar: "AM",
      skill: "UI/UX Design",
      date: "Tomorrow",
      time: "2:00 PM - 3:00 PM",
      format: "Online",
      status: "confirmed",
    },
    {
      id: "session-raj-python",
      peer: "Raj Krishnan",
      avatar: "RK",
      skill: "Python Programming",
      date: "Friday, Jan 17",
      time: "3:30 PM - 4:30 PM",
      format: "Online",
      status: "pending",
    },
    {
      id: "session-sophie-guitar",
      peer: "Sophie Laurent",
      avatar: "SL",
      skill: "Guitar",
      date: "Saturday, Jan 18",
      time: "10:00 AM - 11:00 AM",
      format: "In-Person",
      status: "confirmed",
    },
  ],
  past: [
    {
      id: "session-past-derek",
      peer: "Derek Chang",
      avatar: "DC",
      skill: "Digital Marketing",
      date: "Jan 10, 2025",
      time: "6:00 PM - 7:00 PM",
      format: "Online",
      status: "completed",
      rating: 5,
      notes: "Great introduction to SEO and content marketing strategies!",
    },
    {
      id: "session-past-lucia",
      peer: "Lucia Fernandez",
      avatar: "LF",
      skill: "Spanish",
      date: "Jan 8, 2025",
      time: "7:00 PM - 8:00 PM",
      format: "Online",
      status: "completed",
      rating: 4,
      notes: "Good conversational practice, learned new vocabulary",
    },
    {
      id: "session-past-marcus",
      peer: "Marcus Thompson",
      avatar: "MT",
      skill: "Photography",
      date: "Jan 5, 2025",
      time: "2:00 PM - 3:00 PM",
      format: "In-Person",
      status: "completed",
      rating: 5,
      notes: "Learned advanced composition techniques and lighting setups",
    },
  ],
}

export default function SessionsPage() {
  // Calculate session counts for tab labels
  const upcomingCount = USER_SESSIONS.upcoming.length
  const pastCount = USER_SESSIONS.past.length

  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Learning Sessions
            </h1>
            <p className="text-muted-foreground">
              Manage and track your skill exchange sessions
            </p>
          </div>

          {/* Session Tabs */}
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="upcoming">Upcoming ({upcomingCount})</TabsTrigger>
              <TabsTrigger value="past">Past ({pastCount})</TabsTrigger>
            </TabsList>

            {/* Upcoming Sessions Tab */}
            <TabsContent value="upcoming" className="space-y-4">
              {USER_SESSIONS.upcoming.map((session) => (
                <Card
                  key={session.id}
                  className={`p-6 hover:shadow-md transition border-l-4 ${
                    session.status === "confirmed" ? "border-l-green-500" : "border-l-orange-500"
                  }`}
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Session Peer Info */}
                    <div>
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary-foreground">
                            {session.avatar}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-foreground">
                            {session.peer}
                          </h3>
                          <Badge variant="secondary">{session.skill}</Badge>
                        </div>
                      </div>

                      {/* Session Schedule */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{session.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{session.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {session.format === "Online" ? (
                            <Video className="w-4 h-4" />
                          ) : (
                            <MapPin className="w-4 h-4" />
                          )}
                          <span>{session.format}</span>
                        </div>
                      </div>
                    </div>

                    {/* Session Status and Actions */}
                    <div className="flex flex-col justify-between">
                      <div>
                        <Badge
                          variant={session.status === "confirmed" ? "default" : "secondary"}
                          className="mb-4"
                        >
                          {session.status === "confirmed" ? "✓ Confirmed" : "⏱ Pending"}
                        </Badge>
                      </div>

                      <div className="flex flex-col gap-2">
                        {session.status === "pending" && (
                          <>
                            <Button className="w-full">Accept</Button>
                            <Button variant="outline" className="w-full bg-transparent">
                              Decline
                            </Button>
                          </>
                        )}
                        {session.status === "confirmed" && (
                          <>
                            <Button className="w-full">
                              <Video className="w-4 h-4 mr-2" />
                              Join Session
                            </Button>
                            <Button variant="outline" className="w-full bg-transparent">
                              Reschedule
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* Past Sessions Tab */}
            <TabsContent value="past" className="space-y-4">
              {USER_SESSIONS.past.map((session) => (
                <Card key={session.id} className="p-6 hover:shadow-md transition opacity-90">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Peer Info */}
                    <div>
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary-foreground">
                            {session.avatar}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{session.peer}</h3>
                          <Badge variant="outline">{session.skill}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Session Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{session.date}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{session.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {session.format === "Online" ? (
                          <Video className="w-4 h-4" />
                        ) : (
                          <MapPin className="w-4 h-4" />
                        )}
                        <span>{session.format}</span>
                      </div>
                    </div>

                    {/* Rating and Notes */}
                    <div>
                      <div className="mb-3">
                        <div className="flex items-center gap-1 mb-1">
                          {Array.from({ length: 5 }).map((_, starIndex) => (
                            <span
                              key={`${session.id}-star-${starIndex}`}
                              className={starIndex < session.rating ? "text-yellow-500" : "text-muted"}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">{session.notes}</p>
                      </div>
                      <Button size="sm" variant="outline" className="w-full bg-transparent">
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <MobileNav />
    </>
  )
}
