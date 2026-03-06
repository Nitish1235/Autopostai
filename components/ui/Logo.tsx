'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

/* ── Scale Tokens ─────────────────────────────────────── */

const TOKENS = {
    sm: {
        iconRadius: 6,
        iconPadding: '6px 8px 5px',
        apSize: 15,
        ruleHeight: 2,
        wordmarkSize: 14,
        gap: 10,
    },
    md: {
        iconRadius: 10,
        iconPadding: '11px 14px 9px',
        apSize: 24,
        ruleHeight: 4,
        wordmarkSize: 18,
        gap: 12,
    },
    lg: {
        iconRadius: 14,
        iconPadding: '14px 18px 12px',
        apSize: 38,
        ruleHeight: 4,
        wordmarkSize: 28,
        gap: 12,
    },
    hero: {
        iconRadius: 20,
        iconPadding: '18px 24px 16px',
        apSize: 60,
        ruleHeight: 4,
        wordmarkSize: 48,
        gap: 14,
    },
} as const

/* ── Colours ──────────────────────────────────────────── */

const COLORS = {
    dark: {
        iconBg: '#1C1C22',
        letterA: '#FFFFFF',
        letterP: '#3B82F6',
        rule: '#3B82F6',
        wordmark: '#FFFFFF',
        wordmarkAI: '#3B82F6',
    },
    light: {
        iconBg: '#E2E0DA',
        letterA: '#111111',
        letterP: '#2563EB',
        rule: '#2563EB',
        wordmark: '#111111',
        wordmarkAI: '#2563EB',
    },
} as const

/* ── Component ────────────────────────────────────────── */

interface LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'hero'
    theme?: 'dark' | 'light'
    href?: string
    className?: string
}

function Logo({
    size = 'md',
    theme = 'dark',
    href = '/',
    className,
}: LogoProps) {
    const t = TOKENS[size]
    const c = COLORS[theme]
    const isDark = theme === 'dark'

    const content = (
        <div
            className={cn('flex items-center select-none', className)}
            style={{ gap: t.gap }}
        >
            {/* Icon block */}
            <div
                className="flex flex-col items-center shrink-0"
                style={{
                    backgroundColor: c.iconBg,
                    borderRadius: t.iconRadius,
                    padding: t.iconPadding,
                }}
            >
                {/* AP letters */}
                <div className="flex items-baseline" style={{ gap: 1 }}>
                    <span
                        style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontWeight: 800,
                            fontSize: t.apSize,
                            lineHeight: 1,
                            color: c.letterA,
                        }}
                    >
                        A
                    </span>
                    <span
                        style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontWeight: 800,
                            fontSize: t.apSize,
                            lineHeight: 1,
                            color: c.letterP,
                        }}
                    >
                        P
                    </span>
                </div>

                {/* Blue rule */}
                <div
                    className={cn(isDark && 'logo-rule-glow')}
                    style={{
                        width: '100%',
                        height: t.ruleHeight,
                        backgroundColor: c.rule,
                        borderRadius: t.ruleHeight / 2,
                        marginTop: Math.max(2, t.apSize * 0.08),
                    }}
                />
            </div>

            {/* Wordmark */}
            <div className="flex items-baseline" style={{ gap: 4 }}>
                <span
                    style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontSize: t.wordmarkSize,
                        lineHeight: 1,
                        color: c.wordmark,
                        letterSpacing: '-0.01em',
                    }}
                >
                    AutoPost{' '}
                </span>
                <span
                    style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: t.wordmarkSize,
                        lineHeight: 1,
                        color: c.wordmarkAI,
                        letterSpacing: '-0.01em',
                    }}
                >
                    AI
                </span>
            </div>
        </div>
    )

    if (href) {
        return (
            <Link href={href} className="inline-flex" aria-label="AutoPost AI home">
                {content}
            </Link>
        )
    }

    return content
}

export { Logo }
