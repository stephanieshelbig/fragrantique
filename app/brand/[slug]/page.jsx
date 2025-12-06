'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function BrandDetailPage({ params }) {
  const brandParam = decodeURIComponent(params.slug || '');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load all fragrances for this brand (alphabetical)
  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) Try case-insensitive exact match (best for clean slugs)
      let { data, error } = await supabase
        .from('fragrances')
        .select('id, brand, name, image_url, image_url_transparent, fragrantica_url')
        .ilike('brand', brandParam)
        .order('name', { ascending: true })
        .limit(5000);

      // 2) If nothing comes back (brand capitalization/spacing quirks), try contains
      if (!error && (!data || data.length === 0)) {
        const fallback = await supabase
          .from('fragrances')
          .select('id, brand, name, image_url, image_url_transparent, fragrantica_url')
          .ilike('brand', `%${brandParam}%`)
          .order('name', { ascending: true })
          .limit(5000);

        if (!fallback.error && fallback.data) data = fallback.data;
      }

      if (!error && data) setItems(data || []);
      setLoading(false);
    })();
  }, [brandParam]);

  // Safety net: sort again on the client in case DB ordering is bypassed somewhere
  const sorted = useMemo(() => {
    return [...(items || [])].sort((a, b) =>
      (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' })
    );
  }, [items]);

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      {/* Boutique header to match your site */}
      <div className="w-full mb-6">
        <Image
          src="/StephaniesBoutiqueHeader.png"
          alt="Stephanie's Boutique Header"
          width={1200}
          height={200}
          style={{ objectFit: 'contain', width: '100%', height: 'auto' }}
          priority
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">
          {brandParam} — {sorted.length} fragrance{sorted.length === 1 ? '' : 's'}
        </h1>
        <div className="flex gap-3 text-sm">
          <Link href="/brand" className="underline">← Back to Brand Index</Link>
          <Link href="/cart" className="hover:underline">Cart</Link>
        </div>
      </div>

      {loading && <div>Loading…</div>}
      {!loading && !sorted.length && (
        <div className="p-4 border rounded bg-white">No fragrances found for this brand.</div>
      )}

      {!loading && !!sorted.length && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {sorted.map((f) => {
            const img = f.image_url_transparent || f.image_url || '/bottle-placeholder.png';
            return (
              <li key={f.id} className="group">
                <Link
                  href={`/fragrance/${f.id}`}
                  className="block rounded-lg bg-white border hover:shadow-sm p-3 text-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={f.name}
                    className="mx-auto h-28 object-contain"
                    style={{ mixBlendMode: 'multiply' }}
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (!el.dataset.fallback) {
                        el.dataset.fallback = '1';
                        el.src = '/bottle-placeholder.png';
                      }
                    }}
                  />
                  <div className="mt-2 text-xs opacity-70">{f.brand}</div>
                  <div className="text-sm font-medium">{f.name}</div>
                </Link>
                {f.fragrantica_url && (
                  <a
                    href={f.fragrantica_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[12px] text-center mt-1 text-blue-700 hover:underline"
                  >
                    Fragrantica ↗
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
