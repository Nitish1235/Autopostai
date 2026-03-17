import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/db/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    // Custom login page will just redirect to Google Auth or show a clean button
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, account, isNewUser }) {
      if (user) {
        token.id = user.id
        const userId = user.id as string
        
        // Handle New User Logic (replaces Clerk webhook)
        if (isNewUser) {
          try {
            // Create default AutopilotConfig (Idempotent)
            await prisma.autopilotConfig.upsert({
              where: { userId: userId },
              update: {}, // Don't overwrite if it exists
              create: {
                userId: userId,
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
                userId: userId,
                type: 'bonus',
                credits: 1,
                description: 'Welcome trial — 1 free video',
                balanceAfter: 1,
              },
            })

            // Send welcome email (non-blocking)
            const { sendWelcomeEmail } = await import('@/emails/Welcome')
            if (user.email && user.name) {
              sendWelcomeEmail(user.email, user.name).catch(console.error)
            }
          } catch (err) {
            console.error('[NextAuth] Error initializing new user:', err)
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as any).id = token.id as string
      }
      return session
    },
  },
}
