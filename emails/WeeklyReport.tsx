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

interface WeeklyReportEmailProps {
  name: string
  weekStartDate: string
  totalViews: number
  videosPosted: number
  topVideoTitle: string
  topVideoViews: number
  followerGrowth: number
  creditsRemaining: number
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://autopostai.com'

// ── Email Template ────────────────────────────────────

export function WeeklyReportEmail({
  name,
  weekStartDate,
  totalViews,
  videosPosted,
  topVideoTitle,
  topVideoViews,
  followerGrowth,
  creditsRemaining,
}: WeeklyReportEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Your week in numbers — {totalViews.toLocaleString()} views
      </Preview>
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

          {/* Header */}
          <Heading style={headingStyle}>
            Your weekly report — week of {weekStartDate}
          </Heading>

          <Text style={textStyle}>Hey {name}, here&apos;s how your channels performed:</Text>

          <Hr style={hrStyle} />

          {/* Stat Boxes */}
          <table
            cellPadding="0"
            cellSpacing="0"
            role="presentation"
            width="100%"
            style={{ marginBottom: '24px' }}
          >
            <tbody>
              <tr>
                <td style={statBoxStyle} align="center">
                  <Text style={statValueStyle}>
                    {totalViews.toLocaleString()}
                  </Text>
                  <Text style={statLabelStyle}>Total Views</Text>
                </td>
                <td width="12" />
                <td style={statBoxStyle} align="center">
                  <Text style={statValueStyle}>{videosPosted}</Text>
                  <Text style={statLabelStyle}>Videos Posted</Text>
                </td>
              </tr>
              <tr>
                <td height="12" colSpan={3} />
              </tr>
              <tr>
                <td style={statBoxStyle} align="center">
                  <Text style={statValueStyle}>
                    {topVideoViews.toLocaleString()}
                  </Text>
                  <Text style={statLabelStyle}>Top Video Views</Text>
                </td>
                <td width="12" />
                <td style={statBoxStyle} align="center">
                  <Text style={statValueStyle}>
                    {followerGrowth >= 0 ? '+' : ''}
                    {followerGrowth.toLocaleString()}
                  </Text>
                  <Text style={statLabelStyle}>Followers Gained</Text>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Top Video */}
          <Section style={topVideoSectionStyle}>
            <Text style={sectionTitleStyle}>🏆 Top Video This Week</Text>
            <Text
              style={{
                ...textStyle,
                color: '#F5F5F7',
                fontWeight: 600,
                fontSize: '16px',
                margin: '4px 0',
              }}
            >
              {topVideoTitle}
            </Text>
            <Text style={textStyle}>
              {topVideoViews.toLocaleString()} views
            </Text>
          </Section>

          <Hr style={hrStyle} />

          {/* Credits Remaining */}
          <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
            <Text style={sectionTitleStyle}>Credits Remaining</Text>
            <Text
              style={{
                ...statValueStyle,
                color: creditsRemaining < 10 ? '#FF453A' : '#30D158',
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: '20px',
                backgroundColor:
                  creditsRemaining < 10
                    ? 'rgba(255, 69, 58, 0.12)'
                    : 'rgba(48, 209, 88, 0.12)',
                border: `1px solid ${creditsRemaining < 10
                    ? 'rgba(255, 69, 58, 0.25)'
                    : 'rgba(48, 209, 88, 0.25)'
                  }`,
              }}
            >
              {creditsRemaining} videos
            </Text>
            {creditsRemaining < 10 && (
              <Text style={{ ...hintTextStyle, marginTop: '8px' }}>
                Running low! Top up to keep your channels active.
              </Text>
            )}
          </Section>

          <Hr style={hrStyle} />

          {/* CTA */}
          <Section style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link href={`${appUrl}/analytics`} style={ctaButtonStyle}>
              View Full Analytics →
            </Link>
          </Section>

          {/* Footer */}
          <Text style={footerStyle}>
            AutoPost AI ran your channel on autopilot this week. Manage
            notification preferences in{' '}
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
  fontSize: '22px',
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
  margin: 0,
}

const hrStyle: React.CSSProperties = {
  borderColor: 'rgba(255, 255, 255, 0.08)',
  borderWidth: '1px 0 0',
  margin: '24px 0',
}

const statBoxStyle: React.CSSProperties = {
  width: '48%',
  backgroundColor: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '10px',
  padding: '16px 12px',
}

const statValueStyle: React.CSSProperties = {
  color: '#F5F5F7',
  fontSize: '24px',
  fontWeight: 700,
  lineHeight: 1,
  margin: '0 0 4px',
}

const statLabelStyle: React.CSSProperties = {
  color: 'rgba(245, 245, 247, 0.4)',
  fontSize: '12px',
  fontWeight: 500,
  lineHeight: 1,
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const sectionTitleStyle: React.CSSProperties = {
  color: 'rgba(245, 245, 247, 0.4)',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  margin: '0 0 8px',
}

const topVideoSectionStyle: React.CSSProperties = {
  backgroundColor: 'rgba(10, 132, 255, 0.06)',
  border: '1px solid rgba(10, 132, 255, 0.15)',
  borderRadius: '10px',
  padding: '16px',
  marginBottom: '8px',
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

export async function sendWeeklyReportEmail(params: {
  email: string
  name: string
  weekStartDate: string
  totalViews: number
  videosPosted: number
  topVideoTitle: string
  topVideoViews: number
  followerGrowth: number
  creditsRemaining: number
}): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key')

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@autopostai.com',
    to: params.email,
    subject: `Your week in numbers — ${params.totalViews.toLocaleString()} views`,
    react: WeeklyReportEmail({
      name: params.name,
      weekStartDate: params.weekStartDate,
      totalViews: params.totalViews,
      videosPosted: params.videosPosted,
      topVideoTitle: params.topVideoTitle,
      topVideoViews: params.topVideoViews,
      followerGrowth: params.followerGrowth,
      creditsRemaining: params.creditsRemaining,
    }),
  })
}
