"use strict";
// ── Outstand API — TikTok, Instagram, X Publishing ───
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectAccount = connectAccount;
exports.postVideo = postVideo;
exports.postToMultiplePlatforms = postToMultiplePlatforms;
exports.getPostAnalytics = getPostAnalytics;
exports.refreshAccessToken = refreshAccessToken;
const axios_1 = __importDefault(require("axios"));
const BASE_URL = 'https://api.outstand.io/v1';
const API_KEY = process.env.OUTSTAND_API_KEY;
// ── HTTP Helper ──────────────────────────────────────
async function outstandFetch(endpoint, method, body) {
    try {
        const response = await (0, axios_1.default)({
            url: `${BASE_URL}${endpoint}`,
            method,
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            data: body,
            timeout: 60000,
        });
        return response.data;
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            const status = error.response?.status ?? 'unknown';
            const data = error.response?.data;
            const message = typeof data === 'object' && data && 'message' in data
                ? String(data.message)
                : `HTTP ${status}`;
            throw new Error(`Outstand API error: ${message}`);
        }
        throw error;
    }
}
// ── Connect Account ──────────────────────────────────
async function connectAccount(params) {
    return outstandFetch('/accounts/connect', 'POST', {
        platform: params.platform,
        accessToken: params.accessToken,
        refreshToken: params.refreshToken,
    });
}
// ── Post Video ───────────────────────────────────────
async function postVideo(params) {
    const fullCaption = params.caption +
        '\n\n' +
        params.hashtags.map((t) => `#${t}`).join(' ');
    return outstandFetch('/posts/video', 'POST', {
        platform: params.platform,
        accessToken: params.accessToken,
        videoUrl: params.videoUrl,
        caption: fullCaption,
        thumbnailUrl: params.thumbnailUrl,
    });
}
// ── Post to Multiple Platforms ───────────────────────
async function postToMultiplePlatforms(params) {
    const results = [];
    const settled = await Promise.allSettled(params.platforms.map((plat) => postVideo({
        platform: plat.platform,
        accessToken: plat.accessToken,
        videoUrl: params.videoUrl,
        caption: params.caption,
        hashtags: params.hashtags,
        thumbnailUrl: params.thumbnailUrl,
    })));
    for (let i = 0; i < settled.length; i++) {
        const result = settled[i];
        if (result.status === 'fulfilled') {
            results.push(result.value);
        }
        else {
            console.error(`[outstand] Failed to post to ${params.platforms[i].platform}:`, result.reason);
        }
    }
    return results;
}
// ── Get Post Analytics ───────────────────────────────
async function getPostAnalytics(params) {
    return outstandFetch(`/posts/${params.postId}/analytics?platform=${params.platform}`, 'GET');
}
// ── Refresh Access Token ─────────────────────────────
async function refreshAccessToken(params) {
    return outstandFetch('/accounts/refresh', 'POST', {
        platform: params.platform,
        refreshToken: params.refreshToken,
    });
}
