"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NICHE_MUSIC_MAP = void 0;
exports.getMusicPath = getMusicPath;
exports.getMusicForNiche = getMusicForNiche;
exports.getMusicPathById = getMusicPathById;
exports.listAvailableTracks = listAvailableTracks;
exports.getMusicMetadata = getMusicMetadata;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// ── Music Library Map ────────────────────────────────
const MUSIC_LIBRARY = {
    upbeat: [
        'music/upbeat/energetic-01.mp3',
        'music/upbeat/upbeat-02.mp3',
    ],
    dark: [
        'music/dark/tense-01.mp3',
        'music/dark/dark-02.mp3',
    ],
    motivational: [
        'music/motivational/inspire-01.mp3',
        'music/motivational/motivate-02.mp3',
    ],
    calm: [
        'music/calm/ambient-01.mp3',
        'music/calm/peaceful-02.mp3',
    ],
    mystery: [
        'music/mystery/suspense-01.mp3',
        'music/mystery/mystery-02.mp3',
    ],
};
// ── Niche to Mood Map ────────────────────────────────
exports.NICHE_MUSIC_MAP = {
    finance: 'motivational',
    health: 'upbeat',
    tech: 'upbeat',
    mindset: 'motivational',
    history: 'dark',
    science: 'calm',
    travel: 'upbeat',
    food: 'upbeat',
    business: 'motivational',
    mystery: 'mystery',
    nature: 'calm',
    relationships: 'calm',
};
// ── Get Music Path ───────────────────────────────────
function getMusicPath(mood, videoId) {
    const tracks = MUSIC_LIBRARY[mood] ?? MUSIC_LIBRARY.motivational;
    const index = videoId.charCodeAt(0) % tracks.length;
    const relativePath = tracks[index];
    const absolutePath = path_1.default.resolve(process.cwd(), relativePath);
    if (!fs_1.default.existsSync(absolutePath)) {
        throw new Error(`Music file not found: ${absolutePath}`);
    }
    return absolutePath;
}
// ── Get Music for Niche ──────────────────────────────
function getMusicForNiche(niche, videoId) {
    const mood = exports.NICHE_MUSIC_MAP[niche] ?? 'motivational';
    return getMusicPath(mood, videoId);
}
// ── Get Music Path by Index ──────────────────────────
function getMusicPathById(mood, trackIndex) {
    const tracks = MUSIC_LIBRARY[mood] ?? MUSIC_LIBRARY.motivational;
    const safeIndex = Math.abs(trackIndex) % tracks.length;
    const relativePath = tracks[safeIndex];
    return path_1.default.resolve(process.cwd(), relativePath);
}
// ── List Available Tracks ────────────────────────────
function listAvailableTracks() {
    return Object.entries(MUSIC_LIBRARY).map(([mood, tracks]) => ({
        mood,
        tracks: tracks.map((t) => path_1.default.basename(t)),
        count: tracks.length,
    }));
}
// ── Get Music Metadata ───────────────────────────────
function getMusicMetadata(trackPath) {
    const filename = path_1.default.basename(trackPath);
    const parentDir = path_1.default.basename(path_1.default.dirname(trackPath));
    // Determine mood from parent directory name
    let mood = 'unknown';
    for (const [moodKey, tracks] of Object.entries(MUSIC_LIBRARY)) {
        if (tracks.some((t) => t.includes(parentDir))) {
            mood = moodKey;
            break;
        }
    }
    return {
        filename,
        mood,
        path: trackPath,
    };
}
