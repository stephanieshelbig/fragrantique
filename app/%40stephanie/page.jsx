'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

/* -------------------------------------------------------------
   SHELF LINES (percent from top of the background image)
   These are tuned to your red guides and skip the chandelier row.
   If a line is a hair off, nudge by ±0.3.
------------------------------------------------------------- */
const REDLINE_Y = [
  // 24.8, // (old top line under chandelier — intentionally disabled)
  35.8,
  46.8,
  57.8,
  68.8,
  79.8,
];

/* Keep bottles only in the center alcove so labels don’t collide
   with the side niches or flowers. Tighten if you want more spacing. */
const ALCOVE_LEFT = 22;   // %
const ALCOVE_RIGHT = 78;  // %

/* Lift bottles a touch so their bottoms kiss the shelf lip */
const BASELINE_NUDGE_PCT = 0.8;

/* Bottle sizing & per-shelf column count (kept modest to avoid clutter) */
const H_DESKTOP = 56, H_TABLET = 48, H_MOBILE = 40;
const COLS_DESKTOP = 10, COLS_TABLET = 8, COLS_MOBILE = 6;

function bottleH() {
  if (typeof window === 'undefined') return H_DESKTOP;
  const w = window.innerWidth;
  if (w < 640) return H_MOBILE;
  if (w < 1024) return H_TABLET;
  return H_DESKTOP;
}
function columnsForWidth() {
  if (typeof window === 'undefined') return COLS_DESKTOP;
  const w = window.innerWidth;
  if (w < 640) return COLS_MOBILE;
  if (w < 1024) return COLS_TABLET;
  return COLS_DESKTOP;
}
function centers(n) {
  const span = ALCOVE_RIGHT - ALCOVE_LEFT;
  const step = span / (n + 1);
  return Array.from({ length: n }, (_, i) => ALCOVE_LEFT + step * (i + 1));
}
function yForShelf(shelfIdx) {
  const i = Math.max(0, Math.min(REDLINE_Y.length - 1, shelfIdx));
  return REDLINE_Y[i] - BASELINE_NUDGE_PCT;
}
function slugifyBrand(b) {
  return (b || 'unknown')
    .toLowerCase().replace(/&/g,'and')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}
function bottleSrc(f) {
  const best = f?.image_url_transparent || f?.image_url;
  if (!best) return '/bottle-placeholder.png';
  return best; // we removed updated_at dependency since your table may not have it
}

/* Lay out top shelves first, left→right (one bottle per brand) */
function layoutBrandReps(reps, colsPerShelf) {
  const placed = [];
  let s = 0, c = 0; // start at top shelf
  for (const item of reps) {
    placed.push({ ...item, _shelf: s, _col: c });
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

  const [info, setInfo] = useState({ mode: 'user', linkCount: 0, brandCount: 0 });
  const [reps, setReps] = useState([]); // [{ brand, repFragrance }]

  const rootRef = useRef(null);
  const xCenters = useMemo(() => centers(cols), [cols]);

  // responsiveness
  useEffect(() => {
    const onResize = () => { setCols(columnsForWidth()); setBH(bottleH()); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // load server-computed reps (uses service-role via API route)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/brand-reps?user=stephanie', { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j?.ok) {
          setInfo({ mode: j.mode, linkCount: j.linkCount, brandCount: j.brandCount });
          setReps(j.reps || []);
        } else {
          setInfo({ mode: `error: ${j?.error || res.status}`, linkCount: 0, brandCount: 0 });
          setReps([]);
        }
      } catch (e) {
        setInfo({ mode: `error: ${e?.message || 'fetch failed'}`, linkCount: 0, brandCount: 0 });
        setReps([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const placed = useMemo(() => layoutBrandReps(reps, cols), [reps, cols]);
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

        {/* Debug pill */}
        <div className="absolute left-4 top-4 z-20 px-2 py-1 rounded bg-black/70 text-white text-[11px] leading-tight">
          <div>mode: {info.mode}</div>
          <div>links: {info.linkCount} · brands: {info.brandCount} · cols: {cols}</div>
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

        {/* One bottle per brand — baseline snapped to shelf lines */}
        {placed.map((b, idx) => {
          const f = b.repFragrance;
          if (!f) return null;

          const xIdx = Math.max(0, Math.min(xCenters.length - 1, b._col || 0));
          const xPct = xCenters[xIdx];
          const yPct = yForShelf(b._shelf || 0);
          const to = `/brand/${slugifyBrand(b.brand)}`;

          return (
            <Link
              key={`${b.brand}-${f.id}-${idx}`}
              href={to}
              className="absolute"
              style={{
                top: `${yPct}%`,
                left: `${xPct}%`,
                transform: 'translate(-50%, -100%)', // anchor bottom on the line
                height: `${bH}px`,
              }}
              title={`${b.brand} — view collection`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bottleSrc(f)}
                alt={f?.name || b.brand}
                className="object-contain"
                style={{
                  height: '100%',
                  width: 'auto',
                  mixBlendMode: 'multiply',
                  filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.14))',
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
              No brand representatives found.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
