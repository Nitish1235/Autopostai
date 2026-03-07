"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCredits = checkCredits;
exports.deductCredit = deductCredit;
exports.addCredits = addCredits;
exports.resetMonthlyCredits = resetMonthlyCredits;
exports.upgradeCredits = upgradeCredits;
exports.getCreditHistory = getCreditHistory;
exports.getPlanCreditLimit = getPlanCreditLimit;
const prisma_1 = require("@/lib/db/prisma");
const constants_1 = require("@/lib/utils/constants");
// ── Check Credits ─────────────────────────────────────
async function checkCredits(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: {
            credits: true,
            creditsUsed: true,
            plan: true,
        },
    });
    if (!user) {
        throw new Error(`User not found: ${userId}`);
    }
    return {
        hasCredits: user.credits > 0,
        credits: user.credits,
        creditsUsed: user.creditsUsed,
        plan: user.plan,
    };
}
// ── Deduct Credit ─────────────────────────────────────
async function deductCredit(userId, videoId, description = 'Video generation') {
    // Atomic guard: only decrements if credits > 0 — no double-spend
    const result = await prisma_1.prisma.user.updateMany({
        where: {
            id: userId,
            credits: { gt: 0 },
        },
        data: {
            credits: { decrement: 1 },
            creditsUsed: { increment: 1 },
        },
    });
    if (result.count === 0) {
        throw new Error('Insufficient credits');
    }
    // Fetch updated balance for the transaction record
    const updated = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true },
    });
    await prisma_1.prisma.creditTransaction.create({
        data: {
            userId,
            type: 'usage',
            credits: -1,
            description,
            videoId,
            balanceAfter: updated.credits,
        },
    });
}
// ── Add Credits ───────────────────────────────────────
async function addCredits(userId, amount, type, description, dodoPaymentId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true },
    });
    if (!user) {
        throw new Error(`User not found: ${userId}`);
    }
    const newBalance = user.credits + amount;
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                credits: { increment: amount },
            },
        }),
        prisma_1.prisma.creditTransaction.create({
            data: {
                userId,
                type,
                credits: amount,
                description,
                dodoPaymentId: dodoPaymentId ?? null,
                balanceAfter: newBalance,
            },
        }),
    ]);
}
// ── Reset Monthly Credits ─────────────────────────────
async function resetMonthlyCredits(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
    });
    if (!user) {
        throw new Error(`User not found: ${userId}`);
    }
    const planLimit = getPlanCreditLimit(user.plan);
    const resetDate = new Date();
    resetDate.setDate(resetDate.getDate() + 30);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                credits: planLimit,
                creditsUsed: 0,
                creditsReset: resetDate,
            },
        }),
        prisma_1.prisma.creditTransaction.create({
            data: {
                userId,
                type: 'reset',
                credits: planLimit,
                description: 'Monthly credit reset',
                balanceAfter: planLimit,
            },
        }),
    ]);
}
// ── Upgrade Credits (carry-over remaining) ────────────
async function upgradeCredits(userId, newPlan) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true, plan: true },
    });
    if (!user) {
        throw new Error(`User not found: ${userId}`);
    }
    const newPlanLimit = getPlanCreditLimit(newPlan);
    const remainingCredits = Math.max(0, user.credits);
    const totalCredits = newPlanLimit + remainingCredits;
    const resetDate = new Date();
    resetDate.setDate(resetDate.getDate() + 30);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                credits: totalCredits,
                creditsUsed: 0,
                creditsReset: resetDate,
            },
        }),
        prisma_1.prisma.creditTransaction.create({
            data: {
                userId,
                type: 'reset',
                credits: totalCredits,
                description: `Plan upgrade: ${newPlanLimit} new + ${remainingCredits} carried over`,
                balanceAfter: totalCredits,
            },
        }),
    ]);
}
// ── Get Credit History ────────────────────────────────
async function getCreditHistory(userId, limit = 50) {
    return prisma_1.prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}
// ── Get Plan Credit Limit ─────────────────────────────
function getPlanCreditLimit(plan) {
    switch (plan) {
        case 'starter':
            return constants_1.PLANS.starter.credits; // 30
        case 'pro':
            return constants_1.PLANS.pro.credits; // 100
        case 'creator_max':
            return constants_1.PLANS.creator_max.credits; // 300
        case 'free':
        default:
            return 0;
    }
}
