"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_COLORS = exports.IMAGE_COUNT = exports.SUBTITLE_PRESETS = exports.SUBTITLE_FONTS = exports.NICHES = exports.MUSIC_MOODS = exports.VOICES = exports.NEGATIVE_PROMPT = exports.IMAGE_STYLES = exports.CREDIT_PACKS = exports.PLAN_TIER = exports.CRUN_AI_MODELS = exports.AI_VIDEO_DURATION = exports.AI_VIDEO_LIMITS = exports.PLANS = void 0;
exports.PLANS = {
    starter: {
        id: 'starter',
        name: 'Starter',
        price: 19,
        credits: 30,
        aiVideoCredits: 20,
        postsPerDay: 1,
        features: [
            '30 faceless videos per month',
            '20 AI video clips per month',
            'Post 1 video/day across all platforms',
            'All 8 AI visual styles',
            'All 48 voice options',
            '30s / 60s / 90s formats',
            'Smart subtitles',
            'TikTok + Instagram + YouTube + X',
            'Basic analytics',
        ],
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        price: 49,
        credits: 100,
        aiVideoCredits: 50,
        postsPerDay: 2,
        features: [
            '100 faceless videos per month',
            '50 AI video clips per month',
            'Post 2 videos/day across all platforms',
            'Everything in Starter',
            'Advanced subtitle styles & animations',
            'Scheduling & autopilot mode',
            'Full analytics dashboard',
            'Priority rendering',
            'Email support',
        ],
    },
    creator_max: {
        id: 'creator_max',
        name: 'Creator Max',
        price: 129,
        credits: 300,
        aiVideoCredits: 150,
        postsPerDay: 4,
        features: [
            '300 faceless videos per month',
            '150 AI video clips per month',
            'Post 4 videos/day across all platforms',
            'Everything in Pro',
            'Full autopilot mode',
            'AI optimal posting time',
            'Weekly performance reports',
            'Multi-channel management',
            'Dedicated support',
        ],
    },
};
// ── AI Video Constants ───────────────────────────────
exports.AI_VIDEO_LIMITS = {
    starter: 20,
    pro: 50,
    creator_max: 150,
};
exports.AI_VIDEO_DURATION = {
    min: 10,
    max: 15,
    default: 12,
};
exports.CRUN_AI_MODELS = {
    sora2: 'openai/sora2',
    sora2Pro: 'openai/sora2-pro',
};
// Plan tier ranking for upgrade/downgrade comparison
exports.PLAN_TIER = {
    free: 0,
    starter: 1,
    pro: 2,
    creator_max: 3,
};
exports.CREDIT_PACKS = [
    { id: 'pack_10', credits: 10, price: 9, label: '10 Videos' },
    { id: 'pack_25', credits: 25, price: 20, label: '25 Videos' },
    { id: 'pack_50', credits: 50, price: 35, label: '50 Videos' },
];
exports.IMAGE_STYLES = [
    {
        id: 'cinematic',
        label: 'Cinematic Film',
        suffix: 'anamorphic lens, teal-orange color grade, film grain, ARRI Alexa, 8K, photorealistic',
    },
    {
        id: 'anime',
        label: 'Anime / Illustrated',
        suffix: 'studio ghibli style, soft watercolor, pastel palette, hand-drawn, anime art',
    },
    {
        id: 'dark_fantasy',
        label: 'Dark Fantasy',
        suffix: 'dramatic shadows, god rays, volumetric fog, dark oil painting, fantasy art',
    },
    {
        id: 'cyberpunk',
        label: 'Cyberpunk',
        suffix: 'neon lights, rain-slicked streets, RGB glow, blade runner aesthetic, futuristic',
    },
    {
        id: 'documentary',
        label: 'Documentary',
        suffix: 'handheld camera, natural light, desaturated, photojournalism, real world',
    },
    {
        id: 'vintage',
        label: 'Vintage Film',
        suffix: 'kodachrome film, faded colors, light leak, 1970s grain, warm tones',
    },
    {
        id: '3d_render',
        label: '3D Render',
        suffix: 'octane render, subsurface scattering, studio lighting, cinema 4D, clean 3D',
    },
    {
        id: 'minimal',
        label: 'Minimal Clean',
        suffix: 'minimalist, clean composition, soft light, white space, modern photography',
    },
];
exports.NEGATIVE_PROMPT = 'blurry, out of focus, low quality, watermark, text, signature, ' +
    'extra limbs, deformed hands, ugly, duplicate, bad anatomy, ' +
    'cartoon, childish, stock photo, oversaturated, overexposed, ' +
    'amateur, nsfw, violence';
exports.VOICES = [
    // ── American Female ────────────────────────────────
    { id: 'Autumn', name: 'Autumn', gender: 'Female', accent: 'American', tags: ['Warm', 'Friendly'], language: 'English' },
    { id: 'Melody', name: 'Melody', gender: 'Female', accent: 'American', tags: ['Sweet', 'Youthful'], language: 'English' },
    { id: 'Hannah', name: 'Hannah', gender: 'Female', accent: 'American', tags: ['Clear', 'Professional'], language: 'English' },
    { id: 'Emily', name: 'Emily', gender: 'Female', accent: 'American', tags: ['Calm', 'Storytelling'], language: 'English' },
    { id: 'Ivy', name: 'Ivy', gender: 'Female', accent: 'American', tags: ['Crisp', 'Energetic'], language: 'English' },
    { id: 'Kaitlyn', name: 'Kaitlyn', gender: 'Female', accent: 'American', tags: ['Soft', 'Relaxing'], language: 'English' },
    { id: 'Luna', name: 'Luna', gender: 'Female', accent: 'American', tags: ['Dreamy', 'Gentle'], language: 'English' },
    { id: 'Willow', name: 'Willow', gender: 'Female', accent: 'American', tags: ['Smooth', 'Elegant'], language: 'English' },
    { id: 'Lauren', name: 'Lauren', gender: 'Female', accent: 'American', tags: ['Authoritative', 'Bold'], language: 'English' },
    { id: 'Sierra', name: 'Sierra', gender: 'Female', accent: 'American', tags: ['Natural', 'Casual'], language: 'English' },
    // ── American Male ──────────────────────────────────
    { id: 'Noah', name: 'Noah', gender: 'Male', accent: 'American', tags: ['Deep', 'Authoritative'], language: 'English' },
    { id: 'Jasper', name: 'Jasper', gender: 'Male', accent: 'American', tags: ['Warm', 'Engaging'], language: 'English' },
    { id: 'Caleb', name: 'Caleb', gender: 'Male', accent: 'American', tags: ['Energetic', 'Youthful'], language: 'English' },
    { id: 'Ronan', name: 'Ronan', gender: 'Male', accent: 'American', tags: ['Dramatic', 'Narrative'], language: 'English' },
    { id: 'Ethan', name: 'Ethan', gender: 'Male', accent: 'American', tags: ['Confident', 'Clear'], language: 'English' },
    { id: 'Daniel', name: 'Daniel', gender: 'Male', accent: 'American', tags: ['Formal', 'Professional'], language: 'English' },
    { id: 'Zane', name: 'Zane', gender: 'Male', accent: 'American', tags: ['Cool', 'Modern'], language: 'English' },
    // ── British Female ─────────────────────────────────
    { id: 'Élodie', name: 'Élodie', gender: 'Female', accent: 'French', tags: ['Elegant', 'Refined'], language: 'French' },
    // ── Spanish ────────────────────────────────────────
    { id: 'Lucía', name: 'Lucía', gender: 'Female', accent: 'Spanish', tags: ['Warm', 'Articulate'], language: 'Spanish' },
    { id: 'Mateo', name: 'Mateo', gender: 'Male', accent: 'Spanish', tags: ['Deep', 'Natural'], language: 'Spanish' },
    { id: 'Javier', name: 'Javier', gender: 'Male', accent: 'Spanish', tags: ['Smooth', 'Clear'], language: 'Spanish' },
    // ── Portuguese ─────────────────────────────────────
    { id: 'Camila', name: 'Camila', gender: 'Female', accent: 'Portuguese', tags: ['Friendly', 'Warm'], language: 'Portuguese' },
    { id: 'Thiago', name: 'Thiago', gender: 'Male', accent: 'Portuguese', tags: ['Engaging', 'Natural'], language: 'Portuguese' },
    { id: 'Rafael', name: 'Rafael', gender: 'Male', accent: 'Portuguese', tags: ['Confident', 'Clear'], language: 'Portuguese' },
    // ── Italian ────────────────────────────────────────
    { id: 'Giulia', name: 'Giulia', gender: 'Female', accent: 'Italian', tags: ['Expressive', 'Melodic'], language: 'Italian' },
    { id: 'Luca', name: 'Luca', gender: 'Male', accent: 'Italian', tags: ['Warm', 'Storytelling'], language: 'Italian' },
    // ── Hindi ──────────────────────────────────────────
    { id: 'Ananya', name: 'Ananya', gender: 'Female', accent: 'Hindi', tags: ['Clear', 'Professional'], language: 'Hindi' },
    { id: 'Priya', name: 'Priya', gender: 'Female', accent: 'Hindi', tags: ['Soft', 'Calm'], language: 'Hindi' },
    { id: 'Arjun', name: 'Arjun', gender: 'Male', accent: 'Hindi', tags: ['Authoritative', 'Bold'], language: 'Hindi' },
    { id: 'Rohan', name: 'Rohan', gender: 'Male', accent: 'Hindi', tags: ['Friendly', 'Youthful'], language: 'Hindi' },
    // ── Chinese ────────────────────────────────────────
    { id: 'Mei', name: 'Mei', gender: 'Female', accent: 'Chinese', tags: ['Clear', 'Gentle'], language: 'Chinese' },
    { id: 'Lian', name: 'Lian', gender: 'Female', accent: 'Chinese', tags: ['Warm', 'Natural'], language: 'Chinese' },
    { id: 'Ting', name: 'Ting', gender: 'Female', accent: 'Chinese', tags: ['Crisp', 'Modern'], language: 'Chinese' },
    { id: 'Jing', name: 'Jing', gender: 'Female', accent: 'Chinese', tags: ['Soft', 'Elegant'], language: 'Chinese' },
    { id: 'Wei', name: 'Wei', gender: 'Male', accent: 'Chinese', tags: ['Deep', 'Professional'], language: 'Chinese' },
    { id: 'Jian', name: 'Jian', gender: 'Male', accent: 'Chinese', tags: ['Confident', 'Clear'], language: 'Chinese' },
    { id: 'Hao', name: 'Hao', gender: 'Male', accent: 'Chinese', tags: ['Engaging', 'Warm'], language: 'Chinese' },
    { id: 'Sheng', name: 'Sheng', gender: 'Male', accent: 'Chinese', tags: ['Bold', 'Narrative'], language: 'Chinese' },
    // ── Japanese ───────────────────────────────────────
    { id: 'Yuki', name: 'Yuki', gender: 'Female', accent: 'Japanese', tags: ['Soft', 'Natural'], language: 'Japanese' },
    { id: 'Haruto', name: 'Haruto', gender: 'Male', accent: 'Japanese', tags: ['Clear', 'Professional'], language: 'Japanese' },
];
exports.MUSIC_MOODS = [
    {
        id: 'upbeat',
        label: 'Upbeat',
        emoji: '\u26A1',
        desc: 'Energetic, fast-paced, motivational',
    },
    {
        id: 'dark',
        label: 'Dark',
        emoji: '\uD83C\uDF11',
        desc: 'Tense, dramatic, mysterious',
    },
    {
        id: 'motivational',
        label: 'Motivational',
        emoji: '\uD83D\uDD25',
        desc: 'Inspiring, powerful, building',
    },
    {
        id: 'calm',
        label: 'Calm',
        emoji: '\uD83C\uDF0A',
        desc: 'Ambient, peaceful, focused',
    },
    {
        id: 'mystery',
        label: 'Mystery',
        emoji: '\uD83D\uDD2E',
        desc: 'Suspenseful, eerie, unknown',
    },
];
exports.NICHES = [
    { id: 'finance', label: 'Finance & Money', emoji: '\uD83D\uDCB0' },
    { id: 'health', label: 'Health & Fitness', emoji: '\uD83D\uDCAA' },
    { id: 'tech', label: 'Technology & AI', emoji: '\uD83E\uDD16' },
    { id: 'mindset', label: 'Mindset & Success', emoji: '\uD83E\uDDE0' },
    { id: 'history', label: 'History & Facts', emoji: '\uD83D\uDCDC' },
    { id: 'science', label: 'Science & Space', emoji: '\uD83D\uDD2C' },
    { id: 'travel', label: 'Travel & Places', emoji: '\u2708\uFE0F' },
    { id: 'food', label: 'Food & Recipes', emoji: '\uD83C\uDF5C' },
    { id: 'business', label: 'Business & Startup', emoji: '\uD83D\uDCC8' },
    { id: 'mystery', label: 'Mystery & Crime', emoji: '\uD83D\uDD0D' },
    { id: 'nature', label: 'Nature & Animals', emoji: '\uD83C\uDF3F' },
    { id: 'relationships', label: 'Relationships', emoji: '\u2764\uFE0F' },
];
exports.SUBTITLE_FONTS = [
    { id: 'impact', label: 'Impact Stack', family: 'Impact, Anton' },
    { id: 'inter', label: 'Clean Modern', family: 'Inter' },
    { id: 'bebas', label: 'Chunky Bold', family: 'Bebas Neue' },
    { id: 'caveat', label: 'Handwritten', family: 'Caveat' },
    { id: 'playfair', label: 'Serif Editorial', family: 'Playfair Display' },
    { id: 'mono', label: 'Mono Code', family: 'JetBrains Mono' },
    { id: 'nunito', label: 'Rounded Soft', family: 'Nunito' },
    { id: 'barlow', label: 'Condensed Tall', family: 'Barlow Condensed' },
    {
        id: 'cormorant',
        label: 'Elegant Thin',
        family: 'Cormorant Garamond',
    },
    { id: 'marker', label: 'Street Graffiti', family: 'Permanent Marker' },
];
exports.SUBTITLE_PRESETS = {
    mrbeast: {
        font: 'impact',
        fontSize: 42,
        primaryColor: '#FFFFFF',
        activeColor: '#FFE500',
        spokenColor: '#AAAAAA',
        firstWordAccent: false,
        strokeColor: '#000000',
        strokeWidth: 4,
        backgroundBox: true,
        bgColor: '#FFE500',
        bgOpacity: 1,
        animation: 'pop',
        uppercase: true,
        maxWordsPerLine: 2,
    },
    hormozi: {
        font: 'bebas',
        fontSize: 48,
        primaryColor: '#FFFFFF',
        activeColor: '#FFFFFF',
        spokenColor: '#888888',
        firstWordAccent: false,
        strokeColor: '#000000',
        strokeWidth: 0,
        backgroundBox: true,
        bgColor: '#000000',
        bgOpacity: 0.85,
        animation: 'none',
        uppercase: true,
        maxWordsPerLine: 3,
    },
    minimal: {
        font: 'inter',
        fontSize: 22,
        primaryColor: '#FFFFFF',
        activeColor: '#FFFFFF',
        spokenColor: '#AAAAAA',
        firstWordAccent: false,
        strokeColor: '#000000',
        strokeWidth: 2,
        backgroundBox: false,
        animation: 'fade',
        uppercase: false,
        maxWordsPerLine: 3,
    },
    hacker: {
        font: 'mono',
        fontSize: 20,
        primaryColor: '#00FF41',
        activeColor: '#FFFFFF',
        spokenColor: '#007A1F',
        firstWordAccent: false,
        strokeColor: 'transparent',
        strokeWidth: 0,
        backgroundBox: false,
        glow: true,
        animation: 'none',
        uppercase: false,
        maxWordsPerLine: 3,
    },
};
exports.IMAGE_COUNT = {
    '30s': { min: 10, max: 12, default: 11 },
    '60s': { min: 18, max: 22, default: 20 },
    '90s': { min: 26, max: 30, default: 28 },
};
exports.PLATFORM_COLORS = {
    tiktok: '#00F2EA',
    instagram: '#E1306C',
    youtube: '#FF0000',
    x: '#FFFFFF',
};
