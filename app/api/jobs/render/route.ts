import { NextRequest, NextResponse } from 'next/server'
import { handleRenderJob } from '@/lib/queue/workers/renderWorker'

// ── POST /api/jobs/render ────────────────────────────
// QStash delivers render jobs here.

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log(`[jobs/render] Received job for video: ${data.videoId}`)
    const result = await handleRenderJob(data)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[jobs/render] Error:', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
