import { inngest } from '@/lib/inngest/client'
import { generateTopics } from '@/lib/api/openai'
import { prisma } from '@/lib/db/prisma'

// ── Generate Autopilot Topics ────────────────────────

export const generateTopicsFunction = inngest.createFunction(
  { id: 'generate-topics', name: 'Generate Autopilot Topics' },
  { event: 'topics/generate' },
  async ({ event, step }) => {
    const { userId, niche, count } = event.data

    // Step 1 — Fetch existing topics to avoid duplicates
    const existingTopics = await step.run('fetch-existing-topics', async () => {
      const existing = await prisma.topicQueue.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { topic: true },
      })
      return existing.map((t) => t.topic)
    })

    // Step 2 — Generate new topics via GPT-4o
    const topics = await step.run('generate-new-topics', async () => {
      return await generateTopics({
        niche,
        count,
        existingTopics,
      })
    })

    // Step 3 — Save topics to database
    await step.run('save-topics', async () => {
      // Get current max order for this user
      const maxOrderResult = await prisma.topicQueue.findFirst({
        where: { userId },
        orderBy: { order: 'desc' },
        select: { order: true },
      })

      const maxOrder = maxOrderResult?.order ?? 0

      // Bulk insert new topics
      await prisma.topicQueue.createMany({
        data: topics.map((topic, index) => ({
          userId,
          topic,
          niche,
          order: maxOrder + index + 1,
          status: 'pending',
        })),
      })

      // Update autopilot config timestamp
      await prisma.autopilotConfig.updateMany({
        where: { userId },
        data: { topicsGeneratedAt: new Date() },
      })
    })

    return { generated: topics.length, userId }
  }
)
