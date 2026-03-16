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

// ── Deployment Splitting Logic ─────────────────────────
// To prevent the Web Frontend from crashing during massive load, we only
// attach the background worker functions if the container is explicitly told
// to start as a worker via the START_AS_WORKER environment variable.

const isWorker = process.env.START_AS_WORKER === 'true'

const functions = isWorker
  ? [
      generateTopicsFunction,
      autopilotCron,
      analyticsPoll,
      weeklyReport,
      scheduledPublish,
      onVideoCreated,
      onVideoReady,
      subscriptionExpiry,
    ]
  : [] // Frontend containers host 0 workers

if (!isWorker) {
  console.log('[inngest] Starting in WEB mode (No background functions attached to this container)')
} else {
  console.log('[inngest] Starting in WORKER mode (All background functions attached to this container)')
}

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
