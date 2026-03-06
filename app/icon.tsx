import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    backgroundColor: '#1C1C22',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px 4px 2px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
                    <span
                        style={{
                            fontSize: 16,
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
                            fontSize: 16,
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
                        width: '100%',
                        height: 2,
                        backgroundColor: '#3B82F6',
                        borderRadius: 1,
                        marginTop: 1,
                    }}
                />
            </div>
        ),
        { ...size }
    )
}
