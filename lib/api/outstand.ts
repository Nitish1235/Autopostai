// ── Outstand API — TikTok, Instagram, X Publishing ───

import axios from 'axios'

const BASE_URL = 'https://api.outstand.io/v1'
const API_KEY = process.env.OUTSTAND_API_KEY!

// ── Interfaces ───────────────────────────────────────

interface OutstandPostResult {
  postId: string
  platform: string
  url: string
  status: string
}

interface OutstandAccountInfo {
  platform: string
  handle: string
  displayName: string
  followerCount: number
  avatarUrl: string
}

// ── HTTP Helper ──────────────────────────────────────

async function outstandFetch<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<T> {
  try {
    const response = await axios({
      url: `${BASE_URL}${endpoint}`,
      method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: body,
      timeout: 60000,
    })
    return response.data as T
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 'unknown'
      const data = error.response?.data
      const message =
        typeof data === 'object' && data && 'message' in data
          ? String((data as { message: string }).message)
          : `HTTP ${status}`
      throw new Error(`Outstand API error: ${message}`)
    }
    throw error
  }
}

// ── Connect Account ──────────────────────────────────

export async function connectAccount(params: {
  platform: 'tiktok' | 'instagram' | 'x'
  accessToken: string
  refreshToken?: string
}): Promise<OutstandAccountInfo> {
  return outstandFetch<OutstandAccountInfo>('/accounts/connect', 'POST', {
    platform: params.platform,
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
  })
}

// ── Post Video ───────────────────────────────────────

export async function postVideo(params: {
  platform: 'tiktok' | 'instagram' | 'x'
  accessToken: string
  videoUrl: string
  caption: string
  hashtags: string[]
  thumbnailUrl?: string
}): Promise<OutstandPostResult> {
  const fullCaption =
    params.caption +
    '\n\n' +
    params.hashtags.map((t) => `#${t}`).join(' ')

  return outstandFetch<OutstandPostResult>('/posts/video', 'POST', {
    platform: params.platform,
    accessToken: params.accessToken,
    videoUrl: params.videoUrl,
    caption: fullCaption,
    thumbnailUrl: params.thumbnailUrl,
  })
}

// ── Post to Multiple Platforms ───────────────────────

export async function postToMultiplePlatforms(params: {
  platforms: Array<{
    platform: 'tiktok' | 'instagram' | 'x'
    accessToken: string
  }>
  videoUrl: string
  caption: string
  hashtags: string[]
  thumbnailUrl?: string
}): Promise<OutstandPostResult[]> {
  const results: OutstandPostResult[] = []

  const settled = await Promise.allSettled(
    params.platforms.map((plat) =>
      postVideo({
        platform: plat.platform,
        accessToken: plat.accessToken,
        videoUrl: params.videoUrl,
        caption: params.caption,
        hashtags: params.hashtags,
        thumbnailUrl: params.thumbnailUrl,
      })
    )
  )

  for (let i = 0; i < settled.length; i++) {
    const result = settled[i]
    if (result.status === 'fulfilled') {
      results.push(result.value)
    } else {
      console.error(
        `[outstand] Failed to post to ${params.platforms[i].platform}:`,
        result.reason
      )
    }
  }

  return results
}

// ── Get Post Analytics ───────────────────────────────

export async function getPostAnalytics(params: {
  platform: string
  postId: string
  accessToken: string
}): Promise<{
  views: number
  likes: number
  shares: number
  comments: number
  watchRate: number
}> {
  return outstandFetch(
    `/posts/${params.postId}/analytics?platform=${params.platform}`,
    'GET'
  )
}

// ── Refresh Access Token ─────────────────────────────

export async function refreshAccessToken(params: {
  platform: string
  refreshToken: string
}): Promise<{ accessToken: string; expiresIn: number }> {
  return outstandFetch('/accounts/refresh', 'POST', {
    platform: params.platform,
    refreshToken: params.refreshToken,
  })
}
