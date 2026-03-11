import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    const email = email_addresses[0]?.email_address

    if (!email) {
      return new Response('Error: No email found', { status: 400 })
    }

    try {
      // Create user in our DB
      const user = await prisma.user.create({
        data: {
          clerkId: id,
          email: email,
          name: `${first_name || ''} ${last_name || ''}`.trim() || email.split('@')[0],
          image: image_url || null,
        },
      })

      // Create default AutopilotConfig
      await prisma.autopilotConfig.create({
        data: {
          userId: user.id,
          schedule: JSON.stringify({
            monday: [{ time: '18:00', platform: 'tiktok', enabled: true }],
            tuesday: [{ time: '18:00', platform: 'tiktok', enabled: true }],
            wednesday: [{ time: '18:00', platform: 'tiktok', enabled: true }],
            thursday: [{ time: '18:00', platform: 'tiktok', enabled: true }],
            friday: [{ time: '18:00', platform: 'tiktok', enabled: true }],
            saturday: [{ time: '12:00', platform: 'tiktok', enabled: true }],
            sunday: [{ time: '12:00', platform: 'tiktok', enabled: true }],
          }),
        },
      })

      // Create welcome trial credit (1 free video)
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          type: 'bonus',
          credits: 1,
          description: 'Welcome trial — 1 free video',
          balanceAfter: 1,
        },
      })

      // Send welcome email (non-blocking)
      try {
        const { sendWelcomeEmail } = await import('@/emails/Welcome')
        await sendWelcomeEmail(user.email ?? '', user.name ?? 'Creator')
      } catch (err) {
        console.error('Failed to send welcome email:', err)
      }

    } catch (dbError) {
      console.error('Database insertion error:', dbError)
      return NextResponse.json({ error: 'DB insertion failed' }, { status: 500 })
    }
  }

  return new Response('', { status: 200 })
}
