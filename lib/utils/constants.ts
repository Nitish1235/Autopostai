import type {
  ImageStyle,
  MusicMood,
  SubtitleFont,
  SubtitleAnimation,
  Platform,
  VideoFormat,
} from '@/types'

export const PLANS = {
  free: {
    id: 'free' as const,
    name: 'Free Trial',
    price: 0,
    credits: 1,
    aiVideoCredits: 0,
    postsPerDay: 1,
    features: [
      '1 free trial video',
      'Test out the generation process',
      'Limited voice & style options',
    ],
  },
  starter: {
    id: 'starter' as const,
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
      '15s / 30s / 60s / 90s formats',
      'Smart subtitles',
      'TikTok + Instagram + YouTube + X',
      'Basic analytics',
    ],
  },
  pro: {
    id: 'pro' as const,
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
    id: 'creator_max' as const,
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
} as const

// ── AI Video Constants ───────────────────────────────

export const AI_VIDEO_LIMITS: Record<string, number> = {
  starter: 20,
  pro: 50,
  creator_max: 150,
}

export const AI_VIDEO_DURATION = {
  min: 10,
  max: 15,
  default: 12,
} as const

export const CRUN_AI_MODELS = {
  sora2: 'sora-2',
  sora2Pro: 'sora-2',
} as const

// Plan tier ranking for upgrade/downgrade comparison
export const PLAN_TIER: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  creator_max: 3,
}

export const CREDIT_PACKS = [
  { id: 'pack_10', credits: 10, price: 9, label: '10 Videos' },
  { id: 'pack_25', credits: 25, price: 20, label: '25 Videos' },
  { id: 'pack_50', credits: 50, price: 35, label: '50 Videos' },
] as const

export const IMAGE_STYLES: {
  id: ImageStyle
  label: string
  suffix: string
}[] = [
    {
      id: 'cinematic',
      label: 'Cinematic Film',
      suffix:
        'anamorphic lens, teal-orange color grade, film grain, ARRI Alexa, 8K, photorealistic',
    },
    {
      id: 'anime',
      label: 'Anime / Illustrated',
      suffix:
        'studio ghibli style, soft watercolor, pastel palette, hand-drawn, anime art',
    },
    {
      id: 'dark_fantasy',
      label: 'Dark Fantasy',
      suffix:
        'dramatic shadows, god rays, volumetric fog, dark oil painting, fantasy art',
    },
    {
      id: 'cyberpunk',
      label: 'Cyberpunk',
      suffix:
        'neon lights, rain-slicked streets, RGB glow, blade runner aesthetic, futuristic',
    },
    {
      id: 'documentary',
      label: 'Documentary',
      suffix:
        'handheld camera, natural light, desaturated, photojournalism, real world',
    },
    {
      id: 'vintage',
      label: 'Vintage Film',
      suffix:
        'kodachrome film, faded colors, light leak, 1970s grain, warm tones',
    },
    {
      id: '3d_render',
      label: '3D Render',
      suffix:
        'octane render, subsurface scattering, studio lighting, cinema 4D, clean 3D',
    },
    {
      id: 'minimal',
      label: 'Minimal Clean',
      suffix:
        'minimalist, clean composition, soft light, white space, modern photography',
    },
  ]

export const NEGATIVE_PROMPT =
  'blurry, out of focus, low quality, watermark, text, signature, ' +
  'extra limbs, deformed hands, ugly, duplicate, bad anatomy, ' +
  'cartoon, childish, stock photo, oversaturated, overexposed, ' +
  'amateur, nsfw, violence'

// ── UnrealSpeech V8 Voice IDs ────────────────────────────────────────────
// API base: https://api.v8.unrealspeech.com
// V8 supports 48 voices across 8 languages.
// VoiceId = the exact string to pass to the API (case-sensitive).
// Note: V7 voices (Dan, Will, Scarlett, Liv, Amy) are NOT used — we target V8.

export const VOICES: {
  id: string
  name: string
  gender: 'Male' | 'Female'
  accent: string
  tags: string[]
  language: string
  unrealId: string  // Actual VoiceId to send to UnrealSpeech V8 API
}[] = [
    // ── American Female ────────────────────────────────
    { id: 'Autumn', name: 'Autumn', gender: 'Female', accent: 'American', tags: ['Warm', 'Friendly'], language: 'English', unrealId: 'Autumn' },
    { id: 'Melody', name: 'Melody', gender: 'Female', accent: 'American', tags: ['Sweet', 'Youthful'], language: 'English', unrealId: 'Melody' },
    { id: 'Hannah', name: 'Hannah', gender: 'Female', accent: 'American', tags: ['Clear', 'Professional'], language: 'English', unrealId: 'Hannah' },
    { id: 'Emily', name: 'Emily', gender: 'Female', accent: 'American', tags: ['Calm', 'Storytelling'], language: 'English', unrealId: 'Emily' },
    { id: 'Ivy', name: 'Ivy', gender: 'Female', accent: 'American', tags: ['Crisp', 'Energetic'], language: 'English', unrealId: 'Ivy' },
    { id: 'Kaitlyn', name: 'Kaitlyn', gender: 'Female', accent: 'American', tags: ['Soft', 'Relaxing'], language: 'English', unrealId: 'Kaitlyn' },
    { id: 'Luna', name: 'Luna', gender: 'Female', accent: 'American', tags: ['Dreamy', 'Gentle'], language: 'English', unrealId: 'Luna' },
    { id: 'Lauren', name: 'Lauren', gender: 'Female', accent: 'American', tags: ['Authoritative', 'Bold'], language: 'English', unrealId: 'Lauren' },
    { id: 'Sierra', name: 'Sierra', gender: 'Female', accent: 'American', tags: ['Natural', 'Casual'], language: 'English', unrealId: 'Sierra' },
    // ── American Male ──────────────────────────────────
    { id: 'Noah', name: 'Noah', gender: 'Male', accent: 'American', tags: ['Deep', 'Authoritative'], language: 'English', unrealId: 'Noah' },
    { id: 'Jasper', name: 'Jasper', gender: 'Male', accent: 'American', tags: ['Warm', 'Engaging'], language: 'English', unrealId: 'Jasper' },
    { id: 'Caleb', name: 'Caleb', gender: 'Male', accent: 'American', tags: ['Energetic', 'Youthful'], language: 'English', unrealId: 'Caleb' },
    { id: 'Ronan', name: 'Ronan', gender: 'Male', accent: 'American', tags: ['Dramatic', 'Narrative'], language: 'English', unrealId: 'Ronan' },
    { id: 'Zane', name: 'Zane', gender: 'Male', accent: 'American', tags: ['Cool', 'Modern'], language: 'English', unrealId: 'Zane' },
    // ── French Female ──────────────────────────────────
    { id: 'Élodie', name: 'Élodie', gender: 'Female', accent: 'French', tags: ['Elegant', 'Refined'], language: 'French', unrealId: 'Élodie' },
    // ── Spanish ────────────────────────────────────────
    { id: 'Mateo', name: 'Mateo', gender: 'Male', accent: 'Spanish', tags: ['Deep', 'Natural'], language: 'Spanish', unrealId: 'Mateo' },
    { id: 'Javier', name: 'Javier', gender: 'Male', accent: 'Spanish', tags: ['Smooth', 'Clear'], language: 'Spanish', unrealId: 'Javier' },
    // ── Portuguese ─────────────────────────────────────
    { id: 'Camila', name: 'Camila', gender: 'Female', accent: 'Portuguese', tags: ['Friendly', 'Warm'], language: 'Portuguese', unrealId: 'Camila' },
    { id: 'Thiago', name: 'Thiago', gender: 'Male', accent: 'Portuguese', tags: ['Engaging', 'Natural'], language: 'Portuguese', unrealId: 'Thiago' },
    { id: 'Rafael', name: 'Rafael', gender: 'Male', accent: 'Portuguese', tags: ['Confident', 'Clear'], language: 'Portuguese', unrealId: 'Rafael' },
    // ── Italian ────────────────────────────────────────
    { id: 'Giulia', name: 'Giulia', gender: 'Female', accent: 'Italian', tags: ['Expressive', 'Melodic'], language: 'Italian', unrealId: 'Giulia' },
    { id: 'Luca', name: 'Luca', gender: 'Male', accent: 'Italian', tags: ['Warm', 'Storytelling'], language: 'Italian', unrealId: 'Luca' },
    // ── Hindi ──────────────────────────────────────────
    { id: 'Ananya', name: 'Ananya', gender: 'Female', accent: 'Hindi', tags: ['Clear', 'Professional'], language: 'Hindi', unrealId: 'Ananya' },
    { id: 'Priya', name: 'Priya', gender: 'Female', accent: 'Hindi', tags: ['Soft', 'Calm'], language: 'Hindi', unrealId: 'Priya' },
    { id: 'Arjun', name: 'Arjun', gender: 'Male', accent: 'Hindi', tags: ['Authoritative', 'Bold'], language: 'Hindi', unrealId: 'Arjun' },
    { id: 'Rohan', name: 'Rohan', gender: 'Male', accent: 'Hindi', tags: ['Friendly', 'Youthful'], language: 'Hindi', unrealId: 'Rohan' },
    // ── Chinese ────────────────────────────────────────
    { id: 'Mei', name: 'Mei', gender: 'Female', accent: 'Chinese', tags: ['Clear', 'Gentle'], language: 'Chinese', unrealId: 'Mei' },
    { id: 'Lian', name: 'Lian', gender: 'Female', accent: 'Chinese', tags: ['Warm', 'Natural'], language: 'Chinese', unrealId: 'Lian' },
    { id: 'Ting', name: 'Ting', gender: 'Female', accent: 'Chinese', tags: ['Crisp', 'Modern'], language: 'Chinese', unrealId: 'Ting' },
    { id: 'Jing', name: 'Jing', gender: 'Female', accent: 'Chinese', tags: ['Soft', 'Elegant'], language: 'Chinese', unrealId: 'Jing' },
    { id: 'Wei', name: 'Wei', gender: 'Male', accent: 'Chinese', tags: ['Deep', 'Professional'], language: 'Chinese', unrealId: 'Wei' },
    { id: 'Jian', name: 'Jian', gender: 'Male', accent: 'Chinese', tags: ['Confident', 'Clear'], language: 'Chinese', unrealId: 'Jian' },
    { id: 'Hao', name: 'Hao', gender: 'Male', accent: 'Chinese', tags: ['Engaging', 'Warm'], language: 'Chinese', unrealId: 'Hao' },
    { id: 'Sheng', name: 'Sheng', gender: 'Male', accent: 'Chinese', tags: ['Bold', 'Narrative'], language: 'Chinese', unrealId: 'Sheng' },
    // ── Japanese ───────────────────────────────────────
    { id: 'Yuki', name: 'Yuki', gender: 'Female', accent: 'Japanese', tags: ['Soft', 'Natural'], language: 'Japanese', unrealId: 'Yuki' },
    { id: 'Haruto', name: 'Haruto', gender: 'Male', accent: 'Japanese', tags: ['Clear', 'Professional'], language: 'Japanese', unrealId: 'Haruto' },
  ]

export const MUSIC_MOODS: {
  id: MusicMood
  label: string
  emoji: string
  desc: string
}[] = [
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
  ]

export const NICHES: {
  id: string
  label: string
  emoji: string
}[] = [
    { id: 'custom', label: 'Custom / Any Topic', emoji: '✨' },
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
  ]

export const SUBTITLE_FONTS: {
  id: SubtitleFont
  label: string
  family: string
}[] = [
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
  ]

export const SUBTITLE_PRESETS: Record<
  string,
  {
    font: SubtitleFont
    fontSize: number
    primaryColor: string
    activeColor: string
    spokenColor: string
    firstWordAccent: boolean
    strokeColor: string
    strokeWidth: number
    backgroundBox: boolean
    bgColor?: string
    bgOpacity?: number
    animation: SubtitleAnimation
    uppercase: boolean
    maxWordsPerLine: 1 | 2 | 3
    glow?: boolean
  }
> = {
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
}

export const IMAGE_COUNT: Record<
  VideoFormat,
  { min: number; max: number; default: number }
> = {
  '15s': { min: 4, max: 6, default: 5 },
  '30s': { min: 10, max: 12, default: 11 },
  '60s': { min: 18, max: 22, default: 20 },
  '90s': { min: 26, max: 30, default: 28 },
}

export const PLATFORM_COLORS: Record<Platform, string> = {
  tiktok: '#00F2EA',
  instagram: '#E1306C',
  youtube: '#FF0000',
  x: '#FFFFFF',
}
