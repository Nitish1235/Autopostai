import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: 180,
                    height: 180,
                    borderRadius: 36,
                    backgroundColor: '#1C1C22',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '14px 18px 12px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <span
                        style={{
                            fontSize: 96,
                            fontWeight: 900,
                            color: '#FFFFFF',
                            lineHeight: 1,
                            fontFamily: 'sans-serif',
                        }}
                    >
                        A
                    </span>
                    <span
                        style={{
                            fontSize: 96,
                            fontWeight: 900,
                            color: '#3B82F6',
                            lineHeight: 1,
                            fontFamily: 'sans-serif',
                        }}
                    >
                        P
                    </span>
                </div>
                <div
                    style={{
                        width: '80%',
                        height: 8,
                        backgroundColor: '#3B82F6',
                        borderRadius: 4,
                        marginTop: 4,
                    }}
                />
            </div>
        ),
        { ...size }
    )
}
