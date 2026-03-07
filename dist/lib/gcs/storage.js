"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBuffer = uploadBuffer;
exports.uploadFromPath = uploadFromPath;
exports.getSignedUrl = getSignedUrl;
exports.deleteFile = deleteFile;
exports.fileExists = fileExists;
exports.generateKey = generateKey;
exports.generateSegmentKey = generateSegmentKey;
exports.generateMasterAudioKey = generateMasterAudioKey;
exports.generateVideoKey = generateVideoKey;
exports.generateThumbnailKey = generateThumbnailKey;
const storage_1 = require("@google-cloud/storage");
const uuid_1 = require("uuid");
const promises_1 = require("fs/promises");
// ── GCS Client Setup ──────────────────────────────────
const storage = new storage_1.Storage({
    projectId: process.env.GCS_PROJECT_ID,
    credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
});
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME ?? 'autopost-ai-media');
// ── Upload buffer to GCS ──────────────────────────────
async function uploadBuffer(buffer, destination, contentType) {
    try {
        const file = bucket.file(destination);
        await file.save(buffer, {
            contentType,
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });
        return `${process.env.GCS_PUBLIC_URL}/${destination}`;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown upload error';
        throw new Error(`GCS upload failed for ${destination}: ${message}`);
    }
}
// ── Upload from local file path ───────────────────────
async function uploadFromPath(localPath, destination, contentType) {
    try {
        await bucket.upload(localPath, {
            destination,
            contentType,
            metadata: {
                metadata: {
                    cacheControl: 'public, max-age=31536000',
                },
            },
        });
        // Delete local file after successful upload
        try {
            await (0, promises_1.unlink)(localPath);
        }
        catch {
            // Non-critical: local file cleanup failure
        }
        return `${process.env.GCS_PUBLIC_URL}/${destination}`;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown upload error';
        throw new Error(`GCS upload from path failed for ${destination}: ${message}`);
    }
}
// ── Get signed URL ────────────────────────────────────
async function getSignedUrl(destination, expiresInMinutes = 60) {
    const [url] = await bucket.file(destination).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresInMinutes * 60 * 1000,
    });
    return url;
}
// ── Delete file ───────────────────────────────────────
async function deleteFile(destination) {
    try {
        await bucket.file(destination).delete();
    }
    catch {
        // Silently ignore if file not found
    }
}
// ── Check if file exists ──────────────────────────────
async function fileExists(destination) {
    try {
        const [exists] = await bucket.file(destination).exists();
        return exists;
    }
    catch {
        return false;
    }
}
// ── Key Generators ────────────────────────────────────
function generateKey(userId, type, ext) {
    return `users/${userId}/${type}s/${(0, uuid_1.v4)()}.${ext}`;
}
function generateSegmentKey(userId, videoId, type, index, ext) {
    return `users/${userId}/videos/${videoId}/segments/${type}_${index}.${ext}`;
}
function generateMasterAudioKey(userId, videoId) {
    return `users/${userId}/videos/${videoId}/audio/master.mp3`;
}
function generateVideoKey(userId, videoId) {
    return `users/${userId}/videos/${videoId}/output.mp4`;
}
function generateThumbnailKey(userId, videoId) {
    return `users/${userId}/videos/${videoId}/thumbnail.jpg`;
}
