'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

/* -----------------------------------------------
   Shelf red-lines (percent from top) – tuned
------------------------------------------------ */
const REDLINE_Y = [24.8, 35.8, 46.8, 57.8, 68.8, 79.8]; // top → bottom
const ALCOVE_LEFT = 17;
const ALCOVE_RIGHT = 83;
const BASELINE_NUDGE_PCT = 0.9;

/* One row per shelf for clean brand tiles */
const ROWS_PER_SHELF = 1;

/* Bottle sizing & columns */
const H_DESKTOP = 62, H_TABLET = 52, H_MOBILE = 42;
function bottleH() {
  if (typeof window === 'undefined') return H_DESKTOP;
  const w = window.innerWidth;
  if (w < 640) return H_MOBILE;
  if (w < 1024) return H_TABLET;
  return H_DESKTOP;
}
function columnsForWidth() {
  if (typeof window === 'undefined') return 14;
  const w = window.innerWidth;
  if (w < 640) return 8;
  if (w < 1024) return 11;
  return 14;
}
function centers(n) {
  const span = ALCOVE_RIGHT - ALCOVE_LEFT;
  const step = span / (n + 1);
  return Array.from({ length: n }, (_, i) => ALCOVE_LEFT + step * (i + 1));
}
function yForShelfRow(shelfIdx) {
  return REDLINE_Y[Math.max(0, Math.min(REDLINE_Y.length - 1, shelfIdx))] - BASELINE_NUDGE_PCT;
}

/* Helpers */
function slugifyBrand(b) {
  return (b || 'unknown')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function bottleSrc(f) {
  const best = f?.image_url_transparent || f?.image_url;
  if (!best) return '/bottle-placeholder.png';
  const ver = f?.updated_at || f?.created_at || '';
  return `${best}${best.includes('?') ? '&' : '?'}v=${encodeURIComponent(ver)}`;
}

/* Choose one representative per brand: prefer transparent → shortest name */
function chooseRepForBrand(list) {
  if (!list?.length) return null;
  const withTransparent = list.filter(x => !!x?.image_url_transparent);
  const pool = withTransparent.length ? withTransparent : list;
  return pool.sort((a, b) => (a?.name || '').length - (b?.name || '').length)[0];
}

/* Alphabetical brand layout: top shelves first, left→right */
function layoutBrandRepresentatives(brandReps, colsPerShelf) {
  const placed = [];
  let s = 0, c = 0; // start at top shelf, first column
  for (const item of brandReps) {
    placed.push({ ...item, _display_shelf: s, _display_col: c });
    c++;
    if (c >= colsPerShelf) { c = 0; s = Math.min(REDLINE_Y.length - 1, s + 1); }
  }
  return placed;
}

export default function StephanieBrandShelves() {
  const [loading, setLoading] = useState(true);
  const [cols, setCols] = useState(columnsForWidth());
  const [bH, setBH] = useState(bottleH());
  const [showGuides, setShowGuides] = useState(false);

  // Debug overlay info
  const [dbg, setDbg] = useState({
    foundProfile: 'no',
    userId: null,
    linkCount: 0,
    brandCount: 0,
    mode: 'user', // 'user' or 'global'
  });

  const [brands, setBrands] = useState([]); // [{brand, repFragrance}]
  const rootRef = useRef(null);
  const xCenters = useMemo(() => centers(cols), [cols]);

  // responsiveness
  useEffect(() => {
    const onResize = () => { setCols(columnsForWidth()); setBH(bottleH()); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load data with fallbacks:
  // 1) Try to find profile by username OR admin email
  // 2) Try to load user_fragrances → fragrances for that user
  // 3) If zero links/brands, fall back to global distinct brands from fragrances
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // 1) profile lookup
        const adminEmail = 'stephanieshelbig@gmail.com';
        let prof = null;

        const { data: byUser } = await supabase
          .from('profiles')
          .select('id, username, email')
          .eq('username', 'stephanie')
          .maybeSingle();

        if (byUser && byUser.id) {
          prof = byUser;
        } else {
          const { data: byEmail } = await supabase
            .from('profiles')
            .select('id, username, email')
            .eq('email', adminEmail)
            .maybeSingle();
          if (byEmail && byEmail.id) prof = byEmail;
        }

        if (!prof?.id) {
          // No profile found → global fallback mode
          await loadGlobalBrands();
          setDbg(d => ({ ...d, foundProfile: 'no', userId: null, mode: 'global' }));
          return;
        }

        // 2) user links
        const { data: links } = await supabase
          .from('user_fragrances')
          .select('fragrance_id')
          .eq('user_id', prof.id);

        const ids = Array.from(new Set((links || []).map(l => l.fragrance_id).filter(Boolean)));
        if (!ids.length) {
          // No links → global fallback
          await loadGlobalBrands();
          setDbg(d => ({ ...d, foundProfile: 'yes', userId: prof.id, linkCount: 0, mode: 'global' }));
          return;
        }

        // 3) fetch those fragrances
        const { data: frags } = await supabase
          .from('fragrances')
          .select('id, brand, name, image_url, image_url_transparent, updated_at, created_at')
          .in('id', ids);

        const byBrand = new Map();
        for (const f of (frags || [])) {
          const b = (f?.brand || 'Unknown').trim();
          if (!byBrand.has(b)) byBrand.set(b, []);
          byBrand.get(b).push(f);
        }

        let reps = Array.from(byBrand.entries())
          .map(([brand, list]) => ({ brand, repFragrance: chooseRepForBrand(list) }))
          .filter(x => !!x.repFragrance);

        reps.sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()));

        setBrands(reps);
        setDbg(d => ({ ...d, foundProfile: 'yes', userId: prof.id, linkCount: ids.length, brandCount: reps.length, mode: 'user' }));
      } finally {
        setLoading(false);
      }
    })();

    async function loadGlobalBrands() {
      // Distinct brands from the global fragrances table
      const { data: frags } = await supabase
        .from('fragrances')
        .select('id, brand, name, image_url, image_url_transparent, updated_at, created_at');

      const byBrand = new Map();
      for (const f of (frags || [])) {
        const b = (f?.brand || 'Unknown').trim();
        if (!byBrand.has(b)) byBrand.set(b, []);
        byBrand.get(b).push(f);
      }

      let reps = Array.from(byBrand.entries())
        .map(([brand, list]) => ({ brand, repFragrance: chooseRepForBrand(list) }))
        .filter(x => !!x.repFragrance);

      reps.sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()));

      setBrands(reps);
      setDbg(d => ({ ...d, brandCount: reps.length }));
    }
  }, []);

  const placed = useMemo(() => {
    return layoutBrandRepresentatives(brands, cols);
  }, [brands, cols]);

  if (loading) return <div className="p-6">Loading your boutique…</div>;

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      <div ref={rootRef} className="relative w-full" style={{ aspectRatio: '3 / 2' }}>
        <Image
          src="/Fragrantique_boutiqueBackground.png"
          alt="Boutique Background"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />

        {/* Debug pill so we can see what's happening */}
        <div className="absolute left-4 top-4 z-20 px-2 py-1 rounded bg-black/70 text-white text-[11px] leading-tight">
          <div>profile: {dbg.foundProfile}{dbg.userId ? ` (${dbg.userId.slice(0,8)}…)` : ''}</div>
          <div>mode: {dbg.mode}</div>
          <div>links: {dbg.linkCount} · brands: {dbg.brandCount} · cols: {cols}</div>
        </div>

        {/* Controls */}
        <div className="absolute right-4 top-4 z-20 flex gap-2">
          <Link href="/brand" className="px-3 py-1 rounded bg-black/70 text-white hover:opacity-90">
            Brand index
          </Link>
          <button
            onClick={() => setShowGuides(v => !v)}
            className="px-3 py-1 rounded bg-black/50 text-white hover:opacity-90"
            title="Toggle shelf guides (G)"
          >
            Guides
          </button>
        </div>

        {/* Guides */}
        {showGuides && REDLINE_Y.map((y, i) => (
          <div key={`gy-${i}`} className="absolute left-0 right-0 border-t-2 border-pink-500/70" style={{ top: `${y}%` }} />
        ))}

        {/* One bottle per brand */}
        {placed.map((b, idx) => {
          const frag = b.repFragrance;
          if (!frag) return null;

          const xIdx = Math.max(0, Math.min(xCenters.length - 1, b._display_col || 0));
          const xPct = xCenters[xIdx];
          const yPct = yForShelfRow(b._display_shelf || 0);
          const to = `/brand/${slugifyBrand(b.brand)}`;

        return (
            <Link
              key={`${b.brand}-${frag.id}-${idx}`}
              href={to}
              className="absolute"
              style={{
                top: `${yPct}%`,
                left: `${xPct}%`,
                transform: 'translate(-50%, -100%)',
                height: `${bH}px`,
              }}
              title={`${b.brand} — view collection`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bottleSrc(frag)}
                alt={frag?.name || b.brand}
                className="object-contain"
                style={{
                  height: '100%',
                  width: 'auto',
                  mixBlendMode: 'multiply',
                  filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
                }}
                draggable={false}
                onError={(e) => {
                  const img = e.currentTarget;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = '1';
                    img.src = '/bottle-placeholder.png';
                  }
                }}
              />
              <div
                className="absolute left-1/2 -bottom-5 -translate-x-1/2 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-black/55 text-white backdrop-blur"
              >
                {b.brand}
              </div>
            </Link>
          );
        })}

        {placed.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-4 py-2 rounded bg-black/60 text-white text-sm">
              No brand representatives found. Use the Brand index or Import tools.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
