"use strict";
// ── YouTube Publishing — Google OAuth + YouTube Data API v3 ──
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getYouTubeTokens = getYouTubeTokens;
exports.refreshYouTubeToken = refreshYouTubeToken;
exports.uploadToYouTube = uploadToYouTube;
exports.setYouTubeThumbnail = setYouTubeThumbnail;
exports.getChannelInfo = getChannelInfo;
exports.getVideoAnalytics = getVideoAnalytics;
const axios_1 = __importDefault(require("axios"));
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD_BASE = 'https://www.googleapis.com/upload/youtube/v3';
const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID ?? '';
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET ?? '';
const APP_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
// ── Get YouTube Tokens ───────────────────────────────
async function getYouTubeTokens(code) {
    const response = await axios_1.default.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: YOUTUBE_CLIENT_ID,
        client_secret: YOUTUBE_CLIENT_SECRET,
        redirect_uri: `${APP_URL}/api/auth/youtube/callback`,
        grant_type: 'authorization_code',
    }, {
        headers: { 'Content-Type': 'application/json' },
    });
    return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
    };
}
// ── Refresh YouTube Token ────────────────────────────
async function refreshYouTubeToken(refreshToken) {
    const response = await axios_1.default.post('https://oauth2.googleapis.com/token', {
        client_id: YOUTUBE_CLIENT_ID,
        client_secret: YOUTUBE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
    }, {
        headers: { 'Content-Type': 'application/json' },
    });
    return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
    };
}
// ── Upload to YouTube ────────────────────────────────
async function uploadToYouTube(params) {
    const { accessToken, videoUrl, title, description, tags, thumbnailUrl, privacyStatus, } = params;
    // 1. Download video from GCS URL
    const videoResponse = await axios_1.default.get(videoUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
    });
    const videoBuffer = Buffer.from(videoResponse.data);
    // 2. Initiate resumable upload
    const metadata = {
        snippet: {
            title: title.substring(0, 100),
            description,
            tags: tags.slice(0, 15),
            categoryId: '22',
            defaultLanguage: 'en',
        },
        status: {
            privacyStatus: privacyStatus ?? 'public',
            selfDeclaredMadeForKids: false,
        },
    };
    const initResponse = await axios_1.default.post(`${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`, metadata, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': 'video/mp4',
            'X-Upload-Content-Length': videoBuffer.byteLength.toString(),
        },
    });
    const uploadUrl = initResponse.headers['location'];
    if (!uploadUrl) {
        throw new Error('YouTube did not return upload URL');
    }
    // 3. Upload video data
    const uploadResponse = await axios_1.default.put(uploadUrl, videoBuffer, {
        headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': videoBuffer.byteLength.toString(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 300000, // 5 min for upload
    });
    const ytVideoId = uploadResponse.data.id;
    if (!ytVideoId) {
        throw new Error('YouTube upload did not return video ID');
    }
    // 4. Set thumbnail if provided
    if (thumbnailUrl) {
        try {
            await setYouTubeThumbnail({
                accessToken,
                videoId: ytVideoId,
                thumbnailUrl,
            });
        }
        catch (thumbError) {
            console.warn('[youtube] Thumbnail upload failed:', thumbError);
            // Non-critical — continue
        }
    }
    return {
        videoId: ytVideoId,
        youtubeUrl: `https://youtu.be/${ytVideoId}`,
    };
}
// ── Set YouTube Thumbnail ────────────────────────────
async function setYouTubeThumbnail(params) {
    const { accessToken, videoId, thumbnailUrl } = params;
    // Download thumbnail
    const thumbResponse = await axios_1.default.get(thumbnailUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
    });
    const thumbBuffer = Buffer.from(thumbResponse.data);
    await axios_1.default.post(`${YOUTUBE_UPLOAD_BASE}/thumbnails/set?videoId=${videoId}`, thumbBuffer, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'image/jpeg',
            'Content-Length': thumbBuffer.byteLength.toString(),
        },
    });
}
// ── Get Channel Info ─────────────────────────────────
async function getChannelInfo(accessToken) {
    const response = await axios_1.default.get(`${YOUTUBE_API_BASE}/channels?part=snippet,statistics&mine=true`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const channel = response.data.items?.[0];
    if (!channel) {
        throw new Error('No YouTube channel found');
    }
    return {
        channelId: channel.id,
        handle: channel.snippet?.customUrl ?? channel.snippet?.title ?? '',
        subscriberCount: parseInt(channel.statistics?.subscriberCount ?? '0', 10),
        title: channel.snippet?.title ?? '',
        thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? '',
    };
}
// ── Get Video Analytics ──────────────────────────────
async function getVideoAnalytics(params) {
    const response = await axios_1.default.get(`${YOUTUBE_API_BASE}/videos?part=statistics&id=${params.videoId}`, {
        headers: { Authorization: `Bearer ${params.accessToken}` },
    });
    const video = response.data.items?.[0];
    if (!video) {
        return { views: 0, likes: 0, comments: 0, averageViewDuration: 0 };
    }
    const stats = video.statistics ?? {};
    return {
        views: parseInt(stats.viewCount ?? '0', 10),
        likes: parseInt(stats.likeCount ?? '0', 10),
        comments: parseInt(stats.commentCount ?? '0', 10),
        averageViewDuration: 0, // Not available via basic stats endpoint
    };
}
