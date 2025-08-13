'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

/** Shelf TOP edges (% from image top). Tuned so bottoms sit on the lip. */
const SHELF_TOP_Y = [28.5, 39.3, 49.6, 59.7, 69.8, 78.9, 83.0]; // 0 = top, 6 = bottom

/** Inner alcove bounds (where bottles can sit), as % from left edge */
const SHELF_LEFT_PCT = 20;
const SHELF_RIGHT_PCT = 80;

/** Responsive bottle heights */
const H_DESKTOP = 60, H_TABLET = 50, H_MOBILE = 42; // half-size-ish
function bottleH() {
  if (typeof window === 'undefined') return H_DESKTOP;
  const w = window.innerWidth;
  if (w < 640) return H_MOBILE;
  if (w < 1024) return H_TABLET;
  return H_DESKTOP;
}

/** Responsive columns per shelf */
function columnCount() {
  if (typeof window === 'undefined') return 9;
  const w = window.innerWidth;
  if (w < 640) return 5;
  if (w < 1024) return 7;
  return 9;
}

/** How many vertical rows can a shelf hold (stacking up above the lip)? */
const ROWS_PER_SHELF = 2;
/** Each extra row sits this much *above* the shelf lip (percent of image height) */
const ROW_OFFSET_PCT = 7.5;

/** Evenly spaced X centers (in %) across the inner bounds */
function makeCenters(n) {
  const span = SHELF_RIGHT_PCT - SHELF_LEFT_PCT;
  const step = span / (n + 1);
  return Array.from({ length: n }, (_, i) => SHELF_LEFT_PCT + step * (i + 1));
}

/** Prefer transparent PNG; cache-bust with a version param */
function bottleSrc(f) {
  const best = f?.image_url_transparent || f?.image_url;
  if (!best) return '/bottle-placeholder.png';
  const base = best.startsWith('http')
    ? best
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${best}`;
  const ver = f?.created_at ? new Date(f.created_at).getTime() : Date.now();
  return `${base}${base.includes('?') ? '&' : '?'}v=${ver}`;
}

/** Compute the exact anchor Y for a given shelf + row */
function shelfRowY(shelfIndex, rowIndex) {
  const shelfY = SHELF_TOP_Y[Math.max(0, Math.min(SHELF_TOP_Y.length - 1, shelfIndex))];
  const row = Math.max(0, Math.min(ROWS_PER_SHELF - 1, rowIndex || 0));
  // Row 0 rests on the lip; row 1 sits slightly above; row 2 would be even higher, etc.
  return shelfY - row * ROW_OFFSET_PCT;
}

/** Snap helpers (used when not grouped) */
function nearestShelfRow(yPct) {
  let best = { shelf: 0, row: 0 };
  let dist = Infinity;
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

/** Bottom-first defaults (used when not grouped) */
function applyBottomFirstDefaults(list, colsPerShelf) {
  if (!list?.length) return [];
  const out = [];
  const bottom = SHELF_TOP_Y.length - 1; // 6
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

      // advance position
      c++;
      if (c >= colsPerShelf) { c = 0; r++; if (r >= ROWS_PER_SHELF) { r = 0; s = Math.max(0, s - 1); } }
      it._needsSave = true; // one-time persist
    }

    out.push({ ...it, shelf_index, row_index, column_index });
  }
  return out;
}

/** Group-by-brand layout (does NOT overwrite DB; used only when toggle is ON)
 *  Each brand starts at the next available left slot; we fill left→right across rows,
 *  then up to the next shelf. We also emit a label position for each brand.
 */
function layoutByBrand(items, colsPerShelf) {
  // Group by brand (stable), sort brands alphabetically, items by name
  const groups = new Map();
  for (const it of items) {
    const brand = (it?.fragrance?.brand || 'Unknown').trim();
    if (!groups.has(brand)) groups.set(brand, []);
    groups.get(brand).push(it);
  }
  const brandNames = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  for (const b of brandNames) {
    groups.get(b).sort((a, b2) => (a?.fragrance?.name || '').localeCompare((b2?.fragrance?.name || ''), undefined, { sensitivity: 'base' }));
  }

  const placed = [];
  const labels = [];
  const bottom = SHELF_TOP_Y.length - 1;
  let s = bottom, r = 0, c = 0;

  for (const brand of brandNames) {
    const arr = groups.get(brand) || [];
    if (!arr.length) continue;

    // Start brand at the beginning of a "row" if there's not enough space?
    // Simple rule: if there are fewer than 2 columns left, bump to next row for nicer grouping block
    if (colsPerShelf - c < 2 && c !== 0) {
      c = 0; r++;
      if (r >= ROWS_PER_SHELF) { r = 0; s = Math.max(0, s - 1); }
    }

    // Record where this brand starts (for label)
    const startS = s, startR = r, startC = c;

    for (const it of arr) {
      placed.push({
        ...it,
        _display_shelf: s,
        _display_row: r,
        _display_col: c
      });
      c++;
      if (c >= colsPerShelf) { c = 0; r++; if (r >= ROWS_PER_SHELF) { r = 0; s = Math.max(0, s - 1); } }
    }

    labels.push({ brand, s: startS, r: startR, c: startC });
    // Add a small gap (one column) between brands if space remains on this row
    if (c < colsPerShelf - 1) {
      c++;
      if (c >= colsPerShelf) { c = 0; r++; if (r >= ROWS_PER_SHELF) { r = 0; s = Math.max(0, s - 1); } }
    }
  }

  return { placed, labels };
}

export default function StephanieBoutique() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]); // [{ linkId, position, shelf_index, row_index, column_index, fragrance }]
  const [bH, setBH] = useState(bottleH());
  const [cols, setCols] = useState(columnCount());
  const rootRef = useRef(null);
  const [arrange, setArrange] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [drag, setDrag] = useState(null);
  const [dragPos, setDragPos] = useState(null);
  const [groupByBrand, setGroupByBrand] = useState(false);

  // Guides hotkey
  useEffect(() => {
    const onKey = (e) => { if (e.key.toLowerCase() === 'g') setShowGuides(v => !v); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Responsive sizes / columns
  useEffect(() => {
    const onResize = () => { setBH(bottleH()); setCols(columnCount()); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const centers = useMemo(() => makeCenters(cols), [cols]);

  // Load shelves for 'stephanie'
  useEffect(() => {
    (async () => {
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', 'stephanie')
        .single();
      if (pErr || !prof) { setLoading(false); return; }
      setUserId(prof.id);

      const { data, error } = await supabase
        .from('user_fragrances')
        .select('id, position, shelf_index, row_index, column_index, column_key, fragrance:fragrances(*)')
        .eq('user_id', prof.id)
        .order('position', { ascending: true });

      if (error) { setLoading(false); return; }

      const mapped = (data || []).map((row, i) => ({
        linkId: row.id,
        position: row.position ?? i,
        shelf_index: row.shelf_index,
        row_index: row.row_index,
        // back-compat for old column_key
        column_index: Number.isInteger(row.column_index)
          ? row.column_index
          : (row.column_key === 'left' ? 0 : row.column_key === 'center' ? 1 : row.column_key === 'right' ? 2 : null),
        fragrance: row.fragrance,
      }));

      // If not grouped: fill missing positions with defaults for persistence
      const withDefaults = applyBottomFirstDefaults(mapped, cols);
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

      setItems(withDefaults);
      setLoading(false);
    })();
    // Re-run when column count changes (so defaults use the fresh grid)
  }, [cols]);

  // Drag handlers (disabled in group mode)
  function onPointerDown(e, idx) {
    if (groupByBrand) {
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
    if (groupByBrand || !arrange || !drag || !rootRef.current) return;
    const box = rootRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - box.left) / box.width) * 100;
    const yPct = ((e.clientY - box.top) / box.height) * 100;
    setDragPos({ xPct, yPct });
  }
  async function onPointerUp() {
    if (groupByBrand || !arrange || !drag || !dragPos) { setDrag(null); return; }
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

  // Grouped placements (computed, not persisted)
  const groupedLayout = useMemo(() => {
    if (!groupByBrand) return null;
    return layoutByBrand(items, cols);
  }, [groupByBrand, items, cols]);

  if (loading) return <div className="p-6">Loading your boutique…</div>;

  const toRender = groupByBrand
    ? (groupedLayout?.placed || [])
    : items;

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      {/* Fixed 3:2 box so shelf % positions stay accurate */}
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
            onClick={() => setGroupByBrand(v => !v)}
            className={`px-3 py-1 rounded text-white ${groupByBrand ? 'bg-pink-700' : 'bg-black/70'} hover:opacity-90`}
            title="Toggle grouped-by-brand view"
          >
            {groupByBrand ? 'Grouped by Brand' : 'Group by Brand'}
          </button>

          <button
            onClick={() => setShowGuides(v => !v)}
            className="px-3 py-1 rounded bg-black/50 text-white hover:opacity-90"
            title="Toggle alignment guides (G)"
          >
            Guides
          </button>

          <button
            onClick={() => !groupByBrand && setArrange(v => !v)}
            className={`px-3 py-1 rounded text-white ${arrange && !groupByBrand ? 'bg-pink-700' : 'bg-black/70'} hover:opacity-90 ${groupByBrand ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={groupByBrand ? 'Disable Group by Brand to arrange manually' : 'Drag bottles to reposition (press G to toggle guides)'}
            disabled={groupByBrand}
          >
            {arrange && !groupByBrand ? 'Done' : 'Arrange shelves'}
          </button>
        </div>

        {/* Group labels */}
        {groupByBrand && groupedLayout?.labels?.map((lab) => {
          const xCenters = centers;
          const xPct = xCenters[Math.max(0, Math.min(xCenters.length - 1, lab.c))];
          const yPct = shelfRowY(lab.s, lab.r) - 3; // a bit above the bottles
          return (
            <div
              key={`label-${lab.brand}-${lab.s}-${lab.r}-${lab.c}`}
              className="absolute z-10 px-2 py-1 rounded-lg bg-black/55 text-white text-xs font-semibold backdrop-blur"
              style={{ top: `${yPct}%`, left: `${xPct}%`, transform: 'translate(-50%, -100%)' }}
              title={lab.brand}
            >
              {lab.brand}
            </div>
          );
        })}

        {/* Guides */}
        {showGuides && (
          <>
            {SHELF_TOP_Y.map((y, i) => (
              <div
                key={`gy-${i}`}
                className="absolute left-0 right-0 border-t-2 border-pink-500/60"
                style={{ top: `${y}%` }}
              />
            ))}
            {SHELF_TOP_Y.flatMap((_, s) =>
              Array.from({ length: ROWS_PER_SHELF }, (_, r) => (
                <div
                  key={`gry-${s}-${r}`}
                  className="absolute left-0 right-0 border-t border-pink-500/30"
                  style={{ top: `${shelfRowY(s, r)}%` }}
                />
              ))
            )}
            {makeCenters(cols).map((x, i) => (
              <div
                key={`gx-${i}`}
                className="absolute top-0 bottom-0 border-l-2 border-pink-500/40"
                style={{ left: `${x}%` }}
              />
            ))}
          </>
        )}

        {/* Bottles */}
        {toRender.map((it, idx) => {
          // Choose coordinates: grouped display vs saved positions
          const colIdx = groupByBrand
            ? (it._display_col ?? 0)
            : Math.max(0, Math.min(centers.length - 1, it.column_index ?? 0));
          const shelfIdx = groupByBrand
            ? (it._display_shelf ?? SHELF_TOP_Y.length - 1)
            : Math.max(0, Math.min(SHELF_TOP_Y.length - 1, it.shelf_index ?? SHELF_TOP_Y.length - 1));
          const rowIdx = groupByBrand
            ? (it._display_row ?? 0)
            : Math.max(0, Math.min(ROWS_PER_SHELF - 1, it.row_index ?? 0));

          const xPct = centers[Math.max(0, Math.min(centers.length - 1, colIdx))];
          const yPct = shelfRowY(shelfIdx, rowIdx);

          const draggingThis = drag && drag.idx === idx;

          return (
            <div
              key={it.linkId + (groupByBrand ? '-g' : '')}
              className={`absolute ${(!groupByBrand && arrange) ? 'ring-1 ring-pink-400/50 rounded-md' : ''}`}
              style={{
                top: `${yPct}%`,
                left: `${xPct}%`,
                transform: 'translate(-50%, -100%)',
                height: `${bH}px`,
                pointerEvents: 'auto',
                cursor: (!groupByBrand && arrange) ? 'grab' : 'pointer',
                zIndex: draggingThis ? 30 : 'auto',
              }}
              title={`${it.fragrance?.brand || ''} — ${it.fragrance?.name || ''}`}
              onPointerDown={(e) => onPointerDown(e, idx)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bottleSrc(it.fragrance)}
                alt={it.fragrance?.name || 'fragrance'}
                className={`object-contain transition-transform duration-150 ${(!groupByBrand && arrange) ? 'hover:scale-[1.02]' : 'hover:scale-[1.04]'}`}
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
