import { Inngest } from 'inngest'

// ── Event Type Map ────────────────────────────────────
export type Events = {
  'video/created': {
    data: { videoId: string; userId: string }
  }
  'video/ready': {
    data: { videoId: string; userId: string }
  }
  'video/posted': {
    data: { videoId: string; userId: string; platforms: string[] }
  }
  'autopilot/trigger': {
    data: { userId: string }
  }
  'topics/generate': {
    data: { userId: string; niche: string; count: number }
  }
  'analytics/sync': {
    data: { videoId: string; userId: string }
  }
  'report/weekly': {
    data: { userId: string }
  }
}

// ── Inngest Client ────────────────────────────────────
export const inngest = new Inngest({
  id: 'autopost-ai',
  name: 'AutoPost AI',
  schemas: new Map() as never,
})
