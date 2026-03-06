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

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    generateTopicsFunction,
    autopilotCron,
    analyticsPoll,
    weeklyReport,
    scheduledPublish,
    onVideoCreated,
    onVideoReady,
    subscriptionExpiry,
  ],
})
