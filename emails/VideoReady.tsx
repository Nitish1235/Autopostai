import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { Resend } from 'resend'

// ── Props ─────────────────────────────────────────────

interface VideoReadyEmailProps {
  name: string
  videoTitle: string
  videoId: string
  thumbnailUrl?: string
  approvalMode: 'review' | 'autopilot'
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://autopostai.com'

// ── Email Template ────────────────────────────────────

export function VideoReadyEmail({
  name,
  videoTitle,
  videoId,
  thumbnailUrl,
  approvalMode,
}: VideoReadyEmailProps) {
  const isReview = approvalMode === 'review'
  const previewText = isReview
    ? `Review required: ${videoTitle}`
    : `Video queued: ${videoTitle}`

  const heading = isReview
    ? 'Your video is ready to review'
    : 'Your video is queued for posting'

  const body = isReview
    ? `"${videoTitle}" is ready. You have 24 hours to approve or reject before autopilot skips it.`
    : `"${videoTitle}" will be posted as scheduled.`

  const ctaText = isReview ? 'Review Video →' : 'View Video →'
  const ctaHref = isReview
    ? `${appUrl}/videos?review=${videoId}`
    : `${appUrl}/videos/${videoId}`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Logo */}
          <Section style={logoSectionStyle}>
            <table cellPadding="0" cellSpacing="0" role="presentation">
              <tbody>
                <tr>
                  <td
                    style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: '#0A84FF',
                      borderRadius: '6px',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    <span style={{ color: '#FFFFFF', fontSize: '12px' }}>
                      ▶
                    </span>
                  </td>
                  <td style={{ paddingLeft: '9px' }}>
                    <span
                      style={{
                        color: '#F5F5F7',
                        fontSize: '15px',
                        fontWeight: 700,
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }}
                    >
                      AutoPost AI
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Heading */}
          <Heading style={headingStyle}>
            {heading}
          </Heading>

          <Text style={textStyle}>Hi {name},</Text>
          <Text style={textStyle}>{body}</Text>

          {/* Thumbnail */}
          {thumbnailUrl && (
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Img
                src={thumbnailUrl}
                width="280"
                height="498"
                alt={videoTitle}
                style={{
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  maxWidth: '100%',
                }}
              />
            </Section>
          )}

          <Hr style={hrStyle} />

          {/* CTA Button */}
          <Section style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link href={ctaHref} style={ctaButtonStyle}>
              {ctaText}
            </Link>
          </Section>

          {isReview && (
            <Text style={hintTextStyle}>
              ⏱ If you don&apos;t respond within 24 hours, this video will be
              handled by your autopilot settings.
            </Text>
          )}

          {/* Footer */}
          <Text style={footerStyle}>
            You&apos;re receiving this because you have video notifications
            enabled. Manage your notification preferences in{' '}
            <Link href={`${appUrl}/settings`} style={{ color: '#0A84FF' }}>
              Settings
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// ── Styles ────────────────────────────────────────────

const bodyStyle: React.CSSProperties = {
  backgroundColor: '#1C1C1E',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  margin: 0,
  padding: 0,
}

const containerStyle: React.CSSProperties = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '48px 32px',
}

const logoSectionStyle: React.CSSProperties = {
  marginBottom: '32px',
}

const headingStyle: React.CSSProperties = {
  color: '#F5F5F7',
  fontSize: '24px',
  fontWeight: 700,
  lineHeight: 1.3,
  margin: '0 0 16px',
  letterSpacing: '-0.5px',
}

const textStyle: React.CSSProperties = {
  color: 'rgba(245, 245, 247, 0.6)',
  fontSize: '15px',
  lineHeight: 1.6,
  margin: '0 0 8px',
}

const hintTextStyle: React.CSSProperties = {
  color: 'rgba(245, 245, 247, 0.35)',
  fontSize: '13px',
  lineHeight: 1.6,
  margin: '16px 0 0',
  textAlign: 'center',
}

const hrStyle: React.CSSProperties = {
  borderColor: 'rgba(255, 255, 255, 0.08)',
  borderWidth: '1px 0 0',
  margin: '24px 0',
}

const ctaButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#0A84FF',
  color: '#FFFFFF',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  padding: '13px 28px',
  borderRadius: '8px',
  lineHeight: 1,
}

const footerStyle: React.CSSProperties = {
  color: 'rgba(245, 245, 247, 0.2)',
  fontSize: '11px',
  lineHeight: 1.6,
  marginTop: '48px',
  textAlign: 'center',
}

// ── Send Function ─────────────────────────────────────

export async function sendVideoReadyEmail(params: {
  email: string
  name: string
  videoTitle: string
  videoId: string
  thumbnailUrl?: string
  approvalMode: 'review' | 'autopilot'
}): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)

  const subject =
    params.approvalMode === 'review'
      ? `Review required: ${params.videoTitle}`
      : `Video queued: ${params.videoTitle}`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@autopostai.com',
    to: params.email,
    subject,
    react: VideoReadyEmail({
      name: params.name,
      videoTitle: params.videoTitle,
      videoId: params.videoId,
      thumbnailUrl: params.thumbnailUrl,
      approvalMode: params.approvalMode,
    }),
  })
}
