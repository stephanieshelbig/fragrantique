'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

/* ------------------------------------------------------------------ */
/*  🎯 Exact shelf lines (percent from the top of the image)           */
/*  Tuned to your red-line mock. Adjust by ±0.3 if needed.             */
/* ------------------------------------------------------------------ */
const REDLINE_Y = [
  24.8, // Top shelf
  35.8,
  46.8,
  57.8,
  68.8,
  79.8, // Bottom shelf
];

/* Usable alcove from left/right in % (keep clear of the vases) */
const ALCOVE_LEFT = 17;   // widen/contract as you like
const ALCOVE_RIGHT = 83;

/* Micro-lift so bottoms “kiss” the shelf lip even with crop variance */
const BASELINE_NUDGE_PCT = 0.9;

/* Each shelf can have stacked rows (0 = on lip, 1 = slightly above)  */
const ROWS_PER_SHELF = 1; // for your red-lines we keep a single row per shelf

/* ------------------------------------------------------------------ */
/*  Responsive bottle sizing & column count                            */
/* ------------------------------------------------------------------ */
const H_DESKTOP = 58, H_TABLET = 48, H_MOBILE = 40; // bottle heights (px)

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
  return 14; // desktop: many bottles across the long shelf
}

/* Evenly spaced X centers across the alcove */
function makeCenters(n) {
  const span = ALCOVE_RIGHT - ALCOVE_LEFT;
  const step = span / (n + 1);
  return Array.from({ length: n }, (_, i) => ALCOVE_LEFT + step * (i + 1));
}

/* Preferred image src (transparent → fallback); add light cache-bust */
function bottleSrc(f) {
  const best = f?.image_url_transparent || f?.image_url;
  if (!best) return '/bottle-placeholder.png';
  const ver = f?.updated_at || f?.created_at || '';
  return `${best}${best.includes('?') ? '&' : '?'}v=${encodeURIComponent(ver)}`;
}

/* Y anchor for a shelf row (top of bottle container is translated up) */
function yForShelfRow(shelfIdx /*0=top*/, rowIdx /*0 on lip*/) {
  const shelfY = REDLINE_Y[Math.max(0, Math.min(REDLINE_Y.length - 1, shelfIdx))];
  const row = Math.max(0, Math.min(ROWS_PER_SHELF - 1, rowIdx || 0));
  return shelfY - row * 7.0 - BASELINE_NUDGE_PCT; // 7% hypothetical row height if we ever add row 1
}

/* ------------------------------------------------------------------ */
/*  Alphabetical grid: top shelves first, left→right across each row   */
/* ------------------------------------------------------------------ */
function layoutAlphaTopDown(items, colsPerShelf) {
  // sort brand then name (case-insensitive)
  const sorted = [...items].sort((a, b) => {
    const ab = (a?.fragrance?.brand || '').toLowerCase();
    const bb = (b?.fragrance?.brand || '').toLowerCase();
    if (ab !== bb) return ab.localeCompare(bb);
    const an = (a?.fragrance?.name || '').toLowerCase();
    const bn = (b?.fragrance?.name || '').toLowerCase();
    return an.localeCompare(bn);
  });

  const placed = [];
  let s = 0; // start at TOP shelf
  let r = 0;
  let c = 0;

  for (const it of sorted) {
    placed.push({
      ...it,
      _display_shelf: s,
      _display_row: r,
      _display_col: c,
    });

    c++;
    if (c >= colsPerShelf) { // wrap to next row on the same shelf
      c = 0; r++;
      if (r >= ROWS_PER_SHELF) { // then down to next shelf
        r = 0; s = Math.min(REDLINE_Y.length - 1, s + 1);
      }
    }
  }
  return placed;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function StephanieBoutique() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]); // user_fragrances joined to fragrances
  const [cols, setCols] = useState(columnsForWidth());
  const [bH, setBH] = useState(bottleH());
  const [alphaMode, setAlphaMode] = useState(true); // default to A→Z top→down
  const [showGuides, setShowGuides] = useState(false);

  const rootRef = useRef(null);
  const centers = useMemo(() => makeCenters(cols), [cols]);

  // Hotkey for guides
  useEffect(() => {
    const onKey = (e) => { if (e.key.toLowerCase() === 'g') setShowGuides(v => !v); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Responsive columns & bottle height
  useEffect(() => {
    const onResize = () => { setCols(columnsForWidth()); setBH(bottleH()); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load Stephanie’s shelf items (joined with fragrances)
  useEffect(() => {
    (async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', 'stephanie')
        .single();
      if (!prof) { setLoading(false); return; }

      const { data } = await supabase
        .from('user_fragrances')
        .select('id, position, shelf_index, row_index, column_index, fragrance:fragrances(*)')
        .eq('user_id', prof.id)
        .order('position', { ascending: true });

      // Flatten
      const mapped = (data || []).map((row, i) => ({
        linkId: row.id,
        position: row.position ?? i,
        shelf_index: row.shelf_index,
        row_index: row.row_index,
        column_index: row.column_index,
        fragrance: row.fragrance,
      }));

      setItems(mapped);
      setLoading(false);
    })();
  }, []);

  // Compute alphabetical grid (top → bottom)
  const alphaPlaced = useMemo(() => {
    if (!alphaMode) return null;
    return layoutAlphaTopDown(items, cols);
  }, [alphaMode, items, cols]);

  if (loading) return <div className="p-6">Loading your boutique…</div>;

  const renderList = alphaMode ? (alphaPlaced || []) : items; // (we keep manual mode available if you ever want to switch)
  const centersArr = centers;

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      <div
        ref={rootRef}
        className="relative w-full"
        style={{ aspectRatio: '3 / 2' }}
      >
        <Image
          src="/Fragrantique_boutiqueBackground.png"
          alt="Boutique Background"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />

        {/* Controls */}
        <div className="absolute right-4 top-4 z-20 flex gap-2">
          <button
            onClick={() => setAlphaMode(v => !v)}
            className={`px-3 py-1 rounded text-white ${alphaMode ? 'bg-pink-700' : 'bg-black/70'} hover:opacity-90`}
            title="Toggle A→Z by Brand (top shelves first)"
          >
            {alphaMode ? 'A→Z by Brand' : 'Manual layout'}
          </button>
          <button
            onClick={() => setShowGuides(v => !v)}
            className="px-3 py-1 rounded bg-black/50 text-white hover:opacity-90"
            title="Toggle shelf guides (G)"
          >
            Guides
          </button>
        </div>

        {/* Guides drawn at the exact red-line Y positions */}
        {showGuides && REDLINE_Y.map((y, i) => (
          <div
            key={`guide-y-${i}`}
            className="absolute left-0 right-0 border-t-2 border-pink-500/70"
            style={{ top: `${y}%` }}
          />
        ))}

        {/* Bottles */}
        {renderList.map((it, idx) => {
          // In alpha mode we use the computed display slots
          const colIdx = alphaMode
            ? (it._display_col ?? 0)
            : Math.max(0, Math.min(centersArr.length - 1, it.column_index ?? 0));

          const shelfIdx = alphaMode
            ? (it._display_shelf ?? 0)
            : Math.max(0, Math.min(REDLINE_Y.length - 1, it.shelf_index ?? REDLINE_Y.length - 1));

          const rowIdx = alphaMode ? (it._display_row ?? 0) : Math.max(0, Math.min(ROWS_PER_SHELF - 1, it.row_index ?? 0));

          const xPct = centersArr[Math.max(0, Math.min(centersArr.length - 1, colIdx))];
          const yPct = yForShelfRow(shelfIdx, rowIdx);

          return (
            <div
              key={it.linkId + (alphaMode ? '-alpha' : '')}
              className="absolute"
              style={{
                top: `${yPct}%`,
                left: `${xPct}%`,
                transform: 'translate(-50%, -100%)',
                height: `${bH}px`,
                pointerEvents: 'auto',
                cursor: 'pointer',
              }}
              title={`${it.fragrance?.brand || ''} — ${it.fragrance?.name || ''}`}
              onClick={() => {
                const id = it?.fragrance?.id;
                if (id) window.location.href = `/fragrance/${id}`;
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bottleSrc(it.fragrance)}
                alt={it.fragrance?.name || 'fragrance'}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
