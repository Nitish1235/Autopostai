import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { generateTopicsFunction } from '@/lib/inngest/functions/topicGenerator'
import { autopilotCron } from '@/lib/inngest/functions/autopilotCron'
import { analyticsPoll } from '@/lib/inngest/functions/analyticsPoll'
import { weeklyReport } from '@/lib/inngest/functions/weeklyReport'
import { scheduledPublish } from '@/lib/inngest/functions/scheduledPublish'
import { onVideoCreated } from '@/lib/inngest/functions/videoCreated'
import { onVideoReady } from '@/lib/inngest/functions/videoReady'
import { subscriptionExpiry } from '@/lib/inngest/functions/subscriptionExpiry'
import { onVideoPosted } from '@/lib/inngest/functions/onVideoPosted'
import { sweepOrphans } from '@/lib/inngest/functions/sweepOrphans'

// ── ALL functions registered on the web container ──────────────────────────
// 
// The worker container is a raw Node HTTP server for QStash video processing.
// It does NOT have an Inngest endpoint. Inngest calls back to the web URL
// (https://autopostai.video/api/webhooks/inngest), so all functions MUST
// be registered here on the web container.
//
// DO NOT split functions between containers — Inngest is not QStash.

const functions = [
  generateTopicsFunction,
  autopilotCron,
  analyticsPoll,
  weeklyReport,
  scheduledPublish,
  onVideoCreated,
  onVideoReady,
  onVideoPosted,      // analytics/sync — triggered right after posting
  subscriptionExpiry,
  sweepOrphans,
]

console.log(`[inngest] Serving ${functions.length} functions`)

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
