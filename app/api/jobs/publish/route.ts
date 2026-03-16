import { NextRequest, NextResponse } from 'next/server'
import { handlePublishJob } from '@/lib/queue/workers/publishWorker'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'

// ── POST /api/jobs/publish ───────────────────────────
// QStash delivers publish jobs here.

async function handler(request: NextRequest) {
  if (process.env.START_AS_WORKER !== 'true') {
     console.error('[jobs/publish] Rejected: Container is not running in WORKER mode')
     return NextResponse.json({ success: false, error: 'Target is not a worker' }, { status: 400 })
  }

  try {
    const data = await request.json()
    console.log(`[jobs/publish] Received job for video: ${data.videoId}`)
    const result = await handlePublishJob(data)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[jobs/publish] Error:', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export const POST = verifySignatureAppRouter(handler)
