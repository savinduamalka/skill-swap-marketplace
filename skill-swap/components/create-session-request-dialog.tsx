/**
 * Create Session Request Dialog Component
 *
 * A dialog for creating new session requests with:
 * - Session name and description
 * - Connection dropdown (receiver)
 * - Expected dates
 * - Mode selection (online/physical)
 *
 * @fileoverview Session request creation form with validation
 */
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  Loader2, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  Video, 
  MapPin,
  CreditCard
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useWallet } from "@/contexts/wallet-context"

interface Connection {
  id: string
  fullName: string
  profileImage: string | null
  email: string
}

interface CreateSessionRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateSessionRequestDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSessionRequestDialogProps) {
  const [loading, setLoading] = useState(false)
  const [connectionsLoading, setConnectionsLoading] = useState(true)
  const [connections, setConnections] = useState<Connection[]>([])
  const { refreshWallet } = useWallet()
  
  // Form state
  const [sessionName, setSessionName] = useState("")
  const [description, setDescription] = useState("")
  const [receiverId, setReceiverId] = useState("")
  const [mode, setMode] = useState<"ONLINE" | "PHYSICAL">("ONLINE")
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  // Fetch connections when dialog opens
  useEffect(() => {
    if (open) {
      fetchConnections()
    }
  }, [open])

  const fetchConnections = async () => {
    setConnectionsLoading(true)
    try {
      const res = await fetch("/api/connections")
      if (res.ok) {
        const data = await res.json()
        // Extract connected users from the connections array
        const connectedUsers = data.connections?.map((conn: { 
          connectedUser: Connection 
        }) => conn.connectedUser) || []
        setConnections(connectedUsers)
      }
    } catch (error) {
      console.error("Error fetching connections:", error)
      toast.error("Failed to load connections")
    } finally {
      setConnectionsLoading(false)
    }
  }

  const resetForm = () => {
    setSessionName("")
    setDescription("")
    setReceiverId("")
    setMode("ONLINE")
    setStartDate(undefined)
    setEndDate(undefined)
  }

  const handleSubmit = async () => {
    // Validation
    if (!sessionName.trim()) {
      toast.error("Please enter a session name")
      return
    }
    if (!receiverId) {
      toast.error("Please select a connection")
      return
    }
    if (!startDate) {
      toast.error("Please select a start date")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/sessions/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionName: sessionName.trim(),
          description: description.trim() || null,
          receiverId,
          mode,
          startDate: startDate.toISOString(),
          endDate: endDate?.toISOString() || startDate.toISOString(),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success("Session request sent! 5 credits deducted.")
        resetForm()
        onOpenChange(false)
        refreshWallet()
        onSuccess?.()
      } else {
        toast.error(data.error || "Failed to send session request")
      }
    } catch (error) {
      console.error("Error creating session request:", error)
      toast.error("Failed to send session request")
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    }}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Session Request</DialogTitle>
          <DialogDescription>
            Request a learning session with one of your connections. This will cost 5 credits.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Credit Warning */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <CreditCard className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>5 credits</strong> will be deducted to send this request. 
              If accepted, <strong>40 credits</strong> will be reserved for the session.
            </p>
          </div>

          {/* Session Name */}
          <div className="grid gap-2">
            <Label htmlFor="sessionName">Session Name *</Label>
            <Input
              id="sessionName"
              placeholder="e.g., Learn Python Basics"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what you want to learn or achieve in this session..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Connection Selector */}
          <div className="grid gap-2">
            <Label htmlFor="receiver">Send to *</Label>
            {connectionsLoading ? (
              <div className="flex items-center gap-2 p-3 border rounded-md">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading connections...</span>
              </div>
            ) : connections.length === 0 ? (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  No connections yet. Connect with others first.
                </span>
              </div>
            ) : (
              <Select value={receiverId} onValueChange={setReceiverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={conn.profileImage || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(conn.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{conn.fullName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Mode Selection */}
          <div className="grid gap-2">
            <Label>Session Mode *</Label>
            <RadioGroup
              value={mode}
              onValueChange={(val) => setMode(val as "ONLINE" | "PHYSICAL")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ONLINE" id="online" />
                <Label htmlFor="online" className="flex items-center gap-1 cursor-pointer">
                  <Video className="w-4 h-4" />
                  Online
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PHYSICAL" id="physical" />
                <Label htmlFor="physical" className="flex items-center gap-1 cursor-pointer">
                  <MapPin className="w-4 h-4" />
                  In-Person
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>End Date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => 
                      date < new Date() || (startDate ? date < startDate : false)
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !sessionName || !receiverId || !startDate || connections.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Request (5 credits)"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
