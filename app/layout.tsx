import type { Metadata } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { ToastProvider } from '@/components/ui/toast'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: '800',
  variable: '--font-plus-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AutoPost AI — Faceless Video on Autopilot',
  description:
    'Generate and auto-publish AI faceless videos to TikTok, Instagram, YouTube and X. Fully automated.',
  keywords:
    'faceless youtube, ai video generator, autopilot content, tiktok automation',
  openGraph: {
    title: 'AutoPost AI — Faceless Video on Autopilot',
    description:
      'Generate and auto-publish AI faceless videos to TikTok, Instagram, YouTube and X. Fully automated.',
    type: 'website',
    siteName: 'AutoPost AI',
    url: 'https://autopostai.video',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AutoPost AI — Faceless Video on Autopilot',
    description:
      'Generate and auto-publish AI faceless videos to TikTok, Instagram, YouTube and X.',
  },
  metadataBase: new URL('https://autopostai.video'),
}

// JSON-LD for Google — WebSite + Organization with logo
const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AutoPost AI',
    url: 'https://autopostai.video',
    description:
      'Generate and auto-publish AI faceless videos to TikTok, Instagram, YouTube and X.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://autopostai.video/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AutoPost AI',
    url: 'https://autopostai.video',
    logo: 'https://autopostai.video/apple-icon',
    sameAs: [],
  },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans antialiased`}>
        <ClerkProvider signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}

