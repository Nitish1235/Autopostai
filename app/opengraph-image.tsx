import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'AutoPost AI — Faceless Video on Autopilot'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: 1200,
                    height: 630,
                    backgroundColor: '#0D0D11',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'sans-serif',
                    position: 'relative',
                }}
            >
                {/* Subtle radial glow */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background:
                            'radial-gradient(circle at 50% 40%, rgba(59,130,246,0.08) 0%, transparent 60%)',
                    }}
                />

                {/* Logo lockup */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 20,
                    }}
                >
                    {/* Icon block */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            backgroundColor: '#1C1C22',
                            borderRadius: 20,
                            padding: '18px 24px 16px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                            <span
                                style={{
                                    fontSize: 64,
                                    fontWeight: 900,
                                    color: '#FFFFFF',
                                    lineHeight: 1,
                                }}
                            >
                                A
                            </span>
                            <span
                                style={{
                                    fontSize: 64,
                                    fontWeight: 900,
                                    color: '#3B82F6',
                                    lineHeight: 1,
                                }}
                            >
                                P
                            </span>
                        </div>
                        <div
                            style={{
                                width: '100%',
                                height: 5,
                                backgroundColor: '#3B82F6',
                                borderRadius: 3,
                                marginTop: 4,
                            }}
                        />
                    </div>

                    {/* Wordmark */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span
                            style={{
                                fontSize: 52,
                                fontWeight: 500,
                                color: '#FFFFFF',
                                lineHeight: 1,
                            }}
                        >
                            AutoPost{' '}
                        </span>
                        <span
                            style={{
                                fontSize: 52,
                                fontWeight: 700,
                                color: '#3B82F6',
                                lineHeight: 1,
                            }}
                        >
                            AI
                        </span>
                    </div>
                </div>

                {/* Tagline */}
                <p
                    style={{
                        fontSize: 28,
                        color: 'rgba(255,255,255,0.45)',
                        marginTop: 32,
                        fontWeight: 400,
                    }}
                >
                    Faceless Video on Autopilot
                </p>

                {/* Feature line */}
                <p
                    style={{
                        fontSize: 16,
                        color: 'rgba(255,255,255,0.25)',
                        marginTop: 16,
                        fontWeight: 400,
                    }}
                >
                    AI Video Generation • Auto-Publish • TikTok • Instagram • YouTube • X
                </p>

                {/* Accent line */}
                <div
                    style={{
                        width: 200,
                        height: 2,
                        backgroundColor: '#3B82F6',
                        borderRadius: 1,
                        marginTop: 40,
                        opacity: 0.4,
                    }}
                />
            </div>
        ),
        { ...size }
    )
}
