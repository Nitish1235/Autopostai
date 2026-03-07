"use strict";
// ── Video Transitions ────────────────────────────────
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransitionForStyle = getTransitionForStyle;
exports.getTransitionDuration = getTransitionDuration;
exports.buildConcatWithTransitions = buildConcatWithTransitions;
exports.buildSimpleConcat = buildSimpleConcat;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
// ── Transition Type to FFmpeg xfade Map ──────────────
const XFADE_MAP = {
    crossfade: 'fade',
    fade_black: 'fadeblack',
    fade_white: 'fadewhite',
    slide_left: 'slideleft',
    slide_right: 'slideright',
    zoom_blur: 'zoominblur',
    dip_black: 'fadeblack',
};
// ── Get Transition for Style ─────────────────────────
function getTransitionForStyle(imageStyle) {
    switch (imageStyle) {
        case 'cinematic':
            return 'crossfade';
        case 'dark_fantasy':
            return 'fade_black';
        case 'anime':
            return 'crossfade';
        case 'cyberpunk':
            return 'slide_left';
        case 'documentary':
            return 'crossfade';
        case 'vintage':
            return 'dip_black';
        case '3d_render':
            return 'fade_white';
        case 'minimal':
            return 'fade_white';
        default:
            return 'crossfade';
    }
}
// ── Get Transition Duration ──────────────────────────
function getTransitionDuration(format) {
    switch (format) {
        case '30s':
            return 0.4;
        case '60s':
            return 0.5;
        case '90s':
            return 0.5;
        default:
            return 0.4;
    }
}
// ── Build Concat with Transitions ────────────────────
function buildConcatWithTransitions(params) {
    const { clipPaths, clipDurations, outputPath, transitionType, transitionDuration, } = params;
    if (clipPaths.length === 0) {
        throw new Error('No clips provided for concatenation');
    }
    if (clipPaths.length === 1) {
        // Single clip — just copy
        return ['-i', clipPaths[0], '-c', 'copy', '-y', outputPath];
    }
    const xfadeType = XFADE_MAP[transitionType] ?? 'fade';
    // Build input args
    const inputArgs = [];
    for (const clipPath of clipPaths) {
        inputArgs.push('-i', clipPath);
    }
    // Build xfade filter chain
    const filterParts = [];
    let prevLabel = '0:v';
    let cumulativeOffset = 0;
    for (let i = 1; i < clipPaths.length; i++) {
        // Offset = cumulative clip durations minus accumulated transitions
        cumulativeOffset += clipDurations[i - 1];
        const offset = Math.max(0, cumulativeOffset - i * transitionDuration);
        const outputLabel = i === clipPaths.length - 1 ? 'vout' : `v${i}`;
        filterParts.push(`[${prevLabel}][${i}:v]xfade=transition=${xfadeType}:duration=${transitionDuration}:offset=${offset.toFixed(3)}[${outputLabel}]`);
        prevLabel = outputLabel;
    }
    const filterComplex = filterParts.join(';');
    return [
        ...inputArgs,
        '-filter_complex', filterComplex,
        '-map', '[vout]',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-y',
        outputPath,
    ];
}
// ── Build Simple Concat (Fallback) ───────────────────
function buildSimpleConcat(clipPaths, outputPath) {
    // Create concat demuxer file
    const listFileName = `concat_${(0, uuid_1.v4)()}.txt`;
    const listFilePath = path_1.default.join(path_1.default.dirname(outputPath), listFileName);
    const listContent = clipPaths
        .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
        .join('\n');
    fs_1.default.writeFileSync(listFilePath, listContent, 'utf-8');
    return [
        '-f', 'concat',
        '-safe', '0',
        '-i', listFilePath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-y',
        outputPath,
    ];
}
