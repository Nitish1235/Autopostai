import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { Resend } from 'resend'

// ── Props ─────────────────────────────────────────────

interface WelcomeEmailProps {
  name: string
}

// ── Email Template ────────────────────────────────────

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://autopostai.com'

  return (
    <Html>
      <Head />
      <Preview>Welcome to AutoPost AI — 3 free videos inside</Preview>
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

          {/* Welcome Heading */}
          <Heading style={headingStyle}>
            Welcome to AutoPost AI, {name}
          </Heading>

          <Text style={textStyle}>
            You have <strong style={{ color: '#0A84FF' }}>3 free videos</strong>{' '}
            to get started. Here&apos;s how it works:
          </Text>

          <Hr style={hrStyle} />

          {/* Step 1 */}
          <Section style={stepSectionStyle}>
            <Text style={stepNumberStyle}>1</Text>
            <Text style={stepTitleStyle}>Pick a topic</Text>
            <Text style={stepDescStyle}>
              Type any topic — finance, history, science — or let AI suggest
              trending topics for your niche.
            </Text>
          </Section>

          {/* Step 2 */}
          <Section style={stepSectionStyle}>
            <Text style={stepNumberStyle}>2</Text>
            <Text style={stepTitleStyle}>AI generates everything</Text>
            <Text style={stepDescStyle}>
              Script, images, voiceover, subtitles, and music — all created
              automatically in under 8 minutes.
            </Text>
          </Section>

          {/* Step 3 */}
          <Section style={stepSectionStyle}>
            <Text style={stepNumberStyle}>3</Text>
            <Text style={stepTitleStyle}>Auto-publish everywhere</Text>
            <Text style={stepDescStyle}>
              Your video is posted to TikTok, Instagram, YouTube Shorts, and
              X — on your schedule or full autopilot.
            </Text>
          </Section>

          <Hr style={hrStyle} />

          {/* CTA Button */}
          <Section style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link href={`${appUrl}/create`} style={ctaButtonStyle}>
              Create your first video →
            </Link>
          </Section>

          {/* Footer */}
          <Text style={footerStyle}>
            You&apos;re receiving this because you signed up for AutoPost AI.
            If this wasn&apos;t you, you can safely ignore this email.
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

const hrStyle: React.CSSProperties = {
  borderColor: 'rgba(255, 255, 255, 0.08)',
  borderWidth: '1px 0 0',
  margin: '24px 0',
}

const stepSectionStyle: React.CSSProperties = {
  marginBottom: '20px',
}

const stepNumberStyle: React.CSSProperties = {
  display: 'inline-block',
  width: '28px',
  height: '28px',
  lineHeight: '28px',
  textAlign: 'center',
  borderRadius: '50%',
  backgroundColor: 'rgba(10, 132, 255, 0.12)',
  border: '1px solid rgba(10, 132, 255, 0.25)',
  color: '#0A84FF',
  fontSize: '13px',
  fontWeight: 700,
  margin: '0 0 8px',
}

const stepTitleStyle: React.CSSProperties = {
  color: '#F5F5F7',
  fontSize: '15px',
  fontWeight: 600,
  margin: '0 0 4px',
}

const stepDescStyle: React.CSSProperties = {
  color: 'rgba(245, 245, 247, 0.45)',
  fontSize: '13px',
  lineHeight: 1.6,
  margin: 0,
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

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@autopostai.com',
    to: email,
    subject: 'Welcome to AutoPost AI — 3 free videos inside',
    react: WelcomeEmail({ name }),
  })
}
