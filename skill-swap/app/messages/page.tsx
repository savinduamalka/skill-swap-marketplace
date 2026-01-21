import { Suspense } from "react"
import { MessagesClient } from "@/components/messages-client"

function MessagesLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesLoading />}>
      <MessagesClient />
    </Suspense>
  )
}
