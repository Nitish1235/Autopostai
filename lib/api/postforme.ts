// ── PostForMe API — Unified Social Media Publishing ───
// Docs: https://postforme.dev
// API Base: https://api.postforme.dev/v1

import axios from 'axios'

const BASE_URL = 'https://api.postforme.dev/v1'
const API_KEY = process.env.POSTFORME_API_KEY || ''

// ── Interfaces ───────────────────────────────────────

// Matches SocialPostResultDto from the PostForMe OpenAPI spec
// This is returned per published account from /v1/social-post-results
export interface PostForMePostResult {
    id: string                        // PostForMe result ID
    social_account_id: string        // spc_xxx ID
    post_id: string
    success: boolean
    error?: unknown
    platform_data?: {
        id?: string                   // Platform-specific post ID
        url?: string                  // URL of the published content
    }
}

// Matches SocialAccountDto from the PostForMe OpenAPI spec
export interface PostForMeSocialAccount {
    id: string
    platform: string
    username: string | null       // The platform's username (nullable per spec)
    user_id: string               // The platform's internal user ID
    profile_photo_url: string | null  // Profile photo URL (nullable per spec)
    status: 'connected' | 'disconnected'
    external_id: string | null
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

// ── List Connected Social Accounts ───────────────────
// GET /v1/social-accounts
// Returns all connected accounts for your project

export async function listSocialAccounts(platform?: string): Promise<PostForMeSocialAccount[]> {
    const query = platform ? `?platform=${platform}` : ''
    const data = await postForMeFetch<{ data: PostForMeSocialAccount[] }>(
        `/social-accounts${query}`,
        'GET'
    )
    return data.data
}

// ── Generate Auth URL for Account Connection ─────────
// POST /v1/social-accounts/auth-url
// Returns a URL that takes the user to the platform's login

export async function getAuthUrl(platform: string): Promise<string> {
    const data = await postForMeFetch<{ url?: string; auth_url?: string }>(
        '/social-accounts/auth-url',
        'POST',
        { platform }
    )
    return data.url || data.auth_url || ''
}

// ── Create Social Post (single platform) ─────────────
// POST /v1/social-posts
// Publishes content to one or more connected social accounts

export async function postVideo(params: {
    socialAccountId: string
    videoUrl: string
    caption: string
    hashtags: string[]
}): Promise<PostForMePostResult> {
    const fullCaption =
        params.caption +
        '\n\n' +
        params.hashtags.map((t) => `#${t}`).join(' ')

    return postForMeFetch<PostForMePostResult>('/social-posts', 'POST', {
        social_accounts: [params.socialAccountId],
        caption: fullCaption,
        media: [{ url: params.videoUrl }],
    })
}

// ── Post to Multiple Platforms ───────────────────────
// Sends all accounts in ONE call to POST /v1/social-posts
// Returns one result object per platform for the publisher to track

export interface PostPublishResult {
    platform: string
    postId: string     // PostForMe post ID (sp_ prefix)
    success: boolean
    url?: string
}

export async function postToMultiplePlatforms(params: {
    platforms: Array<{
        platform: string
        socialAccountId: string
    }>
    videoUrl: string
    caption: string
    hashtags: string[]
}): Promise<PostPublishResult[]> {
    const fullCaption =
        params.caption +
        '\n\n' +
        params.hashtags.map((t) => `#${t}`).join(' ')

    // PostForMe supports all accounts in one POST /social-posts call
    const socialAccountIds = params.platforms.map((p) => p.socialAccountId)

    // SocialPostDto shape: { id, status, caption, social_accounts, media, ... }
    const result = await postForMeFetch<{
        id: string
        status: string
        social_accounts: Array<{ id: string; platform: string }>
    }>('/social-posts', 'POST', {
        social_accounts: socialAccountIds,
        caption: fullCaption,
        media: [{ url: params.videoUrl }],
    })

    // Map per-platform results — all accounts published in a single post
    return params.platforms.map((p) => ({
        platform: p.platform,
        postId: result.id,
        success: result.status !== 'draft',
    }))
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
        `/social-posts/${params.postId}/analytics?platform=${params.platform}`,
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
