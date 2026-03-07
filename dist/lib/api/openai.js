"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateScript = generateScript;
exports.generateTopics = generateTopics;
exports.generateCaptions = generateCaptions;
exports.generateReplyOptions = generateReplyOptions;
const openai_1 = __importDefault(require("openai"));
const scriptPrompt_1 = require("@/lib/prompts/scriptPrompt");
// ── OpenAI Client ────────────────────────────────────
let cachedOpenai = null;
function getOpenAI() {
    if (!cachedOpenai) {
        cachedOpenai = new openai_1.default({
            apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_build',
        });
    }
    return cachedOpenai;
}
// ── Generate Script ──────────────────────────────────
async function generateScript(params) {
    const { topic, niche, format } = params;
    const segmentCount = (0, scriptPrompt_1.getSegmentCount)(format);
    try {
        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.8,
            max_tokens: 4000,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: (0, scriptPrompt_1.buildScriptSystemPrompt)() },
                {
                    role: 'user',
                    content: (0, scriptPrompt_1.buildScriptUserPrompt)(topic, niche, format, segmentCount),
                },
            ],
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Script generation returned empty response');
        }
        let parsed;
        try {
            parsed = JSON.parse(content);
        }
        catch {
            throw new Error('Script generation returned invalid JSON');
        }
        // Validate title
        if (!parsed.title || typeof parsed.title !== 'string') {
            throw new Error('Script generation returned invalid title');
        }
        // Validate segments array
        if (!Array.isArray(parsed.segments)) {
            throw new Error('Script generation returned invalid segments array');
        }
        if (parsed.segments.length !== segmentCount) {
            throw new Error(`Expected ${segmentCount} segments but got ${parsed.segments.length}`);
        }
        // Map and validate each segment
        const segments = parsed.segments.map((seg, index) => {
            if (!seg.narration || typeof seg.narration !== 'string') {
                throw new Error(`Segment ${index + 1} has invalid narration`);
            }
            if (!seg.imagePrompt || typeof seg.imagePrompt !== 'string') {
                throw new Error(`Segment ${index + 1} has invalid imagePrompt`);
            }
            return {
                id: seg.id ?? `seg_${String(index + 1).padStart(3, '0')}`,
                order: seg.order ?? index + 1,
                narration: seg.narration,
                imagePrompt: seg.imagePrompt,
                duration: seg.estimatedDuration,
            };
        });
        return {
            title: parsed.title,
            segments,
            totalEstimatedDuration: parsed.totalEstimatedDuration ?? segmentCount * 3.5,
        };
    }
    catch (error) {
        if (error instanceof Error && error.message.startsWith('Script generation')) {
            throw error;
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Script generation failed: ${message}`);
    }
}
// ── Generate Topics ──────────────────────────────────
async function generateTopics(params) {
    const { niche, count, existingTopics } = params;
    try {
        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o',
            temperature: 1.0,
            max_tokens: 1000,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You generate viral video topics. Respond only with a JSON object containing a "topics" array of strings. No other keys.',
                },
                {
                    role: 'user',
                    content: (0, scriptPrompt_1.buildTopicGenerationPrompt)(niche, count, existingTopics ?? []),
                },
            ],
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Topic generation returned empty response');
        }
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed.topics)) {
            throw new Error('Topic generation returned invalid topics array');
        }
        const topics = parsed.topics.filter((t) => typeof t === 'string' && t.length > 0);
        if (topics.length < count) {
            throw new Error(`Expected at least ${count} topics but got ${topics.length}`);
        }
        return topics.slice(0, count);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Topic generation failed: ${message}`);
    }
}
// ── Generate Captions ────────────────────────────────
async function generateCaptions(params) {
    const { title, topic, niche, platform } = params;
    try {
        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.9,
            max_tokens: 500,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You write viral social media captions. Respond only with valid JSON.',
                },
                {
                    role: 'user',
                    content: `Write a ${platform} caption for a video about: ${topic}. Niche: ${niche}. Title: ${title}.

Return JSON: {
  "caption": "engaging caption text",
  "hashtags": ["tag1", "tag2", ...8 tags max],
  "cta": "call to action line"
}

Rules:
- TikTok/Instagram: conversational, emoji allowed, max 150 chars for caption
- YouTube: SEO-optimized, include keywords, max 500 chars
- X: punchy, max 240 chars
- Hashtags: mix of niche + trending + broad
- CTA: "Follow for more" / "Part 2 tomorrow" etc`,
                },
            ],
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Caption generation returned empty response');
        }
        const parsed = JSON.parse(content);
        return {
            caption: parsed.caption ?? '',
            hashtags: Array.isArray(parsed.hashtags)
                ? parsed.hashtags.filter((h) => typeof h === 'string')
                : [],
            cta: parsed.cta ?? '',
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Caption generation failed: ${message}`);
    }
}
// ── Generate Reply Options ───────────────────────────
async function generateReplyOptions(comment, videoTopic) {
    try {
        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o',
            temperature: 0.9,
            max_tokens: 400,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content: 'You write friendly social media reply options. Respond only with valid JSON containing a "replies" array of 3 strings.',
                },
                {
                    role: 'user',
                    content: `Generate 3 reply options for this comment on a video about "${videoTopic}":

Comment: "${comment}"

Rules:
- Keep each reply under 150 characters
- Friendly and engaging
- Encourage more interaction
- Vary tone: one witty, one informative, one appreciative

Return: { "replies": ["reply1", "reply2", "reply3"] }`,
                },
            ],
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            return ['Thanks for watching! 🙌', 'Great question! Stay tuned 👀', 'Appreciate the love! ❤️'];
        }
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed.replies) || parsed.replies.length < 3) {
            return ['Thanks for watching! 🙌', 'Great question! Stay tuned 👀', 'Appreciate the love! ❤️'];
        }
        return parsed.replies.slice(0, 3);
    }
    catch {
        return ['Thanks for watching! 🙌', 'Great question! Stay tuned 👀', 'Appreciate the love! ❤️'];
    }
}
