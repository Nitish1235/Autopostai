"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToFrameTimestamps = convertToFrameTimestamps;
exports.offsetSegmentTimestamps = offsetSegmentTimestamps;
exports.getActiveWord = getActiveWord;
exports.getWordState = getWordState;
exports.getSegmentFrameRange = getSegmentFrameRange;
exports.calculateVideoDuration = calculateVideoDuration;
exports.formatDuration = formatDuration;
// ── Convert to Frame Timestamps ──────────────────────
function convertToFrameTimestamps(words, fps = 30) {
    return words.map((word) => ({
        word: word.word,
        start: word.start,
        end: word.end,
        startFrame: Math.floor(word.start * fps),
        endFrame: Math.ceil(word.end * fps),
    }));
}
// ── Offset Segment Timestamps ────────────────────────
function offsetSegmentTimestamps(segments, fps = 30) {
    const result = [];
    let cumulativeDuration = 0;
    for (const segment of segments) {
        for (const word of segment.words) {
            const offsetStart = word.start + cumulativeDuration;
            const offsetEnd = word.end + cumulativeDuration;
            result.push({
                word: word.word,
                start: offsetStart,
                end: offsetEnd,
                startFrame: Math.floor(offsetStart * fps),
                endFrame: Math.ceil(offsetEnd * fps),
            });
        }
        cumulativeDuration += segment.audioDuration;
    }
    return result;
}
// ── Get Active Word ──────────────────────────────────
function getActiveWord(wordTimestamps, currentFrame) {
    for (const word of wordTimestamps) {
        if (currentFrame >= word.startFrame && currentFrame <= word.endFrame) {
            return word;
        }
    }
    return null;
}
// ── Get Word State ───────────────────────────────────
function getWordState(word, currentFrame) {
    if (currentFrame < word.startFrame)
        return 'upcoming';
    if (currentFrame >= word.startFrame && currentFrame <= word.endFrame)
        return 'active';
    return 'spoken';
}
// ── Get Segment Frame Range ──────────────────────────
function getSegmentFrameRange(segmentWords) {
    if (segmentWords.length === 0) {
        return { startFrame: 0, endFrame: 0 };
    }
    const firstWord = segmentWords[0];
    const lastWord = segmentWords[segmentWords.length - 1];
    return {
        startFrame: firstWord.startFrame,
        endFrame: lastWord.endFrame,
    };
}
// ── Calculate Video Duration ─────────────────────────
function calculateVideoDuration(segments) {
    let total = 0;
    for (const segment of segments) {
        total += segment.audioDuration;
    }
    return total;
}
// ── Format Duration ──────────────────────────────────
function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
