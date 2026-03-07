"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAiVideoCredits = checkAiVideoCredits;
exports.deductAiVideoCredit = deductAiVideoCredit;
exports.resetMonthlyAiVideoCredits = resetMonthlyAiVideoCredits;
exports.getAiVideoLimit = getAiVideoLimit;
const prisma_1 = require("@/lib/db/prisma");
const constants_1 = require("@/lib/utils/constants");
// ── Check AI Video Credits ────────────────────────────
async function checkAiVideoCredits(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            aiVideoCredits: true,
            aiVideoCreditsUsed: true,
            plan: true,
        },
    });
    if (!user) {
        throw new Error(`User not found: ${userId}`);
    }
    return {
        hasCredits: user.aiVideoCredits > 0,
        credits: user.aiVideoCredits,
        creditsUsed: user.aiVideoCreditsUsed,
        plan: user.plan,
    };
}
// ── Deduct AI Video Credit ────────────────────────────
async function deductAiVideoCredit(userId, videoId, description = 'AI Video generation') {
    // Atomic guard: only decrements if aiVideoCredits > 0
    const result = await prisma_1.prisma.user.updateMany({
        where: {
            id: userId,
            aiVideoCredits: { gt: 0 },
        },
        data: {
            aiVideoCredits: { decrement: 1 },
            aiVideoCreditsUsed: { increment: 1 },
        },
    });
    if (result.count === 0) {
        throw new Error('Insufficient AI video credits');
    }
    // Fetch updated balance for transaction record
    const updated = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { aiVideoCredits: true },
    });
    await prisma_1.prisma.creditTransaction.create({
        data: {
            userId,
            type: 'usage',
            credits: 0, // Doesn't affect regular credits
            description: `[AI Video] ${description}`,
            videoId,
            balanceAfter: updated.aiVideoCredits,
        },
    });
}
// ── Reset Monthly AI Video Credits ────────────────────
async function resetMonthlyAiVideoCredits(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
    });
    if (!user) {
        throw new Error(`User not found: ${userId}`);
    }
    const limit = getAiVideoLimit(user.plan);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                aiVideoCredits: limit,
                aiVideoCreditsUsed: 0,
            },
        }),
        prisma_1.prisma.creditTransaction.create({
            data: {
                userId,
                type: 'reset',
                credits: 0,
                description: `[AI Video] Monthly reset: ${limit} clips`,
                balanceAfter: limit,
            },
        }),
    ]);
}
// ── Get AI Video Limit ────────────────────────────────
function getAiVideoLimit(plan) {
    return constants_1.AI_VIDEO_LIMITS[plan] ?? 0;
}
