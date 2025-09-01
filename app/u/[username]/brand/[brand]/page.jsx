'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

// Utilities reused from your boutique page
const bottleSrc = (f) => f?.image_url_transparent || f?.image_url || '/bottle-placeholder.png';

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

export default function UserBrandPage({ params }) {
  const username = decodeURIComponent(params.username || '');
  const slugBrand = decodeURIComponent(params.brand || '');

  const [owner, setOwner] = useState(null); // { id, username }
  const [items, setItems] = useState([]);   // all user fragrances (joined with fragrances)
  const [loading, setLoading] = useState(true);

  // Load owner + their wardrobe
  useEffect(() => {
    (async () => {
      setLoading(true);

      // Resolve boutique owner
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', username)
        .maybeSingle();

      if (pErr || !prof?.id) {
        setOwner(null);
        setItems([]);
        setLoading(false);
        return;
      }
      setOwner(prof);

      // Load this user's fragrances (all, we'll filter by brand locally w/ robust matching)
      const { data: rows, error: fErr } = await supabase
        .from('user_fragrances')
        .select(`
          id,
          user_id,
          fragrance:fragrances(id, brand, name, image_url, image_url_transparent, fragrantica_url)
        `)
        .eq('user_id', prof.id)
        .limit(10000);

      if (fErr || !rows) {
        setItems([]);
        setLoading(false);
        return;
      }

      setItems(rows);
      setLoading(false);
    })();
  }, [username, slugBrand]);

  // Robust brand matching (case-insensitive + slug + canonical)
  const filtered = useMemo(() => {
    const want = slugBrand.trim();
    const wantLower = want.toLowerCase();
    const wantSlug = brandKey(want);
    const wantCanon = canonicalBrandKey(want);

    const matches = (b) => {
      const name = (b || '').trim();
      const lower = name.toLowerCase();
      return (
        // exact (case-insensitive)
        lower === wantLower ||
        // slug equality
        brandKey(name) === wantSlug ||
        // canonical equality
        canonicalBrandKey(name) === wantCanon ||
        // contains (fallback; helpful when the slug is partial)
        lower.includes(wantLower)
      );
    };

    const list = (items || [])
      .map((r) => r?.fragrance)
      .filter(Boolean)
      .filter((f) => matches(f.brand));

    // Sort by fragrance name ascending (case-insensitive)
    return list.sort((a, b) =>
      (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' })
    );
  }, [items, slugBrand]);

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      {/* Simple top header links (lightweight) */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="text-sm text-gray-600">
          <Link href={`/u/${encodeURIComponent(username)}`} className="hover:underline">
            ← Back to @{username}
          </Link>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <Link href="/brand" className="hover:underline">Brand Index</Link>
          <Link href="/chat" className="hover:underline">Contact Me</Link>
          <Link href="/cart" className="hover:underline">Cart</Link>
        </div>
      </div>

      {/* Optional header image to match the site vibe */}
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
          {slugBrand} — {filtered.length} fragrance{filtered.length === 1 ? '' : 's'}
          {owner ? <> in <span className="font-semibold">@{owner.username}</span>’s boutique</> : null}
        </h1>
        <div className="text-sm text-gray-600">
          {owner && (
            <Link href={`/u/${encodeURIComponent(owner.username)}`} className="underline">
              View boutique
            </Link>
          )}
        </div>
      </div>

      {loading && <div>Loading…</div>}
      {!loading && !filtered.length && (
        <div className="p-4 border rounded bg-white">
          No fragrances found for this brand in @{username}’s boutique.
        </div>
      )}

      {!loading && !!filtered.length && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((f) => {
            const img = bottleSrc(f);
            return (
              <li key={f.id} className="group">
                <Link
                  href={`/fragrance/${f.id}`}
                  className="block rounded-lg bg-white border hover:shadow-sm p-3 text-center"
                  title={`${f.brand} — ${f.name}`}
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
