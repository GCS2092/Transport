import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://transport-six-xi.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/chauffeur/', '/driver/', '/login'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
