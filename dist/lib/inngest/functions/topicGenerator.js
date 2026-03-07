"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTopicsFunction = void 0;
const client_1 = require("@/lib/inngest/client");
const openai_1 = require("@/lib/api/openai");
const prisma_1 = require("@/lib/db/prisma");
// ── Generate Autopilot Topics ────────────────────────
exports.generateTopicsFunction = client_1.inngest.createFunction({ id: 'generate-topics', name: 'Generate Autopilot Topics' }, { event: 'topics/generate' }, async ({ event, step }) => {
    const { userId, niche, count } = event.data;
    // Step 1 — Fetch existing topics to avoid duplicates
    const existingTopics = await step.run('fetch-existing-topics', async () => {
        const existing = await prisma_1.prisma.topicQueue.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 30,
            select: { topic: true },
        });
        return existing.map((t) => t.topic);
    });
    // Step 2 — Generate new topics via GPT-4o
    const topics = await step.run('generate-new-topics', async () => {
        return await (0, openai_1.generateTopics)({
            niche,
            count,
            existingTopics,
        });
    });
    // Step 3 — Save topics to database
    await step.run('save-topics', async () => {
        // Get current max order for this user
        const maxOrderResult = await prisma_1.prisma.topicQueue.findFirst({
            where: { userId },
            orderBy: { order: 'desc' },
            select: { order: true },
        });
        const maxOrder = maxOrderResult?.order ?? 0;
        // Bulk insert new topics
        await prisma_1.prisma.topicQueue.createMany({
            data: topics.map((topic, index) => ({
                userId,
                topic,
                niche,
                order: maxOrder + index + 1,
                status: 'pending',
            })),
        });
        // Update autopilot config timestamp
        await prisma_1.prisma.autopilotConfig.updateMany({
            where: { userId },
            data: { topicsGeneratedAt: new Date() },
        });
    });
    return { generated: topics.length, userId };
});
