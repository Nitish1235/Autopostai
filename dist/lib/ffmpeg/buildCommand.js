"use strict";
// ── Main Video Render Orchestrator ────────────────────
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execFFmpeg = execFFmpeg;
exports.renderVideo = renderVideo;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("@/lib/db/prisma");
const storage_1 = require("@/lib/gcs/storage");
const selector_1 = require("@/lib/music/selector");
const timestamps_1 = require("@/lib/utils/timestamps");
const kenBurns_1 = require("./kenBurns");
const transitions_1 = require("./transitions");
const subtitles_1 = require("./subtitles");
const audioMix_1 = require("./audioMix");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// ── FFmpeg Execution Helper ──────────────────────────
async function execFFmpeg(args) {
    const command = `ffmpeg ${args.join(' ')}`;
    try {
        const { stdout, stderr } = await execAsync(command, {
            maxBuffer: 50 * 1024 * 1024,
            timeout: 600000, // 10 minute timeout per step
        });
        if (process.env.NODE_ENV === 'development') {
            if (stdout)
                console.log('[ffmpeg stdout]', stdout.slice(0, 500));
            if (stderr)
                console.log('[ffmpeg stderr]', stderr.slice(0, 500));
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown FFmpeg error';
        const stderr = error && typeof error === 'object' && 'stderr' in error
            ? String(error.stderr).slice(0, 1000)
            : '';
        throw new Error(`FFmpeg failed: ${message}\n${stderr}`);
    }
}
// ── Update Render Progress ───────────────────────────
async function updateProgress(videoId, progress, stage) {
    const data = { progress };
    if (stage)
        data.stage = stage;
    await prisma_1.prisma.renderJob.update({
        where: { videoId },
        data,
    });
}
// ── Main Render Function ─────────────────────────────
async function renderVideo(params) {
    const { videoId, userId, imageUrls, script, subtitleConfig, musicMood, musicVolume, format, imageStyle, } = params;
    const workDir = path_1.default.join('/tmp', 'renders', videoId);
    fs_1.default.mkdirSync(workDir, { recursive: true });
    const startTime = Date.now();
    try {
        // ── STEP 1: Download all assets ────────────────────
        await updateProgress(videoId, 62, 'downloading');
        console.log(`[render] Downloading assets for ${videoId}`);
        // Download images
        for (let index = 0; index < imageUrls.length; index++) {
            const url = imageUrls[index];
            if (!url)
                continue;
            const response = await axios_1.default.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000,
            });
            const imgPath = path_1.default.join(workDir, `img_${index}.webp`);
            fs_1.default.writeFileSync(imgPath, Buffer.from(response.data));
        }
        // Download voice audio segments
        for (let index = 0; index < script.length; index++) {
            const segment = script[index];
            if (!segment.audioUrl)
                continue;
            const response = await axios_1.default.get(segment.audioUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
            });
            const audioPath = path_1.default.join(workDir, `voice_${index}.mp3`);
            fs_1.default.writeFileSync(audioPath, Buffer.from(response.data));
        }
        // Get music path
        let musicPath;
        try {
            musicPath = (0, selector_1.getMusicPath)(musicMood, videoId);
        }
        catch {
            // Fallback: create silent audio if no music file
            const silentPath = path_1.default.join(workDir, 'silence.mp3');
            await execFFmpeg([
                '-f', 'lavfi',
                '-i', 'anullsrc=r=44100:cl=stereo',
                '-t', '1',
                '-c:a', 'libmp3lame',
                '-y', silentPath,
            ]);
            musicPath = silentPath;
        }
        // ── STEP 2: Ken Burns clips ────────────────────────
        await updateProgress(videoId, 65, 'render');
        console.log(`[render] Creating Ken Burns clips for ${videoId}`);
        const seed = videoId.charCodeAt(0) + videoId.charCodeAt(1);
        const imageClipPaths = [];
        const clipDurations = [];
        for (let index = 0; index < script.length; index++) {
            const imgPath = path_1.default.join(workDir, `img_${index}.webp`);
            const clipPath = path_1.default.join(workDir, `clip_${index}.mp4`);
            const duration = script[index].duration ?? 3.5;
            if (!fs_1.default.existsSync(imgPath)) {
                console.warn(`[render] Image not found: ${imgPath}, skipping`);
                continue;
            }
            const motion = (0, kenBurns_1.getMotionForSegment)(index, imageStyle, seed);
            const command = (0, kenBurns_1.buildImageClipCommand)({
                inputPath: imgPath,
                outputPath: clipPath,
                duration,
                motion,
                segmentIndex: index,
                imageStyle,
            });
            await execFFmpeg(command);
            imageClipPaths.push(clipPath);
            clipDurations.push(duration);
        }
        await updateProgress(videoId, 72);
        // ── STEP 3: Concat clips with transitions ──────────
        console.log(`[render] Concatenating clips for ${videoId}`);
        const concatPath = path_1.default.join(workDir, 'video_raw.mp4');
        const transitionType = (0, transitions_1.getTransitionForStyle)(imageStyle);
        const transitionDuration = (0, transitions_1.getTransitionDuration)(format);
        try {
            const concatCommand = (0, transitions_1.buildConcatWithTransitions)({
                clipPaths: imageClipPaths,
                clipDurations,
                outputPath: concatPath,
                transitionType,
                transitionDuration,
                fps: 30,
            });
            await execFFmpeg(concatCommand);
        }
        catch {
            // Fallback to simple concat
            console.log(`[render] Transition concat failed, using simple concat`);
            const simpleCommand = (0, transitions_1.buildSimpleConcat)(imageClipPaths, concatPath);
            await execFFmpeg(simpleCommand);
        }
        await updateProgress(videoId, 78);
        // ── STEP 4: Concatenate voice segments ─────────────
        console.log(`[render] Concatenating voice segments for ${videoId}`);
        const voicePaths = script
            .map((_, i) => path_1.default.join(workDir, `voice_${i}.mp3`))
            .filter((p) => fs_1.default.existsSync(p));
        const masterVoicePath = path_1.default.join(workDir, 'voice_master.mp3');
        if (voicePaths.length > 0) {
            const voiceConcatCmd = (0, audioMix_1.buildVoiceConcatCommand)({
                audioPaths: voicePaths,
                outputPath: masterVoicePath,
            });
            await execFFmpeg(voiceConcatCmd);
        }
        // ── STEP 5: Mix voice + music ──────────────────────
        console.log(`[render] Mixing audio for ${videoId}`);
        const totalDuration = clipDurations.reduce((a, b) => a + b, 0);
        const mixedAudioPath = path_1.default.join(workDir, 'audio_mixed.aac');
        if (fs_1.default.existsSync(masterVoicePath)) {
            const audioMixCmd = (0, audioMix_1.buildAudioMixCommand)({
                voicePath: masterVoicePath,
                musicPath,
                outputPath: mixedAudioPath,
                musicVolume,
                voiceVolume: 1.0,
                totalDuration,
            });
            await execFFmpeg(audioMixCmd);
        }
        await updateProgress(videoId, 83);
        // ── STEP 6: Mux video + audio ──────────────────────
        console.log(`[render] Muxing video + audio for ${videoId}`);
        const muxedPath = path_1.default.join(workDir, 'video_muxed.mp4');
        if (fs_1.default.existsSync(mixedAudioPath)) {
            const muxCmd = (0, audioMix_1.buildFinalMuxCommand)({
                videoPath: concatPath,
                audioPath: mixedAudioPath,
                outputPath: muxedPath,
                duration: totalDuration,
            });
            await execFFmpeg(muxCmd);
        }
        else {
            // No audio — just copy video
            fs_1.default.copyFileSync(concatPath, muxedPath);
        }
        // ── STEP 7: Burn subtitles ─────────────────────────
        console.log(`[render] Burning subtitles for ${videoId}`);
        // Merge all word timestamps with offset
        const segmentsWithWords = script.map((seg) => ({
            words: (seg.wordTimestamps ?? []).map((w) => ({
                word: w.word,
                start: w.start,
                end: w.end,
            })),
            audioDuration: seg.duration ?? 3.5,
        }));
        const allWordTimestamps = (0, timestamps_1.offsetSegmentTimestamps)(segmentsWithWords);
        // Build ASS file
        const style = (0, subtitles_1.buildASSStyle)(subtitleConfig);
        const events = (0, subtitles_1.buildWordEvents)({
            wordTimestamps: allWordTimestamps,
            subtitleConfig,
            fps: 30,
        });
        const assPath = path_1.default.join(workDir, 'subtitles.ass');
        const assContent = (0, subtitles_1.buildASSFile)({
            events,
            style,
            videoWidth: 1080,
            videoHeight: 1920,
        });
        await (0, subtitles_1.writeASSFile)(assContent, assPath);
        const subtitledPath = path_1.default.join(workDir, 'video_subtitled.mp4');
        if (events.length > 0) {
            // Escape the path for FFmpeg ass filter
            const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
            await execFFmpeg([
                '-i', muxedPath,
                '-vf', `ass='${escapedAssPath}'`,
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '22',
                '-c:a', 'copy',
                '-y', subtitledPath,
            ]);
        }
        else {
            // No subtitles — just copy
            fs_1.default.copyFileSync(muxedPath, subtitledPath);
        }
        await updateProgress(videoId, 90);
        // ── STEP 8: Color grade + grain ────────────────────
        console.log(`[render] Applying color grade for ${videoId}`);
        const gradedPath = path_1.default.join(workDir, 'video_graded.mp4');
        const gradeCmd = (0, audioMix_1.buildColorGradeCommand)({
            inputPath: subtitledPath,
            outputPath: gradedPath,
            imageStyle,
        });
        await execFFmpeg(gradeCmd);
        await updateProgress(videoId, 94);
        // ── STEP 9: Extract thumbnail ──────────────────────
        console.log(`[render] Extracting thumbnail for ${videoId}`);
        const thumbPath = path_1.default.join(workDir, 'thumbnail.jpg');
        const thumbCmd = (0, audioMix_1.buildThumbnailCommand)({
            videoPath: gradedPath,
            outputPath: thumbPath,
            timeOffset: 3,
        });
        await execFFmpeg(thumbCmd);
        // ── STEP 10: Upload to GCS ─────────────────────────
        await updateProgress(videoId, 96, 'uploading');
        console.log(`[render] Uploading to GCS for ${videoId}`);
        const videoKey = (0, storage_1.generateVideoKey)(userId, videoId);
        const thumbKey = (0, storage_1.generateThumbnailKey)(userId, videoId);
        const videoUrl = await (0, storage_1.uploadFromPath)(gradedPath, videoKey, 'video/mp4');
        const thumbnailUrl = await (0, storage_1.uploadFromPath)(thumbPath, thumbKey, 'image/jpeg');
        // ── STEP 11: Update DB ─────────────────────────────
        const elapsed = Date.now() - startTime;
        await prisma_1.prisma.video.update({
            where: { id: videoId },
            data: {
                videoUrl,
                thumbnailUrl,
                status: 'ready',
                processingMs: elapsed,
            },
        });
        await prisma_1.prisma.renderJob.update({
            where: { videoId },
            data: {
                status: 'complete',
                progress: 100,
                completedAt: new Date(),
                durationMs: elapsed,
            },
        });
        console.log(`[render] Complete for ${videoId} in ${elapsed}ms`);
        return { videoUrl, thumbnailUrl };
    }
    finally {
        // ── STEP 12: Cleanup temp files ────────────────────
        try {
            fs_1.default.rmSync(workDir, { recursive: true, force: true });
        }
        catch {
            console.warn(`[render] Cleanup failed for ${workDir}`);
        }
    }
}
