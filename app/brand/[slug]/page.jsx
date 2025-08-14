'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

function deslugify(slug) {
  const s = (slug || '').replace(/-/g, ' ').replace(/and/g,'&');
  // Capitalize each word (nice for heading)
  return s.replace(/\b\w/g, m => m.toUpperCase());
}
function bottleSrc(f) {
  const best = f?.image_url_transparent || f?.image_url;
  if (!best) return '/bottle-placeholder.png';
  const ver = f?.updated_at || f?.created_at || '';
  return `${best}${best.includes('?') ? '&' : '?'}v=${encodeURIComponent(ver)}`;
}

export default function BrandPage({ params }) {
  const [items, setItems] = useState([]);
  const [brand, setBrand] = useState('');

  useEffect(() => {
    (async () => {
      const friendly = deslugify(params.slug).trim();
      setBrand(friendly);

      // pull all fragrances with this brand (global; not just Stephanie)
      const { data } = await supabase
        .from('fragrances')
        .select('id, name, brand, image_url, image_url_transparent, updated_at, created_at')
        .ilike('brand', friendly); // case-insensitive exact match; if your data varies, switch to .ilike('brand', `%${friendly}%`)

      setItems((data || []).sort((a,b) => (a.name||'').localeCompare(b.name||'')));
    })();
  }, [params.slug]);

  const count = useMemo(() => items.length, [items]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{brand}</h1>
          <div className="text-sm text-gray-500">{count} {count === 1 ? 'fragrance' : 'fragrances'}</div>
        </div>
        <div className="flex gap-3">
          <Link href="/brand" className="underline text-sm opacity-70">All brands</Link>
          <Link href="/%40stephanie" className="underline text-sm opacity-70">Shelves</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
        {items.map(f => (
          <Link key={f.id} href={`/fragrance/${f.id}`} className="group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bottleSrc(f)}
              alt={f.name || 'fragrance'}
              className="object-contain mx-auto"
              style={{
                height: 110,
                width: 'auto',
                mixBlendMode: 'multiply',
                filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
              }}
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = '1';
                  img.src = '/bottle-placeholder.png';
                }
              }}
            />
            <div className="mt-2 text-xs text-center leading-tight">
              <div className="font-medium group-hover:underline">{f.name}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
