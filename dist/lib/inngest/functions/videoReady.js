"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onVideoReady = void 0;
const client_1 = require("@/lib/inngest/client");
const prisma_1 = require("@/lib/db/prisma");
const videoQueue_1 = require("@/lib/queue/videoQueue");
const VideoReady_1 = require("@/emails/VideoReady");
// ── On Video Ready ───────────────────────────────────
// Triggered when video rendering is complete (video/ready event)
exports.onVideoReady = client_1.inngest.createFunction({ id: 'on-video-ready', name: 'On Video Ready' }, { event: 'video/ready' }, async ({ event, step }) => {
    const { videoId, userId } = event.data;
    // Step 1 — Fetch video and user
    const context = await step.run('fetch-video-and-user', async () => {
        const video = await prisma_1.prisma.video.findUnique({
            where: { id: videoId },
            select: {
                id: true,
                title: true,
                topic: true,
                thumbnailUrl: true,
                platforms: true,
                videoUrl: true,
            },
        });
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                name: true,
                notifyVideoReady: true,
                platformConnections: {
                    where: { connected: true },
                    select: { platform: true, accessToken: true },
                },
            },
        });
        const autopilotConfig = await prisma_1.prisma.autopilotConfig.findUnique({
            where: { userId },
            select: { approvalMode: true, enabled: true },
        });
        return { video, user, autopilotConfig };
    });
    if (!context.video || !context.user) {
        return { processed: false, reason: 'Video or user not found' };
    }
    const { video, user, autopilotConfig } = context;
    const approvalMode = autopilotConfig?.approvalMode ?? 'review';
    // Step 2 — Send notification
    await step.run('send-notification', async () => {
        if (user.notifyVideoReady && user.email) {
            await (0, VideoReady_1.sendVideoReadyEmail)({
                email: user.email,
                name: user.name ?? 'Creator',
                videoTitle: video.title,
                videoId: video.id,
                thumbnailUrl: video.thumbnailUrl ?? undefined,
                approvalMode: approvalMode,
            });
        }
    });
    // Step 3 — Handle autopilot posting
    await step.run('handle-autopilot-posting', async () => {
        if (approvalMode === 'autopilot') {
            // Immediately add to publish queue
            const connectedPlatforms = user.platformConnections.map((c) => c.platform);
            const platforms = video.platforms.filter((p) => connectedPlatforms.includes(p));
            for (const platform of platforms) {
                const connection = user.platformConnections.find((c) => c.platform === platform);
                if (!connection?.accessToken)
                    continue;
                await videoQueue_1.publishQueue.add(`publish-${video.id}-${platform}`, {
                    videoId: video.id,
                    userId,
                    platform,
                    videoUrl: video.videoUrl ?? '',
                    title: video.title,
                    description: video.topic ?? '',
                    accessToken: connection.accessToken,
                });
            }
            // publishWorker sets status → 'posted' on success
        }
    });
    // Step 4 — Handle review mode with 24h deadline
    if (approvalMode === 'review') {
        // Wait 23 hours
        await step.sleep('review-deadline-wait', '23h');
        await step.run('check-review-deadline', async () => {
            // Re-fetch video to check current status
            const currentVideo = await prisma_1.prisma.video.findUnique({
                where: { id: videoId },
                select: { status: true, platforms: true },
            });
            // If video is still in 'ready' status after 23h — auto-publish
            if (currentVideo?.status === 'ready') {
                const connectedPlatforms = user.platformConnections.map((c) => c.platform);
                const platforms = currentVideo.platforms.filter((p) => connectedPlatforms.includes(p));
                for (const platform of platforms) {
                    const connection = user.platformConnections.find((c) => c.platform === platform);
                    if (!connection?.accessToken)
                        continue;
                    await videoQueue_1.publishQueue.add(`publish-${video.id}-${platform}-auto`, {
                        videoId: video.id,
                        userId,
                        platform,
                        videoUrl: video.videoUrl ?? '',
                        title: video.title,
                        description: video.topic ?? '',
                        accessToken: connection.accessToken,
                    });
                }
                // publishWorker sets status → 'posted' on success
            }
        });
    }
    return { processed: true };
});
