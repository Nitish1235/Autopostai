import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/db/prisma'
import type { NextAuthConfig } from 'next-auth'
import type { AdapterUser, Adapter, AdapterSession } from 'next-auth/adapters'

// ── Custom Prisma Adapter ─────────────────────────────
function PrismaAdapter(): Adapter {
  return {
    async createUser(data) {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name ?? data.email.split('@')[0],
          image: data.image ?? null,
        },
      })
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: null,
      } satisfies AdapterUser
    },

    async getUser(id) {
      const user = await prisma.user.findUnique({ where: { id } })
      if (!user) return null
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: null,
      } satisfies AdapterUser
    },

    async getUserByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user) return null
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: null,
      } satisfies AdapterUser
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const user = await prisma.user.findUnique({
        where: { googleId: providerAccountId },
      })
      if (!user) return null
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: null,
      } satisfies AdapterUser
    },

    async updateUser(data) {
      const user = await prisma.user.update({
        where: { id: data.id },
        data: {
          name: data.name ?? undefined,
          image: data.image ?? undefined,
        },
      })
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: null,
      } satisfies AdapterUser
    },

    async linkAccount(account) {
      await prisma.user.update({
        where: { id: account.userId },
        data: { googleId: account.providerAccountId },
      })
    },

    async createSession(session) {
      const created = await prisma.session.create({
        data: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
        },
      })
      return {
        sessionToken: created.sessionToken,
        userId: created.userId,
        expires: created.expires,
      } satisfies AdapterSession
    },

    async getSessionAndUser(sessionToken) {
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      })
      if (!session) return null
      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
        },
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
          emailVerified: null,
        } satisfies AdapterUser,
      }
    },

    async updateSession(session) {
      const updated = await prisma.session.update({
        where: { sessionToken: session.sessionToken },
        data: { expires: session.expires },
      })
      return {
        sessionToken: updated.sessionToken,
        userId: updated.userId,
        expires: updated.expires,
      } satisfies AdapterSession
    },

    async deleteSession(sessionToken) {
      await prisma.session.delete({ where: { sessionToken } })
    },

    async createVerificationToken(token) {
      const created = await prisma.verificationToken.create({
        data: {
          identifier: token.identifier,
          token: token.token,
          expires: token.expires,
        },
      })
      return created
    },

    async useVerificationToken({ identifier, token }) {
      try {
        const deleted = await prisma.verificationToken.delete({
          where: { identifier_token: { identifier, token } },
        })
        return deleted
      } catch {
        return null
      }
    },
  }
}

// ── NextAuth Configuration ────────────────────────────
const config: NextAuthConfig = {
  adapter: PrismaAdapter(),

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'consent',
          access_type: 'offline',
        },
      },
    }),
  ],

  session: {
    strategy: 'database',
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  debug: true,

  callbacks: {
    async signIn() {
      return true
    },

    async session({ session, user }) {
      if (session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            id: true,
            plan: true,
            credits: true,
            creditsUsed: true,
            creditsReset: true,
          },
        })

        if (dbUser) {
          session.user = {
            ...session.user,
            id: dbUser.id,
            plan: dbUser.plan,
            credits: dbUser.credits,
            creditsUsed: dbUser.creditsUsed,
            creditsReset: dbUser.creditsReset,
          } as any
        }
      }
      return session
    },

    async authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl
      const publicRoutes = ['/', '/login', '/api/auth', '/api/webhooks']
      const isPublic = publicRoutes.some((r) => pathname.startsWith(r))
      if (isPublic) return true
      return !!session
    },
  },

  events: {
    async createUser({ user }) {
      if (!user.id) return

      // Create default AutopilotConfig
      await prisma.autopilotConfig.create({
        data: {
          userId: user.id,
          schedule: JSON.stringify({
            monday: [
              { time: '18:00', platform: 'tiktok', enabled: true },
            ],
            tuesday: [
              { time: '18:00', platform: 'tiktok', enabled: true },
            ],
            wednesday: [
              { time: '18:00', platform: 'tiktok', enabled: true },
            ],
            thursday: [
              { time: '18:00', platform: 'tiktok', enabled: true },
            ],
            friday: [
              { time: '18:00', platform: 'tiktok', enabled: true },
            ],
            saturday: [
              { time: '12:00', platform: 'tiktok', enabled: true },
            ],
            sunday: [
              { time: '12:00', platform: 'tiktok', enabled: true },
            ],
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
      } catch {
        // Email sending failure should not block user creation
      }
    },
  },
}

// ── Extended session type ─────────────────────────────
interface SessionWithUser {
  user: {
    id: string
    email: string
    name: string
    image?: string | null
    plan: string
    credits: number
    creditsUsed: number
    creditsReset: Date
  }
}

// ── Exports ───────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth(config)
