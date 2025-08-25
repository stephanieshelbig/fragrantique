'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

/**
 * Public brand-position layout (no auto-publish):
 * - Reads public positions for the viewed user (is_public = true).
 * - If viewer is the same user, also reads private positions and overrides.
 * - Drag saves with is_public: true (owner only, explicit move).
 * - Robust brand-key matching (strict + canonical) and race-free save.
 */

const CANVAS_ASPECT = '3 / 2';
const DEFAULT_H = 54;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const pxToPct = (x, total) => (x / total) * 100;
const toNum = (v) => (v === null || v === undefined || v === '' ? undefined : Number(v));
const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);
const bottleSrc = (f) => f?.image_url_transparent || f?.image_url || '/bottle-placeholder.png';

/** Strict normalization (legacy) */
const brandKey = (b) =>
  (b || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Canonical normalization (more aggressive) */
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

function chooseRepForBrand(list) {
  if (!list?.length) return null;
  const manual = list.filter(it => it.manual);
  if (manual.length) return manual[0];
  const withTransparent = list.filter(it => !!it.frag?.image_url_transparent);
  if (withTransparent.length) {
    return withTransparent.sort((a, b) => (a.frag?.name || '').length - (b.frag?.name || '').length)[0];
  }
  return list.sort((a, b) => (a.frag?.name || '').length - (b.frag?.name || '').length)[0];
}

export default function UserBoutiquePage({ params }) {
  const username = decodeURIComponent(params.username);

  const [authReady, setAuthReady]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [links, setLinks]           = useState([]);
  const [dbPositions, setDbPositions] = useState({});
  const [viewerId, setViewerId]     = useState(null);
  const [profileId, setProfileId]   = useState(null);

  const rootRef = useRef(null);

  // Wait for auth, load viewer + data
  useEffect(() => {
    let sub = null;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      setViewerId(sess?.session?.user?.id || null);
      setAuthReady(true);
      await loadData(sess?.session?.user?.id || null);
      sub = supabase.auth.onAuthStateChange(async (_event, session) => {
        setViewerId(session?.user?.id || null);
        await loadData(session?.user?.id || null);
      }).data?.subscription || null;
    })();
    return () => { if (sub) sub.unsubscribe(); };
  }, [username]);

  async function loadData(currentViewerId) {
    setLoading(true);

    const { data: prof } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();

    if (!prof?.id) {
      setProfileId(null);
      setLinks([]); 
      setLoading(false);
      return;
    }
    setProfileId(prof.id);

    const { data: rows } = await supabase
      .from('user_fragrances')
      .select(`
        id,
        user_id,
        fragrance_id,
        x_pct,
        y_pct,
        manual,
        fragrance:fragrances(id, brand, name, image_url, image_url_transparent)
      `)
      .eq('user_id', prof.id);

    const mapped = (rows || []).map(r => ({
      linkId: r.id,
      frag: r.fragrance
    }));
    setLinks(mapped);

    setLoading(false);
  }

  const reps = useMemo(() => {
    const byBrand = new Map();
    for (const it of links) {
      const strict = brandKey(it.frag?.brand);
      if (!byBrand.has(strict)) byBrand.set(strict, []);
      byBrand.get(strict).push(it);
    }

    return Array.from(byBrand.entries()).map(([strict, list]) => {
      const rep = chooseRepForBrand(list);
      return { ...rep, brand: rep?.frag?.brand || 'Unknown' };
    }).filter(Boolean);
  }, [links]);

  if (!authReady) return <div className="p-6">Starting session…</div>;
  if (loading)     return <div className="p-6">Loading boutique…</div>;

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      {/* Boutique Header - moved down with margin */}
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

      <div className="relative w-full" ref={rootRef} style={{ aspectRatio: CANVAS_ASPECT }}>
        <Image
          src="/Fragrantique_boutiqueBackground.png"
          alt="Boutique"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />

        {/* One bottle per brand */}
        {reps.map((it) => {
          const href = `/u/${encodeURIComponent(username)}/brand/${brandKey(it.brand)}`;
          return (
            <Link
              key={it.linkId}
              href={href}
              prefetch={false}
              className="group absolute select-none cursor-pointer"
              style={{ top: '80%', left: '50%', transform: 'translate(-50%, -100%)', height: `${DEFAULT_H}px` }}
              title={`${it.brand} — view all`}
            >
              <img
                src={bottleSrc(it.frag)}
                alt={it.frag?.name || 'fragrance'}
                className="object-contain"
                style={{
                  height: '100%',
                  width: 'auto',
                  filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
                  userSelect: 'none',
                }}
                draggable={false}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
