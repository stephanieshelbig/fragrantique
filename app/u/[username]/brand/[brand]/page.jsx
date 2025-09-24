'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// Normalization helpers (match boutique page)
const brandKey = (b) =>
  (b || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const STOPWORDS = new Set([
  'paris','london','milan','new','york','nyc','roma','rome',
  'perfume','perfumes','parfum','parfums','fragrance','fragrances',
  'inc','ltd','llc','co','company','laboratories','laboratory','lab','labs',
  'edition','editions','house','maison','atelier','collection','collections'
]);
function canonicalBrandKey(b) {
  const strict = brandKey(b);
  const parts = strict.split('-').filter(Boolean);
  const kept = parts.filter(p => !STOPWORDS.has(p));
  const canon = kept.join('-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return canon || strict;
}

export default function BrandPage({ params }) {
  const username = decodeURIComponent(params.username);
  const urlStrictKey = decodeURIComponent(params.brand || '');

  const [loading, setLoading] = useState(true);

  const [owner, setOwner] = useState({ id: null, username });
  const [frags, setFrags] = useState([]);

  useEffect(() => {
    (async () => {
      // 1) Find boutique owner
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', username)
        .maybeSingle();

      if (!prof?.id) {
        setOwner({ id: null, username });
        setFrags([]);
        setLoading(false);
        return;
      }
      setOwner(prof);

      // 2) Load all fragrances for that owner; filter in JS by normalized brand
      const { data: rows } = await supabase
        .from('user_fragrances')
        .select(`
          id,
          fragrance:fragrances(id, brand, name, image_url, image_url_transparent)
        `)
        .eq('user_id', prof.id);

      const items = (rows || []).map(r => r.fragrance).filter(Boolean);
      setFrags(items);
      setLoading(false);
    })();
  }, [username, urlStrictKey]);

  // Normalize and match both strict + canonical keys, then sort alphabetically
  const filtered = useMemo(() => {
    const wantStrict = (urlStrictKey || '').toLowerCase();
    const wantCanon  = canonicalBrandKey(urlStrictKey);

    return (frags || [])
      .filter(f => {
        const disp = f?.brand || 'unknown';
        const fStrict = brandKey(disp);
        const fCanon  = canonicalBrandKey(disp);
        return fStrict === wantStrict || fCanon === wantCanon;
      })
      .sort((a, b) =>
        (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' })
      );
  }, [frags, urlStrictKey]);

  // Choose display brand
  const displayBrand = useMemo(() => {
    if (!filtered.length) {
      const guess = urlStrictKey.replace(/-/g, ' ');
      return guess ? guess.charAt(0).toUpperCase() + guess.slice(1) : 'Brand';
    }
    const counts = new Map();
    for (const f of filtered) {
      const b = f.brand || 'Unknown';
      counts.set(b, (counts.get(b) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a,b)=>b[1]-a[1])[0][0];
  }, [filtered, urlStrictKey]);

  if (loading) {
    return <div className="max-w-5xl mx-auto p-6">Loading {displayBrand}…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">

      {/* Header Links (Arrange button removed) */}
      <div className="flex justify-end gap-4 py-3 text-sm font-medium">
        <Link href="/brand" className="hover:underline">Sort By Brand</Link>
        <Link href="/chat" className="hover:underline">Contact Me</Link>
        <Link href="/cart" className="hover:underline">Cart</Link>
      </div>

      {/* link to /decants */}
      <div className="mb-1 text-center text-sm">
        <Link href="/decants" className="font-semibold underline">
          click here for all available decants
        </Link>
      </div>

      {/* NEW: link to /notes */}
      <div className="mb-3 text-center text-sm">
        <Link href="/notes" className="font-semibold underline">
          Click here to search by notes
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {displayBrand} — <span className="font-normal opacity-70">@{owner.username}</span>
        </h1>
        <Link href={`/u/${encodeURIComponent(owner.username)}`} className="text-sm underline">
          ← Back to boutique
        </Link>
      </div>

      {!filtered.length && (
        <div className="p-4 border rounded bg-white">
          No fragrances found for this brand in @{owner.username}’s boutique.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {filtered.map((f) => {
          const img = f.image_url_transparent || f.image_url || '/bottle-placeholder.png';
          return (
            <Link
              key={f.id}
              href={`/fragrance/${f.id}`}
              className="group block"
              title={`${f.brand} — ${f.name}`}
            >
              <div className="relative w-full" style={{ aspectRatio: '3 / 4' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={f.name}
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ mixBlendMode: 'multiply', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.18))' }}
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (!el.dataset.fallback) {
                      el.dataset.fallback = '1';
                      el.src = '/bottle-placeholder.png';
                    }
                  }}
                />
              </div>
              <div className="mt-2 text-xs opacity-80">{f.brand}</div>
              <div className="text-sm font-medium">{f.name}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
