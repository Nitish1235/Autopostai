"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndTriggerRender = checkAndTriggerRender;
const prisma_1 = require("@/lib/db/prisma");
const videoQueue_1 = require("@/lib/queue/videoQueue");
// ── Check and Trigger Render ─────────────────────────
// Shared between imageWorker and voiceWorker.
// Called after each image or voice segment completes.
// When all assets are ready, triggers the render job.
async function checkAndTriggerRender(videoId, userId) {
    // 1. Fetch video with all relevant fields
    const video = await prisma_1.prisma.video.findUnique({
        where: { id: videoId },
        select: {
            id: true,
            status: true,
            format: true,
            script: true,
            imageUrls: true,
            subtitleConfig: true,
            musicMood: true,
            musicVolume: true,
        },
    });
    if (!video) {
        console.error(`[renderTrigger] Video not found: ${videoId}`);
        return;
    }
    // 2. Parse script segments
    const script = video.script;
    if (!script || !Array.isArray(script) || script.length === 0) {
        console.log(`[renderTrigger] No script found for video ${videoId}`);
        return;
    }
    const totalExpected = script.length;
    // 3. Count completed images
    const completedImages = (video.imageUrls ?? []).filter((url) => !!url && url.length > 0).length;
    // 4. Count completed voice segments (segments with audioUrl set)
    const completedVoice = script.filter((seg) => !!seg.audioUrl && seg.audioUrl.length > 0).length;
    const allImagesReady = completedImages === totalExpected;
    const allVoiceReady = completedVoice === totalExpected;
    // 5. If not all ready, log progress and return
    if (!allImagesReady || !allVoiceReady) {
        console.log(`[renderTrigger] Waiting... images: ${completedImages}/${totalExpected}, voice: ${completedVoice}/${totalExpected}`);
        return;
    }
    // 6. Check if already rendering or beyond
    const renderStatuses = ['rendering', 'ready', 'scheduled', 'posted'];
    if (renderStatuses.includes(video.status)) {
        console.log(`[renderTrigger] Video ${videoId} already in status: ${video.status}. Skipping.`);
        return;
    }
    // 7. Trigger render
    console.log(`[renderTrigger] All assets ready. Render job added for ${videoId}`);
    // Update video status
    await prisma_1.prisma.video.update({
        where: { id: videoId },
        data: { status: 'rendering' },
    });
    // Update RenderJob record
    await prisma_1.prisma.renderJob.update({
        where: { videoId },
        data: {
            stage: 'render',
            progress: 58,
            startedAt: new Date(),
        },
    });
    // Add job to render queue
    await videoQueue_1.renderQueue.add(`render-${videoId}`, {
        videoId,
        userId,
        format: video.format,
        subtitleConfig: video.subtitleConfig,
        musicMood: video.musicMood,
        musicVolume: video.musicVolume,
        script: script,
        imageUrls: video.imageUrls,
    }, {
        jobId: `render-${videoId}`,
    });
}
