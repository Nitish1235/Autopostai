import { redirect } from 'next/navigation'

// Analytics section is temporarily hidden from the UI.
// All backend API routes (/api/analytics/*) and the sync logic
// (analyticsPoll Inngest function) remain fully active and will
// power this page once PostForMe/YouTube analytics APIs are confirmed.

export default function AnalyticsPage() {
  redirect('/videos')
}
