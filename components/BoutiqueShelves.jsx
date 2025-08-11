'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** Shelf TOP edges (% from image top). Slight overlap for realism. */
const SHELF_TOP_Y = [27.3, 38.1, 48.3, 58.4, 68.5, 77.6, 84.0];

/** Column centers (% from image left) for the three alcoves */
const SHELF_CENTER_X = { left: 31.8, center: 50.0, right: 68.2 };
const COLUMNS = ['left', 'center', 'right'];

/** Inner alcove horizontal bounds used when distributing evenly */
const SHELF_LEFT_PCT = 20;
const SHELF_RIGHT_PCT = 80;

/** Bottle heights */
const H_DESKTOP = 120, H_TABLET = 100, H_MOBILE = 84;

function getBottleH() {
  if (typeof window === 'undefined') return H_DESKTOP;
  const w = window.innerWidth;
  if (w < 640) return H_MOBILE;
  if (w < 1024) return H_TABLET;
  return H_DESKTOP;
}

/** Prefer transparent PNG; add a version query to bust cache */
function srcFrom(f) {
  const best = f.image_url_transparent || f.image_url;
  if (!best) return '';
  const base = best.startsWith('http')
    ? best
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${best}`;
  const ver = f.created_at ? new Date(f.created_at).getTime() : Date.now();
  return `${base}${base.includes('?') ? '&' : '?'}v=${ver}`;
}

/** Helper: snap to nearest shelf + column */
function nearestShelfIndex(topPct) {
  let best = 0, bestDist = Infinity;
  SHELF_TOP_Y.forEach((y, i) => {
    const d = Math.abs(topPct - y);
    if (d < bestDist) { best = i; bestDist = d; }
  });
  return best;
}
function nearestColumnKey(leftPct) {
  let best = 'center', bestDist = Infinity;
  for (const k of COLUMNS) {
    const d = Math.abs(leftPct - SHELF_CENTER_X[k]);
    if (d < bestDist) { best = k; bestDist = d; }
  }
  return best;
}

export default function BoutiqueShelves({ userId, items, onItemsChange }) {
  /**
   * items: [{ linkId, position, shelf_index?, column_key?, fragrance: {...} }]
   * We keep backward-compat by deriving defaults when missing.
   */
  const rootRef = useRef(null);
  const [bottleH, setBottleH] = useState(getBottleH());
  const [arrange, setArrange] = useState(false);
  const [dragging, setDragging] = useState(null); // {idx, offsetX, offsetY}
  const [dragPos, setDragPos] = useState(null);   // {xPct, yPct}
  const [showGuides, setShowGuides] = useState(false);

  // Key toggle for shelf guides
  useEffect(() => {
    const onKey = (e) => { if (e.key.toLowerCase() === 'g') setShowGuides(v => !v); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Resize -> recompute bottle size
  useEffect(() => {
    const onResize = () => setBottleH(getBottleH());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /** Ensure each item has a shelf + column default (round-robin fallback) */
  const normalized = useMemo(() => {
    if (!items?.length) return [];
    return items.map((it, i) => {
      const shelf_index = Number.isInteger(it.shelf_index) ? it.shelf_index : (i % SHELF_TOP_Y.length);
      const column_key = it.column_key || COLUMNS[(Math.floor(i / SHELF_TOP_Y.length)) % COLUMNS.length] || 'center';
      return { ...it, shelf_index, column_key };
    });
  }, [items]);

  /** For rendering: group by shelf index, then by column */
  const byShelf = useMemo(() => {
    const rows = SHELF_TOP_Y.map(() => ({ left: [], center: [], right: [] }));
    normalized.forEach((it) => {
      const s = Math.max(0, Math.min(SHELF_TOP_Y.length - 1, it.shelf_index));
      const c = COLUMNS.includes(it.column_key) ? it.column_key : 'center';
      rows[s][c].push(it);
    });
    return rows;
  }, [normalized]);

  /** Persist a single item’s shelf/column/position */
  async function saveItemLayout(it, shelf_index, column_key, positionOverride = null) {
    if (!userId) return;
    const nextPos = positionOverride ?? it.position ?? 0;
    await supabase
      .from('user_fragrances')
      .update({ shelf_index, column_key, position: nextPos })
      .eq('id', it.linkId)
      .eq('user_id', userId);
  }

  /** Pointer-based drag so we can compute real percentages */
  function onPointerDown(e, idx) {
    if (!arrange) return;
    const box = rootRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - box.left) / box.width) * 100;
    const yPct = ((e.clientY - box.top) / box.height) * 100;
    setDragging({ idx });
    setDragPos({ xPct, yPct });
    (e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId));
  }
  function onPointerMove(e) {
    if (!arrange || !dragging || !rootRef.current) return;
    const box = rootRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - box.left) / box.width) * 100;
    const yPct = ((e.clientY - box.top) / box.height) * 100;
    setDragPos({ xPct, yPct });
  }
  async function onPointerUp() {
    if (!arrange || dragging == null || !dragPos) { setDragging(null); return; }
    const idx = dragging.idx;
    const it = normalized[idx];
    // Snap to nearest anchors
    const snappedShelf = nearestShelfIndex(dragPos.yPct);
    const snappedCol = nearestColumnKey(dragPos.xPct);

    // Update local state
    const updated = normalized.map((x, i) =>
      i === idx ? { ...x, shelf_index: snappedShelf, column_key: snappedCol } : x
    );
    onItemsChange(updated);

    // Persist
    await saveItemLayout(it, snappedShelf, snappedCol, it.position ?? idx);

    setDragging(null);
    setDragPos(null);
  }

  /** Click opens fragrance page (disabled in arrange mode) */
  function handleClick(fragranceId) {
    if (arrange) return;
    window.location.href = `/fragrance/${fragranceId}`;
  }

  /** Helper to render one bottle at an anchor position */
  function Bottle({ it }) {
    const x = SHELF_CENTER_X[it.column_key] ?? SHELF_CENTER_X.center;
    const y = SHELF_TOP_Y[it.shelf_index] ?? SHELF_TOP_Y[0];
    const draggingThis = dragging && normalized[dragging.idx]?.linkId === it.linkId;

    return (
      <div
        className={`absolute ${arrange ? 'ring-1 ring-pink-400/50 rounded-md' : ''}`}
        style={{
          top: `${y}%`,
          left: `${x}%`,
          transform: 'translate(-50%, -100%)',
          height: `${bottleH}px`,
          pointerEvents: 'auto',
          cursor: arrange ? 'grab' : 'pointer',
          zIndex: draggingThis ? 30 : 'auto',
        }}
        title={`${it.fragrance.brand || ''} — ${it.fragrance.name || ''}`}
        onClick={() => handleClick(it.fragrance.id)}
        onPointerDown={(e) => onPointerDown(e, normalized.findIndex(n => n.linkId === it.linkId))}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={srcFrom(it.fragrance)}
          alt={it.fragrance.name || 'fragrance'}
          className={`object-contain transition-transform duration-150 ${arrange ? 'hover:scale-[1.02]' : 'hover:scale-[1.04]'}`}
          style={{
            height: '100%',
            width: 'auto',
            mixBlendMode: 'multiply', // transparent PNGs ignore this
            filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
            touchAction: 'none',
          }}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 pointer-events-none z-10"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Arrange / Done button */}
      <div className="absolute right-4 top-4 z-20 pointer-events-auto">
        <button
          onClick={() => setArrange(v => !v)}
          className={`px-3 py-1 rounded text-white ${arrange ? 'bg-pink-700' : 'bg-black/70'} hover:opacity-90`}
          title="Drag bottles to reposition (press G to toggle guides)"
        >
          {arrange ? 'Done' : 'Arrange shelves'}
        </button>
      </div>

      {/* Guides */}
      {showGuides && (
        <>
          {SHELF_TOP_Y.map((y, i) => (
            <div
              key={`guide-y-${i}`}
              className="absolute left-0 right-0 border-t-2 border-pink-500/60"
              style={{ top: `${y}%` }}
            />
          ))}
          {Object.entries(SHELF_CENTER_X).map(([k, x]) => (
            <div
              key={`guide-x-${k}`}
              className="absolute top-0 bottom-0 border-l-2 border-pink-500/40"
              style={{ left: `${x}%` }}
            />
          ))}
        </>
      )}

      {/* Render all bottles at their anchors */}
      {normalized.map((it) => <Bottle key={it.linkId} it={it} />)}

      {/* Fallback layout if some shelves/columns are empty and you still want even distribution:
          Keep it commented unless needed
      <div
        className="absolute"
        style={{
          top: `${SHELF_TOP_Y[0]}%`,
          left: `${SHELF_LEFT_PCT}%`,
          right: `${100 - SHELF_RIGHT_PCT}%`,
          display: 'none'
        }}
      /> */}
    </div>
  );
}
