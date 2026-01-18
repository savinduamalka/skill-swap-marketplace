/**
 * Application Constants
 *
 * Centralized constants used throughout the application.
 * Keeping these in one place makes maintenance easier and
 * ensures consistency across components.
 *
 * @fileoverview Global constants and configuration values
 */

// =============================================================================
// Application Configuration
// =============================================================================

export const APP_NAME = "SkillSwap"
export const APP_TAGLINE = "Peer-to-Peer Skill Exchange"

/**
 * Default pagination settings for list views
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
} as const

/**
 * Credit system configuration
 */
export const CREDITS = {
  MIN_HOURLY_RATE: 10,
  MAX_HOURLY_RATE: 200,
  DEFAULT_HOURLY_RATE: 50,
  NEW_USER_BONUS: 100,
} as const

// =============================================================================
// UI Configuration
// =============================================================================

/**
 * Responsive breakpoints matching Tailwind's defaults
 * Use these when you need breakpoint values in JavaScript
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const

/**
 * Animation duration presets (in milliseconds)
 */
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 200,
  slow: 300,
} as const

/**
 * Debounce delays for various interactions
 */
export const DEBOUNCE_MS = {
  search: 300,
  resize: 150,
  scroll: 100,
} as const

// =============================================================================
// Content Constants
// =============================================================================

/**
 * Skill proficiency levels with display labels
 */
export const PROFICIENCY_LEVELS = [
  { value: "beginner", label: "Beginner", description: "Just starting out" },
  { value: "intermediate", label: "Intermediate", description: "Comfortable with basics" },
  { value: "advanced", label: "Advanced", description: "Deep understanding" },
  { value: "expert", label: "Expert", description: "Professional level" },
  { value: "native", label: "Native", description: "Native speaker (languages)" },
] as const

/**
 * Session format options
 */
export const SESSION_FORMATS = [
  { value: "online", label: "Online", icon: "video" },
  { value: "in-person", label: "In-Person", icon: "map-pin" },
  { value: "hybrid", label: "Hybrid", icon: "shuffle" },
] as const

/**
 * Availability options for scheduling
 */
export const AVAILABILITY_OPTIONS = [
  { value: "weekdays", label: "Weekdays" },
  { value: "weekday-evenings", label: "Weekday Evenings" },
  { value: "weekends", label: "Weekends" },
  { value: "flexible", label: "Flexible" },
] as const

/**
 * Skill categories for filtering
 */
export const SKILL_CATEGORIES = [
  { id: "programming", name: "Programming", icon: "code" },
  { id: "design", name: "Design", icon: "palette" },
  { id: "languages", name: "Languages", icon: "globe" },
  { id: "music", name: "Music", icon: "music" },
  { id: "business", name: "Business", icon: "briefcase" },
  { id: "photography", name: "Photography", icon: "camera" },
  { id: "writing", name: "Writing", icon: "pencil" },
  { id: "fitness", name: "Fitness", icon: "heart" },
] as const

// =============================================================================
// Validation Constants
// =============================================================================

/**
 * Input validation limits
 */
export const VALIDATION = {
  // User profile
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  BIO_MAX_LENGTH: 500,
  
  // Posts
  TITLE_MIN_LENGTH: 10,
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 1000,
  
  // Messages
  MESSAGE_MAX_LENGTH: 2000,
} as const

// =============================================================================
// External Links
// =============================================================================

export const EXTERNAL_LINKS = {
  helpCenter: "/help",
  privacyPolicy: "/privacy",
  termsOfService: "/terms",
  contactSupport: "/contact",
} as const

// =============================================================================
// Feature Flags (for gradual rollouts)
// =============================================================================

/**
 * Feature flags for enabling/disabling features
 * In production, these would come from a feature flag service
 */
export const FEATURES = {
  enableVideoSessions: true,
  enableGroupSessions: false,
  enableAIRecommendations: false,
  enableDarkMode: true,
} as const
