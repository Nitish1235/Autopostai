import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const DODO_API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'https://test.dodopayments.com' 
  : 'https://live.dodopayments.com'
const DODO_API_KEY = process.env.DODO_PAYMENTS_API_KEY ?? ''

// ── POST — Open Billing Portal ───────────────────────

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dodoCustomerId: true },
    })

    if (!user?.dodoCustomerId) {
      return NextResponse.json(
        { success: false, error: 'No billing account found. Please subscribe to a plan first.' },
        { status: 400 }
      )
    }

    const returnUrl = `${APP_URL}/settings?tab=subscription`

    const response = await fetch(
      `${DODO_API_BASE_URL}/customers/${user.dodoCustomerId}/portal`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${DODO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ return_url: returnUrl }),
      }
    )

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Dodo portal error [${response.status}]: ${errorBody}`)
    }

    const data = (await response.json()) as { portal_url: string }

    return NextResponse.json({
      success: true,
      data: { portalUrl: data.portal_url },
    })
  } catch (error) {
    console.error('[payments/portal] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
