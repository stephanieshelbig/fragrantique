// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/admin', '/admin/*'] }
    ],
    sitemap: 'https://YOUR-DOMAIN.com/sitemap.xml'
  }
}
