/**
 * Create Post Page
 *
 * Form for creating new skill exchange posts. Users can either offer
 * to teach a skill or request to learn one. The form captures all
 * necessary details including credits, format, and availability.
 *
 * @fileoverview Learning post creation form with skill selection
 */
"use client"

import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

// Available skills for the user to offer (would come from user profile)
const USER_SKILLS = [
  { value: "ui-design", label: "UI/UX Design" },
  { value: "python", label: "Python Programming" },
  { value: "figma", label: "Figma" },
  { value: "web-design", label: "Web Design" },
]

// Skills available to request learning
const LEARNABLE_SKILLS = [
  { value: "javascript", label: "JavaScript" },
  { value: "spanish", label: "Spanish" },
  { value: "guitar", label: "Guitar" },
  { value: "marketing", label: "Digital Marketing" },
  { value: "photography", label: "Photography" },
  { value: "data-science", label: "Data Science" },
]

// Session format options
const FORMAT_OPTIONS = [
  { value: "online", label: "Online" },
  { value: "inperson", label: "In-Person" },
  { value: "hybrid", label: "Hybrid" },
]

// Availability options
const AVAILABILITY_OPTIONS = [
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "flexible", label: "Flexible" },
]

export default function CreatePage() {
  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Create a Learning Post
            </h1>
            <p className="text-muted-foreground">
              Share your skills or find someone to learn from
            </p>
          </div>

          {/* Post Creation Form */}
          <Card className="p-8">
            <div className="space-y-6">
              {/* Post Type Selection */}
              <div>
                <label className="text-sm font-semibold block mb-3">
                  What are you creating?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 border-2 border-primary cursor-pointer hover:bg-primary/5">
                    <h3 className="font-semibold text-foreground mb-1">Teach a Skill</h3>
                    <p className="text-sm text-muted-foreground">
                      Share your expertise with others
                    </p>
                  </Card>
                  <Card className="p-4 border-2 border-border cursor-pointer hover:bg-muted">
                    <h3 className="font-semibold text-foreground mb-1">Learn a Skill</h3>
                    <p className="text-sm text-muted-foreground">
                      Request to learn something new
                    </p>
                  </Card>
                </div>
              </div>

              {/* Post Title */}
              <div>
                <label className="text-sm font-semibold block mb-2">Title</label>
                <Input placeholder="e.g., Offering Python programming for design feedback" />
              </div>

              {/* Post Description */}
              <div>
                <label className="text-sm font-semibold block mb-2">Description</label>
                <Textarea
                  placeholder="Tell others about what you're offering or looking for. Be specific about your experience level and what you hope to achieve..."
                  rows={4}
                />
              </div>

              {/* Skill Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold block mb-2">Your Skill</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select skill to teach" />
                    </SelectTrigger>
                    <SelectContent>
                      {USER_SKILLS.map((skill) => (
                        <SelectItem key={skill.value} value={skill.value}>
                          {skill.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-2">Skill You Want</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select skill to learn" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEARNABLE_SKILLS.map((skill) => (
                        <SelectItem key={skill.value} value={skill.value}>
                          {skill.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Credits Per Hour */}
              <div>
                <label className="text-sm font-semibold block mb-2">Credits Per Hour</label>
                <Input type="number" placeholder="e.g., 50" defaultValue="50" />
                <p className="text-xs text-muted-foreground mt-2">
                  Recommended range: 30-100 credits per hour based on skill complexity
                </p>
              </div>

              {/* Format and Availability */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold block mb-2">Teaching Format</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAT_OPTIONS.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-2">Availability</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select availability" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABILITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Experience Level Tags */}
              <div>
                <label className="text-sm font-semibold block mb-2">
                  Target Experience Level
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary" className="cursor-pointer">
                    Beginner
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer">
                    Intermediate
                  </Badge>
                  <Badge variant="outline" className="cursor-pointer">
                    Advanced
                  </Badge>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-6 border-t border-border">
                <Button size="lg" className="flex-1">
                  Publish Post
                </Button>
                <Button size="lg" variant="outline" className="flex-1 bg-transparent">
                  Save Draft
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <MobileNav />
    </>
  )
}
