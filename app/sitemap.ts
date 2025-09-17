import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://fragrantique.net'

  // 1. Fetch decants from Supabase
  const { data: decants } = await supabase
    .from('decants') // replace with your table name
    .select('slug, updated_at')

  // 2. Static pages
  const staticPages = ['', 'explore', 'decants', 'about', 'contact'].map(p => ({
    url: p ? `${base}/${p}` : base,
    lastModified: new Date(),
  }))

  // 3. Decant detail pages
  const decantPages =
    decants?.map(d => ({
      url: `${base}/decants/${d.slug}`,
      lastModified: d.updated_at ? new Date(d.updated_at) : new Date(),
    })) ?? []

  return [...staticPages, ...decantPages]
}
