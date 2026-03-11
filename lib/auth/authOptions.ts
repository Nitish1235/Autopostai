import { auth as clerkAuth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'

export async function auth() {
  try {
    const clerkPayload = await clerkAuth()
    const clerkId = clerkPayload.userId
    
    if (!clerkId) return null

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        plan: true,
        credits: true,
        creditsUsed: true,
        creditsReset: true,
      }
    })

    if (!user) return null

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        plan: user.plan,
        credits: user.credits,
        creditsUsed: user.creditsUsed,
        creditsReset: user.creditsReset,
      }
    }
  } catch (err) {
    console.error('[auth shim] error:', err)
    return null
  }
}
