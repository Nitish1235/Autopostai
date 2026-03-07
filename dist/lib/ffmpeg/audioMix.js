"use strict";
// ── Audio Mixing — Voice + Music ─────────────────────
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildVoiceConcatCommand = buildVoiceConcatCommand;
exports.buildAudioMixCommand = buildAudioMixCommand;
exports.buildFinalMuxCommand = buildFinalMuxCommand;
exports.buildColorGradeCommand = buildColorGradeCommand;
exports.buildThumbnailCommand = buildThumbnailCommand;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
// ── Concatenate Voice Segments ───────────────────────
function buildVoiceConcatCommand(params) {
    const { audioPaths, outputPath } = params;
    // Write concat list file
    const listFileName = `audiolist_${(0, uuid_1.v4)()}.txt`;
    const listFilePath = path_1.default.join(path_1.default.dirname(outputPath), listFileName);
    const listContent = audioPaths
        .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
        .join('\n');
    fs_1.default.writeFileSync(listFilePath, listContent, 'utf-8');
    return [
        '-f', 'concat',
        '-safe', '0',
        '-i', listFilePath,
        '-c', 'copy',
        '-y',
        outputPath,
    ];
}
// ── Mix Voice + Background Music ─────────────────────
function buildAudioMixCommand(params) {
    const { voicePath, musicPath, outputPath, musicVolume, voiceVolume, totalDuration, } = params;
    const fadeStart = Math.max(0, totalDuration - 2);
    const filterComplex = `[0:a]volume=${voiceVolume}[voice];` +
        `[1:a]volume=${musicVolume},` +
        `aloop=loop=-1:size=2e+09,` +
        `atrim=duration=${totalDuration},` +
        `afade=t=out:st=${fadeStart.toFixed(2)}:d=2[music];` +
        `[voice][music]amix=inputs=2:duration=first[aout]`;
    return [
        '-i', voicePath,
        '-i', musicPath,
        '-filter_complex', filterComplex,
        '-map', '[aout]',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-y',
        outputPath,
    ];
}
// ── Mux Video + Audio ────────────────────────────────
function buildFinalMuxCommand(params) {
    const { videoPath, audioPath, outputPath } = params;
    return [
        '-i', videoPath,
        '-i', audioPath,
        '-map', '0:v',
        '-map', '1:a',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-shortest',
        '-movflags', '+faststart',
        '-y',
        outputPath,
    ];
}
// ── Color Grade + Film Grain ─────────────────────────
function buildColorGradeCommand(params) {
    const { inputPath, outputPath, imageStyle } = params;
    let filterChain;
    switch (imageStyle) {
        case 'cinematic':
            filterChain =
                "curves=r='0/0 0.3/0.25 0.7/0.75 1/1':" +
                    "g='0/0 0.3/0.28 0.7/0.72 1/1':" +
                    "b='0/0 0.3/0.32 0.7/0.68 1/1'," +
                    'noise=alls=8:allf=t';
            break;
        case 'dark_fantasy':
            filterChain =
                "curves=master='0/0 0.5/0.4 1/0.9'," +
                    'noise=alls=6:allf=t';
            break;
        case 'vintage':
            filterChain =
                "curves=r='0/0.1 0.5/0.55 1/0.9':" +
                    "b='0/0.05 0.5/0.45 1/0.8'," +
                    'noise=alls=10:allf=t';
            break;
        case 'cyberpunk':
            filterChain =
                'hue=s=1.4,' +
                    "curves=r='0/0 0.5/0.45 1/0.9':" +
                    "b='0/0.1 0.5/0.55 1/1'," +
                    'noise=alls=5:allf=t';
            break;
        default:
            // Light sharpen + subtle grain for all other styles
            filterChain =
                'unsharp=5:5:0.8:3:3:0.4,' +
                    'noise=alls=4:allf=t';
            break;
    }
    return [
        '-i', inputPath,
        '-vf', filterChain,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '22',
        '-c:a', 'copy',
        '-y',
        outputPath,
    ];
}
// ── Extract Thumbnail ────────────────────────────────
function buildThumbnailCommand(params) {
    const { videoPath, outputPath, timeOffset } = params;
    return [
        '-i', videoPath,
        '-ss', (timeOffset ?? 3).toString(),
        '-vframes', '1',
        '-q:v', '2',
        '-vf', 'scale=540:960',
        '-y',
        outputPath,
    ];
}
