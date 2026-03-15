// ── Image Prompt Builder ─────────────────────────────

export const STYLE_SUFFIXES: Record<string, string> = {
  cinematic:
    'anamorphic lens, teal-orange color grade, film grain overlay, shallow depth of field, golden hour rim lighting, shot on ARRI Alexa, 8K ultra-detailed, photorealistic',
  anime:
    'studio ghibli art style, soft watercolor textures, pastel color palette, hand-drawn line art, expressive character design, anime illustration, detailed background art',
  dark_fantasy:
    'dramatic chiaroscuro lighting, god rays, volumetric fog, dark oil painting style, fantasy concept art, epic scale, moody atmosphere, highly detailed digital painting',
  cyberpunk:
    'neon lights reflecting on wet streets, RGB color split, holographic elements, blade runner aesthetic, futuristic megacity, high contrast, cinematic lighting, 8K',
  documentary:
    'handheld camera feel, natural ambient light, slightly desaturated, photojournalism style, candid real-world photography, film texture, editorial quality',
  vintage:
    'kodachrome film photography, faded warm tones, light leak artifacts, analog grain, 1970s color palette, sun-drenched, nostalgic mood, vintage magazine quality',
  '3d_render':
    'octane render, physically based rendering, subsurface scattering, studio three-point lighting, cinema 4D quality, clean modern aesthetic, photorealistic 3D, 8K render',
  minimal:
    'minimalist composition, generous negative space, soft even lighting, muted modern palette, architectural photography style, ultra-clean, editorial fashion photography',
}

export const NEGATIVE_PROMPT: string =
  'blurry, out of focus, low quality, watermark, text overlay, words, letters, signature, logo, extra limbs, deformed hands, ugly face, duplicate, bad anatomy, cartoon when not requested, childish, stock photo watermark, oversaturated, overexposed, amateur phone camera, nsfw, violence, gore, political figures'

export const STYLE_NEGATIVES: Record<string, string> = {
  cinematic: 'flat lighting, amateur, phone camera, cartoon',
  anime: 'realistic, photographic, 3D render, western cartoon',
  dark_fantasy: 'bright cheerful colors, daytime, modern setting',
  cyberpunk: 'nature, medieval, bright daylight, desaturated',
  documentary: 'studio lighting, artificial, over-edited, fantasy',
  vintage: 'modern, digital, clean, oversaturated, neon',
  '3d_render': 'painterly, sketch, 2D flat, blurry, anime',
  minimal: 'cluttered, busy, dark, dramatic, fantasy elements',
}

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
]

const TIME_BANK = [
  'golden hour warm light',
  'blue hour twilight',
  'harsh midday sunlight',
  'overcast soft diffused light',
  'midnight darkness with artificial lights',
  'dawn first light',
  'magic hour sunset',
  'stormy dramatic sky',
]

const ATMOSPHERE_BANK = [
  'clear crisp air',
  'light morning fog',
  'heavy atmospheric haze',
  'light rain drops on surfaces',
  'snow falling gently',
  'heat shimmer in distance',
  'dramatic storm clouds approaching',
  'golden dust particles in light',
]

export function getVariationModifiers(seed: number, imageStyle?: string): string {
  // Anime/illustrated styles get anime-specific composition, not photographic terms
  if (imageStyle === 'anime') {
    const ANIME_COMPOSITION = [
      'dynamic composition',
      'detailed background scenery',
      'dramatic perspective',
      'split lighting',
      'sakura petals floating',
      'wind-swept hair',
      'lens flare highlights',
      'soft bokeh background',
    ]
    const ANIME_MOOD = [
      'warm sunset tones',
      'cool blue twilight',
      'vibrant spring colors',
      'moody rain atmosphere',
      'golden morning light',
      'starry night sky',
      'misty mountain scenery',
      'cherry blossom season',
    ]
    const comp = ANIME_COMPOSITION[seed % ANIME_COMPOSITION.length]
    const mood = ANIME_MOOD[seed % ANIME_MOOD.length]
    return `${comp}, ${mood}`
  }

  const angleIndex = seed % ANGLE_BANK.length
  const timeIndex = seed % TIME_BANK.length
  const atmosphereIndex = seed % ATMOSPHERE_BANK.length

  const angle = ANGLE_BANK[angleIndex]
  const time = TIME_BANK[timeIndex]
  const atmosphere = ATMOSPHERE_BANK[atmosphereIndex]

  return `${angle}, ${time}, ${atmosphere}`
}

export function buildImagePrompt(
  basePrompt: string,
  imageStyle: string,
  variationSeed?: number
): string {
  const styleSuffix = STYLE_SUFFIXES[imageStyle] ?? STYLE_SUFFIXES.cinematic
  const variationModifiers = getVariationModifiers(variationSeed ?? 0, imageStyle)
  return `${basePrompt}, ${styleSuffix}, ${variationModifiers}`
}

export function buildAspectRatioParams(platform: string): {
  width: number
  height: number
} {
  switch (platform) {
    case 'tiktok':
    case 'instagram':
    case 'youtube_shorts':
      return { width: 1024, height: 1792 }
    case 'youtube':
      return { width: 1792, height: 1024 }
    case 'instagram_feed':
      return { width: 1024, height: 1024 }
    default:
      return { width: 1024, height: 1792 }
  }
}
