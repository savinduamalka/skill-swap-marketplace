/**
 * Application Type Definitions
 *
 * Centralized type definitions for the SkillSwap platform.
 * These types ensure consistency across components and provide
 * intellisense support throughout the codebase.
 *
 * @fileoverview Core TypeScript interfaces and type aliases
 */

// =============================================================================
// User & Profile Types
// =============================================================================

/**
 * Represents a user's basic profile information
 * Used across profile cards, headers, and navigation
 */
export interface UserProfile {
  id: string
  name: string
  email: string
  avatar: string
  bio: string
  location: string
  joinDate: string
  rating: number
  reviewCount: number
  creditsBalance: number
}

/**
 * Abbreviated user info for lists and cards
 */
export interface UserSummary {
  id: string
  name: string
  avatar: string
  rating?: number
  isOnline?: boolean
}

// =============================================================================
// Skill Types
// =============================================================================

/**
 * Skill proficiency levels following a standard progression
 */
export type ProficiencyLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert" | "Native" | "Professional"

/**
 * Available teaching/learning formats
 */
export type SessionFormat = "Online" | "In-Person" | "Hybrid"

/**
 * User availability options
 */
export type Availability = "Weekdays" | "Weekends" | "Weekday Evenings" | "Flexible"

/**
 * Complete skill offering from a user
 */
export interface SkillOffering {
  id: string
  userId: string
  skillName: string
  proficiency: ProficiencyLevel
  yearsExperience: number
  description: string
  hourlyCredits: number
  format: SessionFormat
  availability: Availability
  studentCount: number
}

/**
 * Skill category for filtering and organization
 */
export interface SkillCategory {
  id: string
  name: string
  icon: string
  skillCount: number
}

// =============================================================================
// Post Types
// =============================================================================

/**
 * Type of learning post (teaching vs learning request)
 */
export type PostType = "teach" | "learn"

/**
 * Learning post status
 */
export type PostStatus = "active" | "draft" | "closed" | "fulfilled"

/**
 * A learning/teaching post created by a user
 */
export interface LearningPost {
  id: string
  authorId: string
  author: UserSummary
  type: PostType
  title: string
  description: string
  skillOffered: string
  skillsRequested: string[]
  creditsOffered: number
  format: SessionFormat
  availability: Availability
  status: PostStatus
  createdAt: Date
  updatedAt: Date
}

// =============================================================================
// Connection Types
// =============================================================================

/**
 * Connection request/relationship status
 */
export type ConnectionStatus = "pending" | "active" | "declined" | "blocked"

/**
 * Connection between two users
 */
export interface Connection {
  id: string
  userId: string
  connectedUserId: string
  status: ConnectionStatus
  skillContext: string
  lastMessagePreview?: string
  lastActivityAt: Date
  createdAt: Date
}

// =============================================================================
// Session Types
// =============================================================================

/**
 * Learning session status
 */
export type SessionStatus = "pending" | "confirmed" | "completed" | "cancelled" | "rescheduled"

/**
 * A scheduled skill exchange session
 */
export interface SkillSession {
  id: string
  teacherId: string
  learnerId: string
  skillName: string
  scheduledDate: Date
  durationMinutes: number
  format: SessionFormat
  status: SessionStatus
  meetingLink?: string
  location?: string
  notes?: string
  creditsExchanged: number
  rating?: number
  review?: string
}

// =============================================================================
// Message Types
// =============================================================================

/**
 * Chat message between users
 */
export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  sentAt: Date
  readAt?: Date
}

/**
 * Conversation thread between users
 */
export interface Conversation {
  id: string
  participants: UserSummary[]
  lastMessage?: Message
  unreadCount: number
  updatedAt: Date
}

// =============================================================================
// Notification Types
// =============================================================================

/**
 * Notification categories
 */
export type NotificationType =
  | "connection_request"
  | "session_reminder"
  | "message"
  | "review_received"
  | "credits_received"
  | "post_response"

/**
 * User notification
 */
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: Date
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Standard paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

/**
 * Standard API error response
 */
export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

// =============================================================================
// Component Props Types
// =============================================================================

/**
 * Common props for card components
 */
export interface CardProps {
  className?: string
  isLoading?: boolean
}

/**
 * Props for user avatar components
 */
export interface AvatarProps {
  user: UserSummary
  size?: "sm" | "md" | "lg" | "xl"
  showOnlineStatus?: boolean
}

/**
 * Filter state for search functionality
 */
export interface SearchFilters {
  query: string
  category?: string
  formats: SessionFormat[]
  priceRange: [number, number]
  minRating?: number
}
