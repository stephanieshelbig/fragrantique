'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const bottleSrc = (f) => f?.image_url_transparent || f?.image_url || '/bottle-placeholder.png';

function deslugifyBrand(slug) {
  return decodeURIComponent(slug).replace(/-/g, ' ').replace(/\band\b/gi, '&').replace(/\s+/g, ' ').trim();
}

export default function UserBrandPage({ params }) {
  const username = decodeURIComponent(params.username);
  const brandSlug = params.brand;
  const brandNameWanted = deslugifyBrand(brandSlug);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]); // all bottles in brand for this user

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', username)
        .maybeSingle();

      if (!prof?.id) { setProfile(null); setItems([]); setLoading(false); return; }
      setProfile(prof);

      // load all user bottles for this brand
      const { data } = await supabase
        .from('user_fragrances')
        .select(`
          id,
          fragrance_id,
          fragrance:fragrances(id, brand, name, image_url, image_url_transparent)
        `)
        .eq('user_id', prof.id);

      const all = (data || []).filter(row => {
        const b = (row.fragrance?.brand || '').trim().toLowerCase();
        return b === brandNameWanted.toLowerCase();
      });

      // sort by name
      all.sort((a, b) => (a.fragrance?.name || '').localeCompare(b.fragrance?.name || ''));

      setItems(all);
      setLoading(false);
    })();
  }, [username, brandSlug, brandNameWanted]);

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/u/${encodeURIComponent(username)}`} className="text-sm text-blue-600 hover:underline">← Back to @{username}</Link>
        <h1 className="text-xl font-semibold">{brandNameWanted}</h1>
        <div />
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm opacity-70">No fragrances found for this brand.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {items.map((it) => {
            const f = it.fragrance;
            return (
              <Link
                key={it.id}
                href={`/fragrance/${f?.id}`}
                className="group block relative bg-white/40 rounded-xl p-3 hover:shadow-md transition"
                title={f?.name || 'fragrance'}
              >
                <div className="relative w-full" style={{ aspectRatio: '2/3' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bottleSrc(f)}
                    alt={f?.name || 'fragrance'}
                    className="object-contain mx-auto"
                    style={{ height: '100%', width: 'auto', mixBlendMode: 'multiply' }}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallback) {
                        img.dataset.fallback = '1';
                        img.src = '/bottle-placeholder.png';
                      }
                    }}
                  />
                </div>
                <div className="mt-2 text-xs font-medium line-clamp-2 text-center">
                  {f?.name || 'Unnamed'}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
