import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/create/',
          '/videos/',
          '/settings/',
          '/analytics/',
          '/autopilot/',
          '/platforms/',
          '/schedule/',
          '/admin/',
        ],
      },
    ],
    sitemap: 'https://autopostai.video/sitemap.xml',
  }
}
