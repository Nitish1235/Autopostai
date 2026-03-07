"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledPublish = void 0;
const client_1 = require("@/lib/inngest/client");
const prisma_1 = require("@/lib/db/prisma");
const videoQueue_1 = require("@/lib/queue/videoQueue");
// ── Scheduled Post Publisher ─────────────────────────
// Runs every 15 minutes to check for scheduled posts due now
exports.scheduledPublish = client_1.inngest.createFunction({ id: 'scheduled-publish', name: 'Scheduled Post Publisher' }, { cron: '*/15 * * * *' }, async ({ step }) => {
    // Step 1 — Find due posts
    const duePosts = await step.run('find-due-posts', async () => {
        const now = new Date();
        const windowStart = new Date(now.getTime() - 20 * 60 * 1000); // 20 min window
        return prisma_1.prisma.video.findMany({
            where: {
                status: 'scheduled',
                scheduledAt: {
                    lte: now,
                    gte: windowStart,
                },
            },
            select: {
                id: true,
                userId: true,
                title: true,
                topic: true,
                videoUrl: true,
                thumbnailUrl: true,
                platforms: true,
                scheduledAt: true,
                niche: true,
                user: {
                    select: {
                        platformConnections: {
                            where: { connected: true },
                            select: {
                                platform: true,
                                accessToken: true,
                            },
                        },
                    },
                },
            },
        });
    });
    if (duePosts.length === 0) {
        return { published: 0 };
    }
    // Step 2 — Publish due posts
    const publishCount = await step.run('publish-due-posts', async () => {
        let count = 0;
        for (const video of duePosts) {
            try {
                // Verify user still has connected platforms
                const connectedPlatforms = video.user.platformConnections.map((c) => c.platform);
                const validPlatforms = video.platforms.filter((p) => connectedPlatforms.includes(p));
                if (validPlatforms.length === 0) {
                    console.warn(`[scheduledPublish] No connected platforms for video ${video.id}`);
                    continue;
                }
                // Add to publish queue for each platform
                for (const platform of validPlatforms) {
                    const connection = video.user.platformConnections.find((c) => c.platform === platform);
                    if (!connection?.accessToken)
                        continue;
                    await videoQueue_1.publishQueue.add(`publish-${video.id}-${platform}`, {
                        videoId: video.id,
                        userId: video.userId,
                        platform,
                        videoUrl: video.videoUrl ?? '',
                        title: video.title,
                        description: video.topic ?? '',
                        accessToken: connection.accessToken,
                    });
                }
                // publishWorker sets status → 'posted' on success
                count++;
            }
            catch (error) {
                console.error(`[scheduledPublish] Failed to queue video ${video.id}:`, error);
            }
        }
        return count;
    });
    // Step 3 — Send notifications for users with posting notifications
    await step.run('send-notifications', async () => {
        const userIds = [...new Set(duePosts.map((v) => v.userId))];
        for (const userId of userIds) {
            try {
                const user = await prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    select: { notifyVideoPosted: true },
                });
                if (user?.notifyVideoPosted) {
                    const userVideos = duePosts.filter((v) => v.userId === userId);
                    for (const video of userVideos) {
                        await client_1.inngest.send({
                            name: 'video/posted',
                            data: {
                                videoId: video.id,
                                userId,
                                platforms: video.platforms,
                            },
                        });
                    }
                }
            }
            catch {
                // Non-critical
            }
        }
    });
    return { published: publishCount };
});
