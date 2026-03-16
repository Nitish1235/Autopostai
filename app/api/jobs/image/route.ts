import { NextRequest, NextResponse } from 'next/server'
import { handleImageJob } from '@/lib/queue/workers/imageWorker'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'

// ── POST /api/jobs/image ─────────────────────────────
// QStash delivers image generation jobs here.

async function handler(request: NextRequest) {
  if (process.env.START_AS_WORKER !== 'true') {
     console.error('[jobs/image] Rejected: Container is not running in WORKER mode')
     return NextResponse.json({ success: false, error: 'Target is not a worker' }, { status: 400 })
  }

  try {
    const data = await request.json()
    console.log(`[jobs/image] Received job for video: ${data.videoId}, segment: ${data.segmentIndex}`)
    const result = await handleImageJob(data)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[jobs/image] Error:', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export const POST = verifySignatureAppRouter(handler)
