"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishWorker = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const outstand_1 = require("@/lib/api/outstand");
const youtube_1 = require("@/lib/api/youtube");
const openai_1 = require("@/lib/api/openai");
const prisma_1 = require("@/lib/db/prisma");
const client_1 = require("@/lib/inngest/client");
// ── Redis Connection ─────────────────────────────────
const connection = new ioredis_1.default(process.env.REDIS_URL ?? '', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
// ── Publish Worker ───────────────────────────────────
exports.publishWorker = new bullmq_1.Worker('publish', async (job) => {
    const { videoId, userId, platforms } = job.data;
    console.log(`[publishWorker] Publishing video ${videoId} to ${platforms.join(', ')}`);
    try {
        // 1. Fetch video (include publishedPlatforms and platformStatuses)
        const video = await prisma_1.prisma.video.findUnique({
            where: { id: videoId },
            select: {
                id: true,
                status: true,
                title: true,
                topic: true,
                niche: true,
                videoUrl: true,
                thumbnailUrl: true,
                platforms: true,
                publishedPlatforms: true,
                platformStatuses: true,
                scheduledAt: true,
                topicQueueId: true,
            },
        });
        if (!video) {
            throw new Error(`Video not found: ${videoId}`);
        }
        // 2. Fetch user's platform connections
        const connections = await prisma_1.prisma.platformConnection.findMany({
            where: { userId, connected: true },
            select: {
                id: true,
                platform: true,
                accessToken: true,
                refreshToken: true,
            },
        });
        // 3. Validate
        if (video.status !== 'ready' && video.status !== 'scheduled' && video.status !== 'posted') {
            throw new Error(`Video status is ${video.status}, expected 'ready', 'scheduled', or 'posted'`);
        }
        if (!video.videoUrl) {
            throw new Error('Video URL is not set');
        }
        if (connections.length === 0) {
            throw new Error('No connected platform accounts found');
        }
        // 4. Check scheduled time
        if (video.scheduledAt && new Date(video.scheduledAt) > new Date()) {
            console.log(`[publishWorker] Video ${videoId} scheduled for future, skipping`);
            return { success: true, skipped: true, reason: 'scheduled_future' };
        }
        // 5. IDEMPOTENCY: Skip platforms already posted
        const alreadyPosted = new Set(video.publishedPlatforms);
        const platformsToPublish = platforms.filter((p) => !alreadyPosted.has(p));
        if (platformsToPublish.length === 0) {
            console.log(`[publishWorker] All platforms already posted for ${videoId}`);
            return { success: true, skipped: true, reason: 'already_posted' };
        }
        // 6. Set pending platforms in platformStatuses
        const currentStatuses = video.platformStatuses ?? {};
        for (const p of platformsToPublish) {
            currentStatuses[p] = 'pending';
        }
        await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: { platformStatuses: currentStatuses },
        });
        // 7. Generate captions for target platforms
        const captionMap = {};
        const captionPromises = platformsToPublish.map(async (platform) => {
            try {
                const captions = await (0, openai_1.generateCaptions)({
                    title: video.title,
                    topic: video.topic,
                    niche: video.niche ?? 'general',
                    platform,
                });
                captionMap[platform] = captions;
            }
            catch {
                captionMap[platform] = {
                    caption: video.title,
                    hashtags: [],
                    cta: '',
                };
            }
        });
        await Promise.all(captionPromises);
        // 8. Separate YouTube from other platforms
        const youtubeSelected = platformsToPublish.includes('youtube');
        const otherPlatforms = platformsToPublish.filter((p) => p !== 'youtube');
        const successfulPlatforms = [];
        const failedPlatforms = [];
        // 9. Publish to TikTok, Instagram, X via Outstand
        if (otherPlatforms.length > 0) {
            const connectedPlatforms = otherPlatforms
                .map((platform) => {
                const conn = connections.find((c) => c.platform === platform);
                if (!conn?.accessToken) {
                    failedPlatforms.push(platform);
                    return null;
                }
                return {
                    platform: platform,
                    accessToken: conn.accessToken,
                };
            })
                .filter((p) => p !== null);
            if (connectedPlatforms.length > 0) {
                const defaultPlatform = connectedPlatforms[0].platform;
                const defaultCaption = captionMap[defaultPlatform] ?? captionMap[otherPlatforms[0]];
                try {
                    const outstandResults = await (0, outstand_1.postToMultiplePlatforms)({
                        platforms: connectedPlatforms,
                        videoUrl: video.videoUrl,
                        caption: defaultCaption?.caption ?? video.title,
                        hashtags: defaultCaption?.hashtags ?? [],
                        thumbnailUrl: video.thumbnailUrl ?? undefined,
                    });
                    for (const result of outstandResults) {
                        successfulPlatforms.push(result.platform);
                    }
                    // Mark platforms that were connected but not in results as failed
                    for (const cp of connectedPlatforms) {
                        if (!successfulPlatforms.includes(cp.platform)) {
                            failedPlatforms.push(cp.platform);
                        }
                    }
                }
                catch {
                    // All outstand platforms failed
                    for (const cp of connectedPlatforms) {
                        failedPlatforms.push(cp.platform);
                    }
                }
            }
        }
        // 10. Publish to YouTube
        if (youtubeSelected) {
            const ytConnection = connections.find((c) => c.platform === 'youtube');
            if (ytConnection?.accessToken) {
                try {
                    const ytCaption = captionMap['youtube'] ?? {
                        caption: video.title,
                        hashtags: [],
                    };
                    await (0, youtube_1.uploadToYouTube)({
                        accessToken: ytConnection.accessToken,
                        videoUrl: video.videoUrl,
                        title: video.title,
                        description: ytCaption.caption,
                        tags: ytCaption.hashtags,
                        thumbnailUrl: video.thumbnailUrl ?? undefined,
                    });
                    successfulPlatforms.push('youtube');
                }
                catch (ytError) {
                    console.error(`[publishWorker] YouTube publish failed for ${videoId}:`, ytError);
                    failedPlatforms.push('youtube');
                }
            }
            else {
                failedPlatforms.push('youtube');
            }
        }
        // 11. Build updated statuses
        const updatedStatuses = { ...currentStatuses };
        for (const p of successfulPlatforms) {
            updatedStatuses[p] = 'posted';
        }
        for (const p of failedPlatforms) {
            updatedStatuses[p] = 'failed';
        }
        // 12. Merge publishedPlatforms (append new successes, don't overwrite)
        const mergedPublished = [
            ...new Set([...video.publishedPlatforms, ...successfulPlatforms]),
        ];
        // 13. Determine video status: 'posted' only when ALL target platforms done
        const allTargetsDone = video.platforms.every((p) => mergedPublished.includes(p));
        await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: {
                status: allTargetsDone ? 'posted' : video.status === 'scheduled' ? 'ready' : video.status,
                postedAt: allTargetsDone ? new Date() : video.status === 'posted' ? undefined : null,
                publishedPlatforms: mergedPublished,
                platformStatuses: updatedStatuses,
            },
        });
        // 14. Update PlatformConnection stats
        for (const platform of successfulPlatforms) {
            const conn = connections.find((c) => c.platform === platform);
            if (conn) {
                await prisma_1.prisma.platformConnection.update({
                    where: { id: conn.id },
                    data: {
                        lastPostAt: new Date(),
                        lastPostStatus: 'success',
                        monthlyPosts: { increment: 1 },
                    },
                });
            }
        }
        // 15. Update TopicQueue if linked AND all done
        if (video.topicQueueId && allTargetsDone) {
            await prisma_1.prisma.topicQueue.update({
                where: { id: video.topicQueueId },
                data: { status: 'done' },
            });
        }
        // 16. Send Inngest event
        try {
            await client_1.inngest.send({
                name: 'video/posted',
                data: {
                    videoId,
                    userId,
                    platforms: successfulPlatforms,
                    allDone: allTargetsDone,
                },
            });
        }
        catch {
            // Non-critical
        }
        console.log(`[publishWorker] Published ${videoId} to: ${successfulPlatforms.join(', ')}` +
            (failedPlatforms.length > 0
                ? ` | Failed: ${failedPlatforms.join(', ')}`
                : ''));
        return {
            success: true,
            postedTo: successfulPlatforms,
            failed: failedPlatforms,
            allDone: allTargetsDone,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown publish error';
        console.error(`[publishWorker] Failed for video ${videoId}: ${message}`);
        // Update platformStatuses for attempted platforms to 'failed'
        // but do NOT set video status to 'failed' — keep it in 'ready' for retry
        try {
            const video = await prisma_1.prisma.video.findUnique({
                where: { id: videoId },
                select: { platformStatuses: true, status: true },
            });
            if (video) {
                const statuses = video.platformStatuses ?? {};
                for (const p of platforms) {
                    if (statuses[p] !== 'posted') {
                        statuses[p] = 'failed';
                    }
                }
                await prisma_1.prisma.video.update({
                    where: { id: videoId },
                    data: {
                        platformStatuses: statuses,
                        errorMessage: `Publishing failed: ${message}`,
                        // Keep status as-is (ready/scheduled) so user can retry
                    },
                });
            }
        }
        catch (updateErr) {
            console.error('[publishWorker] Failed to update statuses:', updateErr);
        }
        throw error;
    }
}, {
    connection,
    concurrency: 2,
});
exports.publishWorker.on('failed', (job, error) => {
    console.error(`[publishWorker] Job ${job?.id} failed:`, error.message);
});
exports.publishWorker.on('completed', (job) => {
    console.log(`[publishWorker] Job ${job.id} completed`);
});
