/**
 * History Page
 *
 * Displays the user's skill exchange activity history with interactive
 * charts showing monthly activity trends and credit transactions.
 * Includes exportable statistics and a timeline of recent activities.
 *
 * @fileoverview Activity history dashboard with Recharts visualizations
 */
"use client"

import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { Download, TrendingUp } from "lucide-react"

/**
 * Monthly skill exchange statistics for chart visualization
 * In production, this would be aggregated from session data via API
 */
const MONTHLY_STATS = [
  { month: "Jan", skillsTaught: 3, skillsLearned: 2, creditsEarned: 150, creditsSpent: 120 },
  { month: "Feb", skillsTaught: 4, skillsLearned: 3, creditsEarned: 200, creditsSpent: 180 },
  { month: "Mar", skillsTaught: 2, skillsLearned: 4, creditsEarned: 120, creditsSpent: 200 },
]

/**
 * Recent activity feed items with credit transactions
 * Displayed in chronological order with contextual badges
 */
const RECENT_ACTIVITIES = [
  {
    id: "activity-python-session",
    type: "session_completed",
    description: "Completed Python Programming session with Raj Krishnan",
    credits: 75,
    date: "2 days ago",
  },
  {
    id: "activity-ui-taught",
    type: "session_taught",
    description: "Taught UI/UX Design fundamentals to Ava Martinez",
    credits: 60,
    date: "1 week ago",
  },
  {
    id: "activity-connection-derek",
    type: "connection_made",
    description: "Connected with Derek Chang for marketing exchange",
    credits: 0,
    date: "2 weeks ago",
  },
  {
    id: "activity-post-js",
    type: "post_created",
    description: "Created learning post: JavaScript for Designers",
    credits: 0,
    date: "3 weeks ago",
  },
]

// Summary statistics for the overview cards
const HISTORY_STATS = {
  skillsTaught: 12,
  skillsLearned: 9,
  totalSessions: 21,
  creditsBalance: 250,
}

export default function HistoryPage() {
  return (
    <>
      <Header />

      <main className="pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header with Export Action */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Learning History
              </h1>
              <p className="text-muted-foreground">
                Track your skill exchange activity and progress
              </p>
            </div>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Statistics Overview Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Skills Taught</p>
                  <p className="text-3xl font-bold text-primary">
                    {HISTORY_STATS.skillsTaught}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-primary/50" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Skills Learned</p>
                  <p className="text-3xl font-bold text-secondary">
                    {HISTORY_STATS.skillsLearned}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-secondary/50" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-3xl font-bold text-accent">
                    {HISTORY_STATS.totalSessions}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-accent/50" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Credits Balance</p>
                  <p className="text-3xl font-bold text-green-600">
                    {HISTORY_STATS.creditsBalance}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600/50" />
              </div>
            </Card>
          </div>

          {/* Activity Visualization Charts */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Monthly Skills Activity Bar Chart */}
            <Card className="p-6">
              <h2 className="font-semibold text-foreground mb-4">Monthly Activity</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={MONTHLY_STATS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="skillsTaught" fill="var(--color-primary)" name="Skills Taught" />
                  <Bar dataKey="skillsLearned" fill="var(--color-secondary)" name="Skills Learned" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Credits Trend Line Chart */}
            <Card className="p-6">
              <h2 className="font-semibold text-foreground mb-4">Credits Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={MONTHLY_STATS}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="creditsEarned"
                    stroke="var(--color-secondary)"
                    name="Earned"
                  />
                  <Line
                    type="monotone"
                    dataKey="creditsSpent"
                    stroke="var(--color-accent)"
                    name="Spent"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Recent Activity Timeline */}
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {RECENT_ACTIVITIES.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{activity.description}</p>
                    <p className="text-sm text-muted-foreground">{activity.date}</p>
                  </div>
                  {activity.credits > 0 && (
                    <Badge variant="secondary">+{activity.credits} credits</Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>

      <MobileNav />
    </>
  )
}
