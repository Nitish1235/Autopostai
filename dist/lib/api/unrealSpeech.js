"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanTextForTTS = cleanTextForTTS;
exports.generateVoice = generateVoice;
exports.generateVoiceAndUpload = generateVoiceAndUpload;
exports.estimateDuration = estimateDuration;
exports.generatePreviewAudio = generatePreviewAudio;
const axios_1 = __importDefault(require("axios"));
const storage_1 = require("@/lib/gcs/storage");
// ── Config ───────────────────────────────────────────
const BASE_URL = 'https://api.v8.unrealspeech.com';
const API_KEY = process.env.UNREAL_SPEECH_API_KEY;
// ── Voice Mapping ────────────────────────────────────
const VOICE_MAP = {
    ryan: 'Dan',
    sarah: 'Scarlett',
    james: 'Will',
    aria: 'Liv',
    marcus: 'Dan',
    elena: 'Scarlett',
};
// ── Clean Text for TTS ───────────────────────────────
function cleanTextForTTS(text) {
    let cleaned = text;
    // Replace em-dash with comma-space
    cleaned = cleaned.replace(/—/g, ', ');
    // Replace ellipsis with period-space
    cleaned = cleaned.replace(/\.\.\./g, '. ');
    cleaned = cleaned.replace(/…/g, '. ');
    // Remove asterisks
    cleaned = cleaned.replace(/\*/g, '');
    // Replace multiple spaces with single space
    cleaned = cleaned.replace(/\s+/g, ' ');
    // Trim whitespace
    cleaned = cleaned.trim();
    // Ensure text ends with punctuation
    if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
        cleaned += '.';
    }
    return cleaned;
}
// ── Generate Voice ───────────────────────────────────
async function generateVoice(params) {
    const mappedVoice = params.voiceId; // v8 uses the exact names
    const cleanedText = cleanTextForTTS(params.text);
    const requestBody = {
        Text: cleanedText,
        VoiceId: mappedVoice,
        Bitrate: '192k',
        Speed: params.speed ?? 0,
        Pitch: params.pitch ?? 1.0,
        TimestampType: 'word',
    };
    // Generate audio stream
    let audioBuffer;
    try {
        const audioResponse = await axios_1.default.post(`${BASE_URL}/stream`, requestBody, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
            timeout: 30000,
        });
        audioBuffer = Buffer.from(audioResponse.data);
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            if (error.response?.status === 401) {
                throw new Error('Unreal Speech authentication failed');
            }
            if (error.response?.status === 429) {
                throw new Error('Unreal Speech rate limit exceeded');
            }
            throw new Error(`Voice generation failed: ${error.response?.status ?? 'unknown'}`);
        }
        throw error;
    }
    // Get word-level timestamps
    let words = [];
    try {
        const timestampResponse = await axios_1.default.post(`${BASE_URL}/timestamps`, requestBody, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            timeout: 15000,
        });
        const timestampData = timestampResponse.data;
        if (Array.isArray(timestampData)) {
            words = timestampData.map((item) => ({
                word: item.word,
                start: item.start,
                end: item.end,
            }));
        }
        else if (timestampData &&
            typeof timestampData === 'object' &&
            Array.isArray(timestampData.words)) {
            words = timestampData.words.map((item) => ({
                word: item.word,
                start: item.start,
                end: item.end,
            }));
        }
    }
    catch {
        // Timestamps are non-critical; continue without them
        console.warn('Failed to fetch word timestamps, continuing without them');
    }
    // Calculate duration from last word end time + padding
    let duration = 3.5; // Default fallback
    if (words.length > 0) {
        const lastWord = words[words.length - 1];
        duration = lastWord.end + 0.3;
    }
    else {
        // Estimate from text
        duration = estimateDuration(cleanedText, params.speed ?? 1.0);
    }
    return {
        audioUrl: '', // Caller uploads to GCS and sets this
        audioBuffer,
        words,
        duration,
    };
}
// ── Generate Voice and Upload ────────────────────────
async function generateVoiceAndUpload(params) {
    const result = await generateVoice({
        text: params.text,
        voiceId: params.voiceId,
        speed: params.speed,
    });
    const gcsKey = (0, storage_1.generateSegmentKey)(params.userId, params.videoId, 'audio', params.segmentIndex, 'mp3');
    const gcsUrl = await (0, storage_1.uploadBuffer)(result.audioBuffer, gcsKey, 'audio/mpeg');
    return {
        gcsUrl,
        words: result.words,
        duration: result.duration,
    };
}
// ── Estimate Duration ────────────────────────────────
function estimateDuration(text, speed = 1.0) {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const baseDuration = (wordCount / 150) * 60;
    return baseDuration / speed;
}
// ── Generate Preview Audio ───────────────────────────
async function generatePreviewAudio(params) {
    const previewText = params.text ??
        'In 1971, a decision that changed the world forever was made by a 26-year-old with nothing in his pocket.';
    const result = await generateVoice({
        text: previewText,
        voiceId: params.voiceId,
    });
    return result.audioBuffer;
}
