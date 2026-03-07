"use strict";
// ── Image Prompt Builder ─────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.STYLE_NEGATIVES = exports.NEGATIVE_PROMPT = exports.STYLE_SUFFIXES = void 0;
exports.getVariationModifiers = getVariationModifiers;
exports.buildImagePrompt = buildImagePrompt;
exports.buildAspectRatioParams = buildAspectRatioParams;
exports.STYLE_SUFFIXES = {
    cinematic: 'anamorphic lens, teal-orange color grade, film grain overlay, shallow depth of field, golden hour rim lighting, shot on ARRI Alexa, 8K ultra-detailed, photorealistic',
    anime: 'studio ghibli art style, soft watercolor textures, pastel color palette, hand-drawn line art, expressive character design, anime illustration, detailed background art',
    dark_fantasy: 'dramatic chiaroscuro lighting, god rays, volumetric fog, dark oil painting style, fantasy concept art, epic scale, moody atmosphere, highly detailed digital painting',
    cyberpunk: 'neon lights reflecting on wet streets, RGB color split, holographic elements, blade runner aesthetic, futuristic megacity, high contrast, cinematic lighting, 8K',
    documentary: 'handheld camera feel, natural ambient light, slightly desaturated, photojournalism style, candid real-world photography, film texture, editorial quality',
    vintage: 'kodachrome film photography, faded warm tones, light leak artifacts, analog grain, 1970s color palette, sun-drenched, nostalgic mood, vintage magazine quality',
    '3d_render': 'octane render, physically based rendering, subsurface scattering, studio three-point lighting, cinema 4D quality, clean modern aesthetic, photorealistic 3D, 8K render',
    minimal: 'minimalist composition, generous negative space, soft even lighting, muted modern palette, architectural photography style, ultra-clean, editorial fashion photography',
};
exports.NEGATIVE_PROMPT = 'blurry, out of focus, low quality, watermark, text overlay, words, letters, signature, logo, extra limbs, deformed hands, ugly face, duplicate, bad anatomy, cartoon when not requested, childish, stock photo watermark, oversaturated, overexposed, amateur phone camera, nsfw, violence, gore, political figures';
exports.STYLE_NEGATIVES = {
    cinematic: 'flat lighting, amateur, phone camera, cartoon',
    anime: 'realistic, photographic, 3D render, western cartoon',
    dark_fantasy: 'bright cheerful colors, daytime, modern setting',
    cyberpunk: 'nature, medieval, bright daylight, desaturated',
    documentary: 'studio lighting, artificial, over-edited, fantasy',
    vintage: 'modern, digital, clean, oversaturated, neon',
    '3d_render': 'painterly, sketch, 2D flat, blurry, anime',
    minimal: 'cluttered, busy, dark, dramatic, fantasy elements',
};
// ── Variation Banks ──────────────────────────────────
const ANGLE_BANK = [
    'extreme close-up shot',
    "bird's eye view",
    "worm's eye view looking up",
    'dutch angle',
    'over-the-shoulder perspective',
    'wide establishing shot',
    'medium portrait shot',
    'cinematic tracking shot',
];
const TIME_BANK = [
    'golden hour warm light',
    'blue hour twilight',
    'harsh midday sunlight',
    'overcast soft diffused light',
    'midnight darkness with artificial lights',
    'dawn first light',
    'magic hour sunset',
    'stormy dramatic sky',
];
const ATMOSPHERE_BANK = [
    'clear crisp air',
    'light morning fog',
    'heavy atmospheric haze',
    'light rain drops on surfaces',
    'snow falling gently',
    'heat shimmer in distance',
    'dramatic storm clouds approaching',
    'golden dust particles in light',
];
function getVariationModifiers(seed) {
    const angleIndex = seed % ANGLE_BANK.length;
    const timeIndex = seed % TIME_BANK.length;
    const atmosphereIndex = seed % ATMOSPHERE_BANK.length;
    const angle = ANGLE_BANK[angleIndex];
    const time = TIME_BANK[timeIndex];
    const atmosphere = ATMOSPHERE_BANK[atmosphereIndex];
    return `${angle}, ${time}, ${atmosphere}`;
}
function buildImagePrompt(basePrompt, imageStyle, variationSeed) {
    const styleSuffix = exports.STYLE_SUFFIXES[imageStyle] ?? exports.STYLE_SUFFIXES.cinematic;
    const variationModifiers = getVariationModifiers(variationSeed ?? 0);
    return `${basePrompt}, ${styleSuffix}, ${variationModifiers}`;
}
function buildAspectRatioParams(platform) {
    switch (platform) {
        case 'tiktok':
        case 'instagram':
        case 'youtube_shorts':
            return { width: 1024, height: 1792 };
        case 'youtube':
            return { width: 1792, height: 1024 };
        case 'instagram_feed':
            return { width: 1024, height: 1024 };
        default:
            return { width: 1024, height: 1792 };
    }
}
