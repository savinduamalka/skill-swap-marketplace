/**
 * Sessions Page
 *
 * Displays the user's learning sessions organized into tabs:
 * - Active Sessions: Currently ongoing sessions
 * - Session Requests: Incoming and outgoing requests
 * - Completed: Past sessions that have been completed
 * - Cancelled: Sessions that were cancelled
 *
 * @fileoverview Session management dashboard with real API integration
 */
"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  ArrowRightLeft,
  Loader2,
  AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import { CreateSessionRequestDialog } from "@/components/create-session-request-dialog"

// Types
interface User {
  id: string
  fullName: string
  profileImage: string | null
  email: string
}

interface SessionRequest {
  id: string
  sessionName: string
  description: string | null
  mode: "ONLINE" | "PHYSICAL"
  startDate: string
  endDate: string | null
  status: "PENDING" | "ACCEPTED" | "DECLINED"
  sender: User
  receiver: User
  skill: { name: string } | null
  createdAt: string
}

interface Session {
  id: string
  sessionName: string
  description: string | null
  mode: "ONLINE" | "PHYSICAL"
  startDate: string
  endDate: string | null
  status: "ACTIVE" | "COMPLETED" | "CANCELLED"
  sessionCredits: number
  learner: User
  provider: User
  skill: { name: string } | null
  learnerCompletionConfirmed: boolean
  providerCompletionConfirmed: boolean
  createdAt: string
  completedAt: string | null
  cancelledAt: string | null
}

export default function SessionsPage() {
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [sentRequests, setSentRequests] = useState<SessionRequest[]>([])
  const [receivedRequests, setReceivedRequests] = useState<SessionRequest[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch sessions and requests in parallel
      const [sessionsRes, requestsRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/sessions/requests"),
      ])

      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json()
        setSessions(sessionsData.sessions || [])
        setCurrentUserId(sessionsData.currentUserId)
      }

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json()
        setSentRequests(requestsData.sentRequests || [])
        setReceivedRequests(requestsData.receivedRequests || [])
      }
    } catch (error) {
      console.error("Error fetching sessions:", error)
      toast.error("Failed to load sessions")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter sessions by status
  const activeSessions = sessions.filter(s => s.status === "ACTIVE")
  const completedSessions = sessions.filter(s => s.status === "COMPLETED")
  const cancelledSessions = sessions.filter(s => s.status === "CANCELLED")

  // Accept session request
  const handleAcceptRequest = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      const res = await fetch("/api/sessions/requests/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success("Session request accepted!")
        fetchData()
      } else {
        toast.error(data.error || "Failed to accept request")
      }
    } catch (error) {
      toast.error("Failed to accept request")
    } finally {
      setActionLoading(null)
    }
  }

  // Decline session request
  const handleDeclineRequest = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      const res = await fetch("/api/sessions/requests/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success("Session request declined")
        fetchData()
      } else {
        toast.error(data.error || "Failed to decline request")
      }
    } catch (error) {
      toast.error("Failed to decline request")
    } finally {
      setActionLoading(null)
    }
  }

  // Cancel own session request
  const handleCancelRequest = async (requestId: string) => {
    setActionLoading(requestId)
    try {
      const res = await fetch(`/api/sessions/requests/${requestId}/cancel`, {
        method: "DELETE",
      })

      const data = await res.json()
      if (res.ok) {
        toast.success("Session request cancelled. 5 credits refunded.")
        fetchData()
      } else {
        toast.error(data.error || "Failed to cancel request")
      }
    } catch (error) {
      toast.error("Failed to cancel request")
    } finally {
      setActionLoading(null)
    }
  }

  // Complete session
  const handleCompleteSession = async (sessionId: string) => {
    setActionLoading(sessionId)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/complete`, {
        method: "POST",
      })

      const data = await res.json()
      if (res.ok) {
        if (data.sessionCompleted) {
          toast.success(`Session completed! ${data.creditsTransferred} credits transferred.`)
        } else {
          toast.success(`Completion confirmed. Waiting for the other party.`)
        }
        fetchData()
      } else {
        toast.error(data.error || "Failed to complete session")
      }
    } catch (error) {
      toast.error("Failed to complete session")
    } finally {
      setActionLoading(null)
    }
  }

  // Cancel session
  const handleCancelSession = async (sessionId: string) => {
    setActionLoading(sessionId)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "User cancelled" }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success("Session cancelled. Credits refunded.")
        fetchData()
      } else {
        toast.error(data.error || "Failed to cancel session")
      }
    } catch (error) {
      toast.error("Failed to cancel session")
    } finally {
      setActionLoading(null)
    }
  }

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Render session request card
  const renderRequestCard = (request: SessionRequest, isSent: boolean) => {
    const otherUser = isSent ? request.receiver : request.sender

    return (
      <Card key={request.id} className="p-6 hover:shadow-md transition">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={otherUser.profileImage || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                  {getInitials(otherUser.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-foreground">
                  {request.sessionName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isSent ? "To:" : "From:"} {otherUser.fullName}
                </p>
                {request.skill && (
                  <Badge variant="secondary" className="mt-1">{request.skill.name}</Badge>
                )}
              </div>
            </div>

            {request.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {request.description}
              </p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(request.startDate)}</span>
                {request.endDate && (
                  <span>- {formatDate(request.endDate)}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                {request.mode === "ONLINE" ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                <span>{request.mode === "ONLINE" ? "Online" : "In-Person"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                ⏱ Pending
              </Badge>
              {isSent && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  <ArrowRightLeft className="w-3 h-3 mr-1" />
                  Sent
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {isSent ? (
                <Button 
                  variant="outline" 
                  className="w-full bg-transparent"
                  onClick={() => handleCancelRequest(request.id)}
                  disabled={actionLoading === request.id}
                >
                  {actionLoading === request.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Cancel Request
                </Button>
              ) : (
                <>
                  <Button 
                    className="w-full"
                    onClick={() => handleAcceptRequest(request.id)}
                    disabled={actionLoading === request.id}
                  >
                    {actionLoading === request.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Accept
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full bg-transparent"
                    onClick={() => handleDeclineRequest(request.id)}
                    disabled={actionLoading === request.id}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Decline
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Render active session card
  const renderSessionCard = (session: Session) => {
    const isLearner = session.learner.id === currentUserId
    const otherUser = isLearner ? session.provider : session.learner
    const myConfirmation = isLearner 
      ? session.learnerCompletionConfirmed 
      : session.providerCompletionConfirmed
    const otherConfirmation = isLearner 
      ? session.providerCompletionConfirmed 
      : session.learnerCompletionConfirmed

    return (
      <Card 
        key={session.id} 
        className={`p-6 hover:shadow-md transition border-l-4 ${
          session.status === "ACTIVE" 
            ? "border-l-green-500" 
            : session.status === "COMPLETED" 
              ? "border-l-blue-500"
              : "border-l-red-500"
        }`}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-start gap-4 mb-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={otherUser.profileImage || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                  {getInitials(otherUser.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-foreground">
                  {session.sessionName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isLearner ? "Learning from:" : "Teaching:"} {otherUser.fullName}
                </p>
                {session.skill && (
                  <Badge variant="secondary" className="mt-1">{session.skill.name}</Badge>
                )}
              </div>
            </div>

            {session.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {session.description}
              </p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(session.startDate)}</span>
                {session.endDate && (
                  <span>- {formatDate(session.endDate)}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                {session.mode === "ONLINE" ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                <span>{session.mode === "ONLINE" ? "Online" : "In-Person"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{session.sessionCredits} credits</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between">
            <div className="space-y-2 mb-4">
              <Badge 
                variant={session.status === "ACTIVE" ? "default" : "secondary"}
              >
                {session.status === "ACTIVE" && "✓ Active"}
                {session.status === "COMPLETED" && "✓ Completed"}
                {session.status === "CANCELLED" && "✗ Cancelled"}
              </Badge>

              {session.status === "ACTIVE" && (
                <div className="text-xs text-muted-foreground">
                  <p>Completion status:</p>
                  <p className={myConfirmation ? "text-green-600" : ""}>
                    You: {myConfirmation ? "✓ Confirmed" : "Not confirmed"}
                  </p>
                  <p className={otherConfirmation ? "text-green-600" : ""}>
                    {otherUser.fullName}: {otherConfirmation ? "✓ Confirmed" : "Not confirmed"}
                  </p>
                </div>
              )}
            </div>

            {session.status === "ACTIVE" && (
              <div className="flex flex-col gap-2">
                {!myConfirmation ? (
                  <Button 
                    className="w-full"
                    onClick={() => handleCompleteSession(session.id)}
                    disabled={actionLoading === session.id}
                  >
                    {actionLoading === session.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Mark as Complete
                  </Button>
                ) : (
                  <Button disabled className="w-full">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Waiting for Partner
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="w-full bg-transparent text-red-600 hover:text-red-700"
                  onClick={() => handleCancelSession(session.id)}
                  disabled={actionLoading === session.id}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel Session
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // Loading skeleton
  if (loading) {
    return (
      <>
        <Header />
        <main className="pb-20 md:pb-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          </div>
        </main>
        <MobileNav />
      </>
    )
  }

  const totalRequests = sentRequests.length + receivedRequests.length

  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Learning Sessions
              </h1>
              <p className="text-muted-foreground">
                Manage and track your skill exchange sessions
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Session Request
            </Button>
          </div>

          {/* Session Tabs */}
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="active">Active ({activeSessions.length})</TabsTrigger>
              <TabsTrigger value="requests">Requests ({totalRequests})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedSessions.length})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled ({cancelledSessions.length})</TabsTrigger>
            </TabsList>

            {/* Active Sessions Tab */}
            <TabsContent value="active" className="space-y-4">
              {activeSessions.length === 0 ? (
                <Card className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Sessions</h3>
                  <p className="text-muted-foreground mb-4">
                    You don&apos;t have any active learning sessions yet.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Session Request
                  </Button>
                </Card>
              ) : (
                activeSessions.map(session => renderSessionCard(session))
              )}
            </TabsContent>

            {/* Session Requests Tab */}
            <TabsContent value="requests" className="space-y-6">
              {/* Received Requests */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="bg-orange-100 dark:bg-orange-900/30 p-1 rounded">
                    📥
                  </span>
                  Received Requests ({receivedRequests.length})
                </h3>
                {receivedRequests.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    No pending requests from others
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {receivedRequests.map(req => renderRequestCard(req, false))}
                  </div>
                )}
              </div>

              {/* Sent Requests */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="bg-blue-100 dark:bg-blue-900/30 p-1 rounded">
                    📤
                  </span>
                  Sent Requests ({sentRequests.length})
                </h3>
                {sentRequests.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    You haven&apos;t sent any session requests
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {sentRequests.map(req => renderRequestCard(req, true))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Completed Sessions Tab */}
            <TabsContent value="completed" className="space-y-4">
              {completedSessions.length === 0 ? (
                <Card className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Completed Sessions</h3>
                  <p className="text-muted-foreground">
                    Complete some sessions to see them here!
                  </p>
                </Card>
              ) : (
                completedSessions.map(session => renderSessionCard(session))
              )}
            </TabsContent>

            {/* Cancelled Sessions Tab */}
            <TabsContent value="cancelled" className="space-y-4">
              {cancelledSessions.length === 0 ? (
                <Card className="p-8 text-center">
                  <XCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Cancelled Sessions</h3>
                  <p className="text-muted-foreground">
                    Cancelled sessions will appear here.
                  </p>
                </Card>
              ) : (
                cancelledSessions.map(session => renderSessionCard(session))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <MobileNav />

      {/* Create Session Request Dialog */}
      <CreateSessionRequestDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchData}
      />
    </>
  )
}
