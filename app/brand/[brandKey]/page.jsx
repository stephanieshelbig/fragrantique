'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function BrandPage({ params }) {
  const brandKey = decodeURIComponent(params.brandKey || '');
  const [frags, setFrags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      // Pull all fragrances for the brand (public read via RLS)
      const { data, error } = await supabase
        .from('fragrances')
        .select('id, brand, name, image_url, image_url_transparent')
        .eq('brand', brandKey)
        .order('name', { ascending: true });

      if (isMounted) {
        setFrags(error ? [] : (data || []));
        setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [brandKey]);

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-4 mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {brandKey} <span className="font-normal">— @stephanie</span>
        </h1>
        <Link href="/u/stephanie" className="underline text-lg">
          ← Back to boutique
        </Link>
      </div>

      {/* Grid */}
      {frags.length === 0 ? (
        <div className="p-6 border rounded bg-white">No fragrances found for this brand.</div>
      ) : (
        <div
          className="
            grid gap-10
            sm:grid-cols-2
            md:grid-cols-3
            xl:grid-cols-4
          "
        >
          {frags.map((f) => {
            const img = f.image_url_transparent || f.image_url || '/bottle-placeholder.png';
            return (
              <Link
                key={f.id}
                href={`/fragrance/${encodeURIComponent(f.id)}`}
                className="block group"
              >
                {/* Bottle box with a fixed height; image scales to fill height uniformly */}
                <div
                  className="
                    relative mx-auto
                    h-72 sm:h-80 md:h-[22rem] lg:h-[24rem]
                    w-full max-w-[20rem]
                  "
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={f.name}
                    className="
                      absolute inset-0
                      h-full w-auto mx-auto
                      object-contain
                      drop-shadow-xl
                      transition-transform duration-200 group-hover:scale-[1.03]
                    "
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (!el.dataset.fallback) {
                        el.dataset.fallback = '1';
                        el.src = '/bottle-placeholder.png';
                      }
                    }}
                  />
                </div>

                {/* Meta */}
                <div className="mt-4">
                  <div className="text-sm text-neutral-500">{f.brand}</div>
                  <div className="text-lg font-semibold group-hover:underline">
                    {f.name}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
