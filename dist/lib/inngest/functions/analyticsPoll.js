"use strict";
// ── Daily Analytics Sync ─────────────────────────────
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsPoll = void 0;
const client_1 = require("@/lib/inngest/client");
const prisma_1 = require("@/lib/db/prisma");
const outstand_1 = require("@/lib/api/outstand");
const youtube_1 = require("@/lib/api/youtube");
const youtube_2 = require("@/lib/api/youtube");
// ── Analytics Poll Function ──────────────────────────
exports.analyticsPoll = client_1.inngest.createFunction({ id: 'analytics-poll', name: 'Daily Analytics Sync' }, { cron: '0 6 * * *' }, async ({ step }) => {
    // Step 1 — Find posted videos from last 30 days
    const videos = await step.run('find-posted-videos', async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return prisma_1.prisma.video.findMany({
            where: {
                status: 'posted',
                postedAt: { gte: thirtyDaysAgo },
            },
            select: {
                id: true,
                userId: true,
                publishedPlatforms: true,
                postedAt: true,
                user: {
                    select: {
                        platformConnections: {
                            where: { connected: true },
                            select: {
                                platform: true,
                                accessToken: true,
                                refreshToken: true,
                            },
                        },
                    },
                },
                analytics: {
                    select: {
                        id: true,
                        platformBreakdown: true,
                        dailyViews: true,
                    },
                },
            },
        });
    });
    // Step 2 — Sync analytics for each video
    const syncedCount = await step.run('sync-analytics', async () => {
        let synced = 0;
        for (const video of videos) {
            try {
                const platformBreakdown = video.analytics?.platformBreakdown ?? {};
                let totalViews = 0;
                let totalLikes = 0;
                let totalShares = 0;
                let totalComments = 0;
                for (const platform of video.publishedPlatforms) {
                    const connection = video.user.platformConnections.find((c) => c.platform === platform);
                    if (!connection?.accessToken)
                        continue;
                    try {
                        if (platform === 'youtube') {
                            // YouTube analytics
                            const ytAnalytics = await (0, youtube_1.getVideoAnalytics)({
                                accessToken: connection.accessToken,
                                videoId: video.id,
                            });
                            platformBreakdown[platform] = {
                                views: ytAnalytics.views,
                                likes: ytAnalytics.likes,
                                shares: 0,
                                comments: ytAnalytics.comments,
                                watchRate: 0,
                            };
                        }
                        else {
                            // TikTok, Instagram, X via Outstand
                            const postAnalytics = await (0, outstand_1.getPostAnalytics)({
                                platform,
                                postId: video.id,
                                accessToken: connection.accessToken,
                            });
                            platformBreakdown[platform] = {
                                views: postAnalytics.views,
                                likes: postAnalytics.likes,
                                shares: postAnalytics.shares,
                                comments: postAnalytics.comments,
                                watchRate: postAnalytics.watchRate,
                            };
                        }
                    }
                    catch (platError) {
                        console.error(`[analyticsPoll] Failed for ${platform}/${video.id}:`, platError);
                        continue;
                    }
                }
                // Sum totals
                for (const stats of Object.values(platformBreakdown)) {
                    totalViews += stats.views;
                    totalLikes += stats.likes;
                    totalShares += stats.shares;
                    totalComments += stats.comments;
                }
                // Update daily views time series
                const existingDaily = (video.analytics?.dailyViews ?? []);
                const today = new Date().toISOString().split('T')[0];
                const updatedDaily = [
                    ...existingDaily.filter((d) => d.date !== today),
                    { date: today, views: totalViews },
                ].slice(-30); // Keep last 30 days
                // Upsert analytics
                await prisma_1.prisma.videoAnalytics.upsert({
                    where: { videoId: video.id },
                    create: {
                        videoId: video.id,
                        totalViews,
                        totalLikes,
                        totalShares,
                        totalComments,
                        watchRate: totalViews > 0
                            ? Object.values(platformBreakdown).reduce((sum, p) => sum + p.watchRate, 0) / Object.keys(platformBreakdown).length
                            : 0,
                        platformBreakdown,
                        dailyViews: updatedDaily,
                        lastSyncedAt: new Date(),
                    },
                    update: {
                        totalViews,
                        totalLikes,
                        totalShares,
                        totalComments,
                        watchRate: totalViews > 0
                            ? Object.values(platformBreakdown).reduce((sum, p) => sum + p.watchRate, 0) / Object.keys(platformBreakdown).length
                            : 0,
                        platformBreakdown,
                        dailyViews: updatedDaily,
                        lastSyncedAt: new Date(),
                    },
                });
                synced++;
            }
            catch (videoError) {
                console.error(`[analyticsPoll] Failed syncing video ${video.id}:`, videoError);
            }
        }
        return synced;
    });
    // Step 3 — Update follower counts for connected accounts + milestone checks
    const updatedAccounts = await step.run('update-follower-counts', async () => {
        let updated = 0;
        const MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000, 500000, 1000000];
        // Get all users with connected platforms
        const connections = await prisma_1.prisma.platformConnection.findMany({
            where: { connected: true },
            select: {
                id: true,
                platform: true,
                accessToken: true,
                userId: true,
                followerCount: true,
                user: {
                    select: {
                        email: true,
                        name: true,
                        notifyMilestone: true,
                    },
                },
            },
        });
        for (const conn of connections) {
            if (!conn.accessToken)
                continue;
            try {
                let newCount = 0;
                if (conn.platform === 'youtube') {
                    const channelInfo = await (0, youtube_2.getChannelInfo)(conn.accessToken);
                    newCount = channelInfo.subscriberCount;
                }
                // TikTok, Instagram, X follower counts could be fetched
                // via Outstand API if supported — skip for now
                else {
                    continue;
                }
                const prevCount = conn.followerCount;
                await prisma_1.prisma.platformConnection.update({
                    where: { id: conn.id },
                    data: { followerCount: newCount },
                });
                updated++;
                // Check for milestone crossings
                if (conn.user.notifyMilestone && conn.user.email) {
                    for (const milestone of MILESTONES) {
                        if (prevCount < milestone && newCount >= milestone) {
                            // Dynamic import to avoid loading Resend at top-level
                            const { Resend } = await Promise.resolve().then(() => __importStar(require('resend')));
                            const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key');
                            const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://autopostai.com';
                            const formattedMilestone = milestone >= 1000000
                                ? `${(milestone / 1000000).toFixed(0)}M`
                                : `${(milestone / 1000).toFixed(0)}K`;
                            await resend.emails.send({
                                from: process.env.RESEND_FROM_EMAIL ?? 'noreply@autopostai.com',
                                to: conn.user.email,
                                subject: `🎉 You crossed ${formattedMilestone} followers on ${conn.platform}!`,
                                html: `
                      <div style="font-family: Inter, system-ui, sans-serif; background: #1C1C1E; color: #F5F5F7; padding: 48px 32px; max-width: 560px; margin: 0 auto;">
                        <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 700;">
                          🎉 Milestone reached!
                        </h2>
                        <p style="color: rgba(245,245,247,0.6); font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
                          Hey ${conn.user.name ?? 'Creator'},
                        </p>
                        <p style="color: rgba(245,245,247,0.6); font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
                          You just crossed <strong style="color: #30D158;">${milestone.toLocaleString()} followers</strong>
                          on <strong style="color: #0A84FF;">${conn.platform}</strong>! Keep up the amazing work. 🚀
                        </p>
                        <a href="${appUrl}/analytics"
                           style="display: inline-block; background: #0A84FF; color: #fff; padding: 13px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                          View Your Analytics →
                        </a>
                      </div>
                    `,
                            });
                        }
                    }
                }
            }
            catch {
                // Token expired or API error — skip
            }
        }
        return updated;
    });
    return {
        synced: syncedCount,
        followerUpdates: updatedAccounts,
        videosProcessed: videos.length,
    };
});
