// ── YouTube Data API v3 & OAuth2 ─────────────────────
// Uses Google OAuth directly (no googleapis npm package needed)

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3'
const YOUTUBE_UPLOAD = 'https://www.googleapis.com/upload/youtube/v3'
const YOUTUBE_ANALYTICS = 'https://youtubeanalytics.googleapis.com/v2'

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID ?? ''
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET ?? ''
const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI ?? ''

// ── OAuth ─────────────────────────────────────────────

/** Build the Google OAuth2 authorization URL */
export function getYouTubeAuthUrl(state: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',         // Always return refresh_token
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export interface YouTubeTokens {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

/** Exchange auth code for access + refresh tokens */
export async function exchangeYouTubeCode(code: string): Promise<YouTubeTokens> {
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`YouTube token exchange failed: ${err}`)
  }

  const data = await res.json() as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  if (!data.refresh_token) {
    throw new Error('No refresh_token returned. Revoke app access in Google Account and try again.')
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  }
}

/** Refresh an expired access token using the stored refresh token */
export async function refreshYouTubeToken(refreshToken: string): Promise<{
  accessToken: string
  expiresAt: Date
}> {
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`YouTube token refresh failed: ${err}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  }
}

// ── Channel Info ──────────────────────────────────────

export interface YouTubeChannelInfo {
  channelId: string
  title: string
  handle: string
  thumbnailUrl: string | null
}

/** Returns the authenticated user's YouTube channel info */
export async function getYouTubeChannelInfo(accessToken: string): Promise<YouTubeChannelInfo> {
  const res = await fetch(
    `${YOUTUBE_API}/channels?part=snippet&mine=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!res.ok) throw new Error(`Failed to fetch YouTube channel info: ${res.status}`)
  const data = await res.json()
  const channel = data.items?.[0]
  if (!channel) throw new Error('No YouTube channel found for this Google account')

  return {
    channelId: channel.id,
    title: channel.snippet?.title ?? 'YouTube Channel',
    handle: channel.snippet?.customUrl ?? channel.id,
    thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? null,
  }
}

// ── Video Upload ──────────────────────────────────────

export interface YouTubeUploadParams {
  accessToken: string
  videoUrl: string       // Public video URL to fetch from (GCS)
  title: string
  description: string
  tags: string[]
  privacyStatus?: 'public' | 'private' | 'unlisted'
}

/**
 * Upload a video to YouTube.
 * Step 1: Fetch the video buffer from GCS/CDN
 * Step 2: POST to YouTube resumable upload endpoint
 * Returns the YouTube video ID (used for analytics)
 */
export async function uploadVideoToYouTube(params: YouTubeUploadParams): Promise<string> {
  const {
    accessToken,
    videoUrl,
    title,
    description,
    tags,
    privacyStatus = 'public',
  } = params

  // Step 1: Download video buffer
  const videoRes = await fetch(videoUrl)
  if (!videoRes.ok) throw new Error(`Failed to fetch video from ${videoUrl}`)
  const videoBuffer = await videoRes.arrayBuffer()
  const contentLength = videoBuffer.byteLength

  // Step 2: Initiate resumable upload session
  const metadata = JSON.stringify({
    snippet: {
      title: title.slice(0, 100),
      description: description.slice(0, 5000),
      tags: tags.slice(0, 500),
      categoryId: '22', // People & Blogs — safe default for short-form content
    },
    status: {
      privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  })

  const initRes = await fetch(
    `${YOUTUBE_UPLOAD}/videos?uploadType=resumable&part=snippet,status`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(contentLength),
      },
      body: metadata,
    }
  )

  if (!initRes.ok) {
    const errText = await initRes.text()
    throw new Error(`YouTube upload init failed (${initRes.status}): ${errText}`)
  }

  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) throw new Error('YouTube did not return upload URL')

  // Step 3: Upload the actual video bytes
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(contentLength),
    },
    body: videoBuffer,
  })

  if (!uploadRes.ok && uploadRes.status !== 201) {
    const errText = await uploadRes.text()
    throw new Error(`YouTube video upload failed (${uploadRes.status}): ${errText}`)
  }

  const uploadData = await uploadRes.json()
  const ytVideoId = uploadData.id
  if (!ytVideoId) throw new Error('YouTube did not return a video ID after upload')

  console.log(`[youtube] Uploaded video: https://youtube.com/watch?v=${ytVideoId}`)
  return ytVideoId
}

// ── Analytics ─────────────────────────────────────────

export interface YouTubeVideoStats {
  views: number
  likes: number
  comments: number
  shares: number
  watchRate: number   // 0-100 average view percentage
}

/**
 * Get analytics for a specific YouTube video.
 * Uses the YouTube Analytics API v2.
 */
export async function getYouTubeVideoAnalytics(params: {
  accessToken: string
  ytVideoId: string
  channelId: string
}): Promise<YouTubeVideoStats> {
  const { accessToken, ytVideoId, channelId } = params

  // YouTube Analytics API needs a date range
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const analyticsParams = new URLSearchParams({
    ids: `channel==${channelId}`,
    startDate,
    endDate,
    metrics: 'views,likes,comments,shares,averageViewPercentage',
    filters: `video==${ytVideoId}`,
    dimensions: 'video',
  })

  const res = await fetch(`${YOUTUBE_ANALYTICS}/reports?${analyticsParams}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`YouTube Analytics API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  // rows[0] = [videoId, views, likes, comments, shares, avgViewPct]
  const row = data.rows?.[0]
  if (!row) {
    // Video has no data yet (just uploaded)
    return { views: 0, likes: 0, comments: 0, shares: 0, watchRate: 0 }
  }

  return {
    views: row[1] ?? 0,
    likes: row[2] ?? 0,
    comments: row[3] ?? 0,
    shares: row[4] ?? 0,
    watchRate: row[5] ?? 0,
  }
}

/**
 * Get the upload count stats from Data API (lightweight, no analytics scope needed)
 * Used as a fallback when analytics API isn't available.
 */
export async function getYouTubeVideoStats(params: {
  accessToken: string
  ytVideoId: string
}): Promise<YouTubeVideoStats> {
  const res = await fetch(
    `${YOUTUBE_API}/videos?part=statistics&id=${params.ytVideoId}`,
    { headers: { Authorization: `Bearer ${params.accessToken}` } }
  )

  if (!res.ok) throw new Error(`YouTube Data API stats error: ${res.status}`)
  const data = await res.json()
  const stats = data.items?.[0]?.statistics

  return {
    views: Number(stats?.viewCount ?? 0),
    likes: Number(stats?.likeCount ?? 0),
    comments: Number(stats?.commentCount ?? 0),
    shares: 0, // YouTube Data API doesn't expose shares
    watchRate: 0,
  }
}
