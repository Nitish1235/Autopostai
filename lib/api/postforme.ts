// ── PostForMe API — Unified Social Media Publishing ───

import axios from 'axios'

const BASE_URL = 'https://api.postforme.dev/v1'
// Note: We'll retrieve this from env, but let it fail gracefully if undefined early on
// while the user is setting up their account
const API_KEY = process.env.POSTFORME_API_KEY || ''

// ── Interfaces ───────────────────────────────────────

export interface PostForMePostResult {
    id: string
    platform: string
    url: string
    status: string
}

export interface PostForMeAccountInfo {
    platform: string
    handle: string
    displayName: string
    followerCount: number
    avatarUrl: string
}

// ── HTTP Helper ──────────────────────────────────────

async function postForMeFetch<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    body?: unknown
): Promise<T> {
    if (!API_KEY) {
        throw new Error('POSTFORME_API_KEY is not defined in environment variables')
    }

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
            throw new Error(`PostForMe API error: ${message}`)
        }
        throw error
    }
}

// ── Connect Account ──────────────────────────────────

export async function connectAccount(params: {
    platform: 'tiktok' | 'instagram' | 'x' | string
    accessToken: string
    refreshToken?: string
}): Promise<PostForMeAccountInfo> {
    // PostForMe typically handles OAuth natively via their frontend connections,
    // but if you are doing White Label and importing tokens:
    return postForMeFetch<PostForMeAccountInfo>('/accounts/connect', 'POST', {
        platform: params.platform,
        access_token: params.accessToken,
        refresh_token: params.refreshToken,
    })
}

// ── Post Video ───────────────────────────────────────

export async function postVideo(params: {
    platform: 'tiktok' | 'instagram' | 'x' | string
    accessToken: string
    accountId?: string // Ideally PostForMe uses account IDs
    videoUrl: string
    caption: string
    hashtags: string[]
    thumbnailUrl?: string
}): Promise<PostForMePostResult> {
    const fullCaption =
        params.caption +
        '\n\n' +
        params.hashtags.map((t) => `#${t}`).join(' ')

    // We map the request to PostForMe's generic /posts endpoint
    return postForMeFetch<PostForMePostResult>('/posts', 'POST', {
        platforms: [params.platform],
        // PostForMe uses explicit account IDs or auth tokens attached to the request
        auth: {
            access_token: params.accessToken
        },
        content: {
            text: fullCaption,
            media_urls: [params.videoUrl],
        }
    })
}

// ── Post to Multiple Platforms ───────────────────────

export async function postToMultiplePlatforms(params: {
    platforms: Array<{
        platform: 'tiktok' | 'instagram' | 'x' | string
        accessToken: string
    }>
    videoUrl: string
    caption: string
    hashtags: string[]
    thumbnailUrl?: string
}): Promise<PostForMePostResult[]> {
    const results: PostForMePostResult[] = []

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
                `[postforme] Failed to post to ${params.platforms[i].platform}:`,
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
    const data = await postForMeFetch<{
        views: number;
        likes: number;
        shares: number;
        comments: number;
        metrics?: { watch_rate: number }
    }>(
        `/posts/${params.postId}/analytics?platform=${params.platform}`,
        'GET'
    )

    return {
        views: data.views || 0,
        likes: data.likes || 0,
        shares: data.shares || 0,
        comments: data.comments || 0,
        watchRate: data.metrics?.watch_rate || 0,
    }
}

// ── Refresh Access Token ─────────────────────────────

export async function refreshAccessToken(params: {
    platform: string
    refreshToken: string
}): Promise<{ accessToken: string; expiresIn: number }> {
    // Note: If using Quickstart Project, PostForMe handles refresh tokens automatically.
    // If White Label:
    return postForMeFetch('/accounts/refresh', 'POST', {
        platform: params.platform,
        refresh_token: params.refreshToken,
    })
}
