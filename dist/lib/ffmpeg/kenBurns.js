"use strict";
// ── Ken Burns Effect — Cinematic Motion on Static Images ──
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMotionForSegment = getMotionForSegment;
exports.buildKenBurnsFilter = buildKenBurnsFilter;
exports.buildImageClipCommand = buildImageClipCommand;
// ── Motion Banks per Style ───────────────────────────
const ALL_MOTIONS = [
    'zoom_in',
    'zoom_out',
    'pan_left',
    'pan_right',
    'pan_up',
    'pan_down',
    'diagonal_drift',
    'zoom_rotate',
];
const STYLE_MOTIONS = {
    cinematic: ['zoom_in', 'pan_left', 'diagonal_drift', 'zoom_out', 'pan_right'],
    anime: ['zoom_in', 'zoom_out', 'zoom_rotate', 'pan_left'],
    dark_fantasy: ['zoom_in', 'pan_up', 'zoom_in', 'diagonal_drift'],
    cyberpunk: ['pan_left', 'pan_right', 'diagonal_drift', 'zoom_in'],
    documentary: ['pan_left', 'pan_right', 'zoom_in', 'zoom_out'],
};
// ── Get Motion for Segment ───────────────────────────
function getMotionForSegment(segmentIndex, imageStyle, seed) {
    const motions = STYLE_MOTIONS[imageStyle] ?? ALL_MOTIONS;
    const index = (segmentIndex + seed) % motions.length;
    return motions[index];
}
// ── Build Ken Burns Filter ───────────────────────────
function buildKenBurnsFilter(config) {
    const frames = Math.ceil(config.duration * config.fps);
    switch (config.motion) {
        case 'zoom_in':
            return (`zoompan=z='min(zoom+0.0008,1.12)':` +
                `x='iw/2-(iw/zoom/2)':` +
                `y='ih/2-(ih/zoom/2)':` +
                `d=${frames}:s=1080x1920:fps=${config.fps}`);
        case 'zoom_out':
            return (`zoompan=z='if(eq(on\\,1)\\,1.12\\,max(zoom-0.0008\\,1.0))':` +
                `x='iw/2-(iw/zoom/2)':` +
                `y='ih/2-(ih/zoom/2)':` +
                `d=${frames}:s=1080x1920:fps=${config.fps}`);
        case 'pan_left':
            return (`zoompan=z='1.05':` +
                `x='iw*0.1-(iw*0.1/${frames})*on':` +
                `y='ih/2-(ih/zoom/2)':` +
                `d=${frames}:s=1080x1920:fps=${config.fps}`);
        case 'pan_right':
            return (`zoompan=z='1.05':` +
                `x='(iw*0.1/${frames})*on':` +
                `y='ih/2-(ih/zoom/2)':` +
                `d=${frames}:s=1080x1920:fps=${config.fps}`);
        case 'pan_up':
            return (`zoompan=z='1.05':` +
                `x='iw/2-(iw/zoom/2)':` +
                `y='ih*0.1-(ih*0.1/${frames})*on':` +
                `d=${frames}:s=1080x1920:fps=${config.fps}`);
        case 'pan_down':
            return (`zoompan=z='1.05':` +
                `x='iw/2-(iw/zoom/2)':` +
                `y='(ih*0.1/${frames})*on':` +
                `d=${frames}:s=1080x1920:fps=${config.fps}`);
        case 'diagonal_drift':
            return (`zoompan=z='min(zoom+0.0005,1.08)':` +
                `x='(iw*0.05/${frames})*on':` +
                `y='(ih*0.05/${frames})*on':` +
                `d=${frames}:s=1080x1920:fps=${config.fps}`);
        case 'zoom_rotate':
            return (`zoompan=z='min(zoom+0.0007,1.10)':` +
                `x='iw/2-(iw/zoom/2)':` +
                `y='ih/2-(ih/zoom/2)':` +
                `d=${frames}:s=1080x1920:fps=${config.fps}`);
        default:
            return (`zoompan=z='min(zoom+0.0008,1.12)':` +
                `x='iw/2-(iw/zoom/2)':` +
                `y='ih/2-(ih/zoom/2)':` +
                `d=${frames}:s=1080x1920:fps=${config.fps}`);
    }
}
// ── Build Image Clip Command ─────────────────────────
function buildImageClipCommand(params) {
    const { inputPath, outputPath, duration, motion } = params;
    const kenBurnsFilter = buildKenBurnsFilter({
        motion,
        duration,
        fps: 30,
        width: 1080,
        height: 1920,
    });
    const filterChain = [
        'scale=1200:2133:force_original_aspect_ratio=increase',
        'crop=1200:2133',
        kenBurnsFilter,
        'scale=1080:1920',
        'setsar=1',
    ].join(',');
    return [
        '-loop', '1',
        '-i', inputPath,
        '-vf', filterChain,
        '-t', duration.toString(),
        '-r', '30',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-y',
        outputPath,
    ];
}
