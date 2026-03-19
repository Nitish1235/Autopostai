export type Plan = 'free' | 'starter' | 'pro' | 'creator_max'

export type VideoStatus =
  | 'pending'
  | 'generating_script'
  | 'generating_images'
  | 'generating_voice'
  | 'rendering'
  | 'ready'
  | 'scheduled'
  | 'posted'
  | 'failed'

export type Platform = 'tiktok' | 'instagram' | 'youtube' | 'x'

export type PlatformStatus = 'posted' | 'pending' | 'failed' | 'skipped'

export type VideoFormat = '10s' | '15s' | '30s' | '60s' | '90s'

export type ImageStyle =
  | 'cinematic'
  | 'anime'
  | 'dark_fantasy'
  | 'cyberpunk'
  | 'documentary'
  | 'vintage'
  | '3d_render'
  | 'minimal'

export type MusicMood = 'upbeat' | 'dark' | 'motivational' | 'calm' | 'mystery'

export type GenerationMode = 'image_stack' | 'ai_video'
export type AiAudioMode = 'keep_ai' | 'replace'

export type ApprovalMode = 'review' | 'autopilot'

export type SubtitleFont =
  | 'impact'
  | 'inter'
  | 'bebas'
  | 'caveat'
  | 'playfair'
  | 'mono'
  | 'nunito'
  | 'barlow'
  | 'cormorant'
  | 'marker'

export type SubtitleAnimation =
  | 'none'
  | 'pop'
  | 'slideUp'
  | 'fade'
  | 'bounce'
  | 'blur'

export interface User {
  id: string
  email: string
  name: string
  image?: string
  plan: Plan
  credits: number
  creditsUsed: number
  creditsReset: Date
  aiVideoCredits: number
  aiVideoCreditsUsed: number
  createdAt: Date
}

export interface Video {
  id: string
  userId: string
  title: string
  topic: string
  status: VideoStatus
  format: VideoFormat
  imageStyle: ImageStyle
  voiceId: string
  musicMood: MusicMood
  subtitleConfig: SubtitleConfig
  generationMode: GenerationMode
  aiVideoPrompt?: string
  aiVideoUrl?: string
  aiAudioMode?: AiAudioMode
  aiRawAudioUrl?: string
  script?: ScriptSegment[]
  imageUrls?: string[]
  audioUrl?: string
  videoUrl?: string
  thumbnailUrl?: string
  platforms: Platform[]
  publishedPlatforms: Platform[]
  platformStatuses: Partial<Record<Platform, PlatformStatus>>
  scheduledAt?: Date
  postedAt?: Date
  analytics?: VideoAnalytics
  creditsUsed: number
  createdAt: Date
  updatedAt: Date
}

export interface AiVideoJob {
  videoId: string
  userId: string
  topic: string
  niche: string
  imageStyle: string
  format: string
  aiAudioMode: AiAudioMode
  voiceId?: string
  voiceSpeed?: number
  musicMood?: string
  musicVolume?: number
  subtitleConfig?: Record<string, unknown>
}

export interface ScriptSegment {
  id: string
  order: number
  narration: string
  imagePrompt: string
  duration?: number
  imageUrl?: string
  audioUrl?: string
  wordTimestamps?: WordTimestamp[]
}

export interface WordTimestamp {
  word: string
  start: number
  end: number
  startFrame: number
  endFrame: number
}

export interface SubtitleConfig {
  font: SubtitleFont
  fontSize: number
  primaryColor: string
  activeColor: string
  spokenColor: string
  firstWordAccent: boolean
  accentColor: string
  strokeColor: string
  strokeWidth: number
  backgroundBox: boolean
  bgColor: string
  bgOpacity: number
  bgRadius: number
  shadow: boolean
  glow: boolean
  animation: SubtitleAnimation
  animationDuration: number
  position: number
  alignment: 'left' | 'center' | 'right'
  maxWordsPerLine: 1 | 2 | 3
  uppercase: boolean
}

export interface VideoAnalytics {
  totalViews: number
  totalLikes: number
  watchRate: number
  platformBreakdown: Record<Platform, PlatformStats>
}

export interface PlatformStats {
  views: number
  likes: number
  shares: number
  followers: number
}

export interface PlatformConnection {
  id: string
  userId: string
  platform: Platform
  handle: string
  accessToken: string
  refreshToken?: string
  tokenExpiry?: Date
  connected: boolean
  autoPost: boolean
  dailyLimit: number
  postWindow: string
}

export interface AutopilotConfig {
  id: string
  userId: string
  enabled: boolean
  niche: string
  format: VideoFormat
  postsPerDay: number
  imageStyle: ImageStyle
  voiceId: string
  musicMood: MusicMood
  approvalMode: ApprovalMode
  schedule: WeeklySchedule
  subtitleConfig: SubtitleConfig
}

export interface WeeklySchedule {
  monday: ScheduleSlot[]
  tuesday: ScheduleSlot[]
  wednesday: ScheduleSlot[]
  thursday: ScheduleSlot[]
  friday: ScheduleSlot[]
  saturday: ScheduleSlot[]
  sunday: ScheduleSlot[]
}

export interface ScheduleSlot {
  time: string
  platform: Platform
  enabled: boolean
}

export interface TopicQueue {
  id: string
  userId: string
  topic: string
  niche: string
  order: number
  status: 'pending' | 'generating' | 'done' | 'failed'
  videoId?: string
  scheduledFor?: Date
  createdAt: Date
}

export interface CreditPack {
  id: string
  credits: number
  price: number
  label: string
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
