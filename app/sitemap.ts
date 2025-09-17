// app/sitemap.ts
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://fragrantique.net'

  // List your important static pages here:
  const staticPaths = [
    '',                // homepage
    'explore',         // example
    'decants',         // example: index listing all decants
    'about',           // example
    'contact'          // example
  ]

  const now = new Date()

  const urls: MetadataRoute.Sitemap = staticPaths.map(p => ({
    url: p ? `${base}/${p}` : base,
    lastModified: now
  }))

  // (Optional) If you have a page that lists every decant (e.g. /decants),
  // and each decant page is linked from there, Google can discover them.
  // Later, we can upgrade this to include every individual decant URL.

  return urls
}
