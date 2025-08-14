'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

/* ------------------------------------------------------------------ */
/*  Shelf geometry (tuned to your background)                         */
/* ------------------------------------------------------------------ */
/** Shelf lip Y positions in % (0 = top of image) — tuned for your bg */
const SHELF_TOP_Y = [
  33.6, // top
  44.3,
  55.1,
  65.8,
  76.6,
  87.3, // bottom
];

/** Usable alcove bounds left/right (in %) */
const SHELF_LEFT_PCT = 20;
const SHELF_RIGHT_PCT = 80;

/** Baseline micro-lift so bottoms kiss the lip even with crop variance */
const BASELINE_NUDGE_PCT = 0.9;

/** Each shelf can have this many stacked rows (0 = on lip, 1 = a bit above) */
const ROWS_PER_SHELF = 2;
/** Vertical distance from the shelf lip to the next stack row (in %) */
const ROW_OFFSET_PCT = 7.2;

/* ------------------------------------------------------------------ */
/*  Responsive sizing & columns                                       */
/* ------------------------------------------------------------------ */
const H_DESKTOP = 60, H_TABLET = 50, H_MOBILE = 42; // bottle heights (px)

function bottleH() {
  if (typeof window === 'undefined') return H_DESKTOP;
  const w = window.innerWidth;
  if (w < 640) return H_MOBILE;
  if (w < 1024) return H_TABLET;
  return H_DESKTOP;
}

function columnCount() {
  if (typeof window === 'undefined') return 9;
  const w = window.innerWidth;
  if (w < 640) return 5;
  if (w < 1024) return 7;
  return 9;
}

/** Evenly spaced X centers (in %) across the alcove */
function makeCenters(n) {
  const span = SHELF_RIGHT_PCT - SHELF_LEFT_PCT;
  const step = span / (n + 1);
  return Array.from({ length: n }, (_, i) => SHELF_LEFT_PCT + step * (i + 1));
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                         */
/* ------------------------------------------------------------------ */
function bottleSrc(f) {
  const best = f?.image_url_transparent || f?.image_url;
  if (!best) return '/bottle-placeholder.png';
  const ver = f?.updated_at || f?.created_at || '';
  return `${best}${best.includes('?') ? '&' : '?'}v=${encodeURIComponent(ver)}`;
}

function shelfRowY(shelfIndex, rowIndex) {
  const shelfY = SHELF_TOP_Y[Math.max(0, Math.min(SHELF_TOP_Y.length - 1, shelfIndex))];
  const row = Math.max(0, Math.min(ROWS_PER_SHELF - 1, rowIndex || 0));
  return shelfY - row * ROW_OFFSET_PCT - BASELINE_NUDGE_PCT;
}

function nearestShelfRow(yPct) {
  let best = { shelf: 0, row: 0 }, dist = Infinity;
  for (let s = 0; s < SHELF_TOP_Y.length; s++) {
    for (let r = 0; r < ROWS_PER_SHELF; r++) {
      const y = shelfRowY(s, r);
      const d = Math.abs(yPct - y);
      if (d < dist) { dist = d; best = { shelf: s, row: r }; }
    }
  }
  return best;
}

function nearestColumnIndex(leftPct, centers) {
  let best = 0, dist = Infinity;
  centers.forEach((x, i) => {
    const d = Math.abs(leftPct - x);
    if (d < dist) { dist = d; best = i; }
  });
  return best;
}

/** When saved coordinates are missing, place bottom→top & left→right once */
function applyBottomFirstDefaults(list, colsPerShelf) {
  if (!list?.length) return [];
  const out = [];
  const bottom = SHELF_TOP_Y.length - 1; // last shelf index
  let s = bottom, r = 0, c = 0;

  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    let shelf_index = Number.isInteger(it.shelf_index) ? it.shelf_index : null;
    let row_index   = Number.isInteger(it.row_index)   ? it.row_index   : null;
    let column_index= Number.isInteger(it.column_index)? it.column_index: null;

    if (shelf_index == null || row_index == null || column_index == null) {
      shelf_index  = s;
      row_index    = r;
      column_index = c;
      c++;
      if (c >= colsPerShelf) { c = 0; r++; if (r >= ROWS_PER_SHELF) { r = 0; s = Math.max(0, s - 1); } }
      it._needsSave = true;
    }
    out.push({ ...it, shelf_index, row_index, column_index });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Alphabetical layout (A→Z by Brand, then Name)                      */
/*  Creates display-only positions left→right, bottom→top             */
/* ------------------------------------------------------------------ */
function layoutAlphabeticalByBrand(items, colsPerShelf) {
  // 1) Flatten and sort by brand then name (case-insensitive)
  const sorted = [...items].sort((a, b) => {
    const ab = (a?.fragrance?.brand || 'Unknown').toLowerCase();
    const bb = (b?.fragrance?.brand || 'Unknown').toLowerCase();
    if (ab !== bb) return ab.localeCompare(bb);
    const an = (a?.fragrance?.name || '').toLowerCase();
    const bn = (b?.fragrance?.name || '').toLowerCase();
    return an.localeCompare(bn);
  });

  // 2) Fill positions left→right across the bottom shelf, then wrap
  const placed = [];
  const labels = []; // brand badges
  const bottom = SHELF_TOP_Y.length - 1;
  let s = bottom, r = 0, c = 0;

  let lastBrand = null;
  let brandStart = null;

  for (const it of sorted) {
    const brand = (it?.fragrance?.brand || 'Unknown').trim();

    // record start of a brand block (for label)
    if (brand !== lastBrand) {
      brandStart = { brand, s, r, c };
      lastBrand = brand;
    }

    placed.push({ ...it, _display_shelf: s, _display_row: r, _display_col: c });

    c++;
    if (c >= colsPerShelf) { c = 0; r++; if (r >= ROWS_PER_SHELF) { r = 0; s = Math.max(0, s - 1); } }

    // If next item is different brand, push a label where this brand began
    const nextIdx = placed.length;
    const nextBrand = sorted[nextIdx]?.fragrance?.brand;
    if (nextBrand !== lastBrand && brandStart) {
      labels.push(brandStart);
      brandStart = null;
    }
  }
  // push label for last brand
  if (brandStart) labels.push(brandStart);

  return { placed, labels };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function StephanieBoutique() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]); // user_fragrances joined to fragrances
  const [bH, setBH] = useState(bottleH());
  const [cols, setCols] = useState(columnCount());
  const [arrange, setArrange] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [drag, setDrag] = useState(null);
  const [dragPos, setDragPos] = useState(null);
  const [alphaMode, setAlphaMode] = useState(true); // NEW: default to A→Z by brand

  const rootRef = useRef(null);
  const centers = useMemo(() => makeCenters(cols), [cols]);

  // hotkey for guides
  useEffect(() => {
    const onKey = (e) => { if (e.key.toLowerCase() === 'g') setShowGuides(v => !v); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // responsive sizing
  useEffect(() => {
    const onResize = () => { setBH(bottleH()); setCols(columnCount()); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // load profile + shelves
  useEffect(() => {
    (async () => {
      // profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', 'stephanie')
        .single();

      if (!prof) { setLoading(false); return; }
      setUserId(prof.id);

      // joined shelves
      const { data } = await supabase
        .from('user_fragrances')
        .select('id, position, shelf_index, row_index, column_index, column_key, fragrance:fragrances(*)')
        .eq('user_id', prof.id)
        .order('position', { ascending: true });

      const mapped = (data || []).map((row, i) => ({
        linkId: row.id,
        position: row.position ?? i,
        shelf_index: row.shelf_index,
        row_index: row.row_index,
        column_index: Number.isInteger(row.column_index)
          ? row.column_index
          : (row.column_key === 'left' ? 0 : row.column_key === 'center' ? 1 : row.column_key === 'right' ? 2 : null),
        fragrance: row.fragrance,
      }));

      // only persist defaults in manual (non-alpha) mode;
      // but we still compute defaults so everything has coords if you switch
      const withDefaults = applyBottomFirstDefaults(mapped, cols);
      if (!alphaMode) {
        for (const it of withDefaults) {
          if (it._needsSave) {
            await supabase
              .from('user_fragrances')
              .update({
                shelf_index: it.shelf_index,
                row_index: it.row_index,
                column_index: it.column_index,
                position: it.position,
              })
              .eq('id', it.linkId)
              .eq('user_id', prof.id);
          }
        }
      }

      setItems(withDefaults);
      setLoading(false);
    })();
  // re-run when columns or alphaMode changes (affects default layout calc)
  }, [cols, alphaMode]);

  /* ------------------------ Drag (manual) --------------------------- */
  function onPointerDown(e, idx) {
    if (alphaMode) {
      const id = items[idx]?.fragrance?.id;
      if (id) window.location.href = `/fragrance/${id}`;
      return;
    }
    if (!arrange) {
      const id = items[idx]?.fragrance?.id;
      if (id) window.location.href = `/fragrance/${id}`;
      return;
    }
    if (!rootRef.current) return;
    const box = rootRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - box.left) / box.width) * 100;
    const yPct = ((e.clientY - box.top) / box.height) * 100;
    setDrag({ idx });
    setDragPos({ xPct, yPct });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (alphaMode || !arrange || !drag || !rootRef.current) return;
    const box = rootRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - box.left) / box.width) * 100;
    const yPct = ((e.clientY - box.top) / box.height) * 100;
    setDragPos({ xPct, yPct });
  }
  async function onPointerUp() {
    if (alphaMode || !arrange || !drag || !dragPos) { setDrag(null); return; }
    await placeAndSave(drag.idx, dragPos.xPct, dragPos.yPct);
    setDrag(null);
    setDragPos(null);
  }

  async function placeAndSave(idx, xPct, yPct) {
    const it = items[idx];
    const { shelf: s, row: r } = nearestShelfRow(yPct);
    const c = nearestColumnIndex(xPct, centers);

    const next = items.map((x, i) =>
      i === idx ? ({ ...x, shelf_index: s, row_index: r, column_index: c }) : x
    );
    setItems(next);

    if (userId) {
      await supabase
        .from('user_fragrances')
        .update({ shelf_index: s, row_index: r, column_index: c, position: it.position ?? idx })
        .eq('id', it.linkId)
        .eq('user_id', userId);
    }
  }

  /* ---------------------- Alphabetical layout ---------------------- */
  const alphaLayout = useMemo(() => {
    if (!alphaMode) return null;
    return layoutAlphabeticalByBrand(items, cols);
  }, [alphaMode, items, cols]);

  if (loading) return <div className="p-6">Loading your boutique…</div>;

  const toRender = alphaMode ? (alphaLayout?.placed || []) : items;
  const centersArr = centers;

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      <div
        ref={rootRef}
        className="relative w-full"
        style={{ aspectRatio: '3 / 2' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <Image
          src="/Fragrantique_boutiqueBackground.png"
          alt="Boutique Background"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />

        {/* Controls */}
        <div className="absolute right-4 top-4 z-20 pointer-events-auto flex flex-wrap gap-2">
          <button
            onClick={() => setAlphaMode(v => !v)}
            className={`px-3 py-1 rounded text-white ${alphaMode ? 'bg-pink-700' : 'bg-black/70'} hover:opacity-90`}
            title="Toggle A→Z by Brand layout"
          >
            {alphaMode ? 'A→Z by Brand' : 'Manual layout'}
          </button>

          <button
            onClick={() => setShowGuides(v => !v)}
            className="px-3 py-1 rounded bg-black/50 text-white hover:opacity-90"
            title="Toggle alignment guides (G)"
          >
            Guides
          </button>

          <button
            onClick={() => !alphaMode && setArrange(v => !v)}
            className={`px-3 py-1 rounded text-white ${arrange && !alphaMode ? 'bg-pink-700' : 'bg-black/70'} hover:opacity-90 ${alphaMode ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={alphaMode ? 'Disable A→Z to arrange manually' : 'Drag bottles to reposition'}
            disabled={alphaMode}
          >
            {arrange && !alphaMode ? 'Done' : 'Arrange shelves'}
          </button>
        </div>

        {/* Brand labels (alpha mode) */}
        {alphaMode && alphaLayout?.labels?.map((lab) => {
          const xPct = centersArr[Math.max(0, Math.min(centersArr.length - 1, lab.c))];
          const yPct = shelfRowY(lab.s, lab.r) - 3.0;
          return (
            <div
              key={`label-${lab.brand}-${lab.s}-${lab.r}-${lab.c}`}
              className="absolute z-10 px-2 py-1 rounded-lg bg-black/55 text-white text-xs font-semibold backdrop-blur"
              style={{ top: `${yPct}%`, left: `${xPct}%`, transform: 'translate(-50%, -100%)' }}
            >
              {lab.brand}
            </div>
          );
        })}

        {/* Guides */}
        {showGuides && (
          <>
            {SHELF_TOP_Y.map((y, i) => (
              <div key={`gy-${i}`} className="absolute left-0 right-0 border-top border-t-2 border-pink-500/60" style={{ top: `${y}%` }} />
            ))}
            {SHELF_TOP_Y.flatMap((_, s) =>
              Array.from({ length: ROWS_PER_SHELF }, (_, r) => (
                <div key={`gry-${s}-${r}`} className="absolute left-0 right-0 border-t border-pink-500/30" style={{ top: `${shelfRowY(s, r)}%` }} />
              ))
            )}
            {makeCenters(cols).map((x, i) => (
              <div key={`gx-${i}`} className="absolute top-0 bottom-0 border-l-2 border-pink-500/40" style={{ left: `${x}%` }} />
            ))}
          </>
        )}

        {/* Bottles */}
        {toRender.map((it, idx) => {
          const colIdx = alphaMode ? (it._display_col ?? 0)
                                   : Math.max(0, Math.min(centersArr.length - 1, it.column_index ?? 0));
          const shelfIdx = alphaMode ? (it._display_shelf ?? SHELF_TOP_Y.length - 1)
                                     : Math.max(0, Math.min(SHELF_TOP_Y.length - 1, it.shelf_index ?? SHELF_TOP_Y.length - 1));
          const rowIdx   = alphaMode ? (it._display_row ?? 0)
                                     : Math.max(0, Math.min(ROWS_PER_SHELF - 1, it.row_index ?? 0));

          const xPct = centersArr[Math.max(0, Math.min(centersArr.length - 1, colIdx))];
          const yPct = shelfRowY(shelfIdx, rowIdx);
          const draggingThis = drag && drag.idx === idx;

          return (
            <div
              key={it.linkId + (alphaMode ? '-az' : '')}
              className={`absolute ${(!alphaMode && arrange) ? 'ring-1 ring-pink-400/50 rounded-md' : ''}`}
              style={{
                top: `${yPct}%`,
                left: `${xPct}%`,
                transform: 'translate(-50%, -100%)',
                height: `${bH}px`,
                pointerEvents: 'auto',
                cursor: (!alphaMode && arrange) ? 'grab' : 'pointer',
                zIndex: draggingThis ? 30 : 'auto',
              }}
              title={`${it.fragrance?.brand || ''} — ${it.fragrance?.name || ''}`}
              onPointerDown={(e) => onPointerDown(e, idx)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bottleSrc(it.fragrance)}
                alt={it.fragrance?.name || 'fragrance'}
                className="object-contain transition-transform duration-150"
                style={{
                  height: '100%',
                  width: 'auto',
                  mixBlendMode: 'multiply',
                  filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
                  touchAction: 'none',
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
