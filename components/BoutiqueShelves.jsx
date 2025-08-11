'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** 
 * Shelf TOP edges in % from the top of the image.
 * These are tuned for your boutique background.
 * If a row is a hair off, bump a single value by ±0.4 at a time.
 */
const SHELF_TOP_Y = [31.9, 42.7, 52.9, 63.0, 73.1, 82.2, 88.6];

/** Inner alcove bounds (left/right in %) */
const SHELF_LEFT_PCT = 20;
const SHELF_RIGHT_PCT = 80;

/** Heights by breakpoint */
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

export default function BoutiqueShelves({ userId, items, onItemsChange }) {
  const wrapRef = useRef(null);
  const [bottleH, setBottleH] = useState(getBottleH());
  const [arrange, setArrange] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [showGuides, setShowGuides] = useState(false);

  // Toggle guides with "G"
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() === 'g') setShowGuides((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Recompute size on resize
  useEffect(() => {
    const onResize = () => setBottleH(getBottleH());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /** Distribute linear items across shelves (top→bottom) */
  const rows = useMemo(() => {
    const r = SHELF_TOP_Y.map(() => []);
    (items || []).forEach((it, i) => r[i % r.length].push(it));
    return r;
  }, [items]);

  /** Helpers to reorder the linear list */
  function moveItem(list, from, to) {
    const next = list.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next.map((it, idx) => ({ ...it, position: idx }));
  }

  function indexOfLinkId(list, linkId) {
    return list.findIndex((it) => it.linkId === linkId);
  }

  /** Persist positions to Supabase */
  async function persistOrder(next) {
    if (!userId || !next?.length) return;
    for (const it of next) {
      await supabase
        .from('user_fragrances')
        .update({ position: it.position })
        .eq('id', it.linkId)
        .eq('user_id', userId);
    }
  }

  /** Drag & Drop */
  function onDragStart(e, idx) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }
  function onDragOver(e) {
    if (!arrange) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  async function onDrop(e, targetIdx) {
    if (!arrange) return;
    e.preventDefault();
    const srcText = e.dataTransfer.getData('text/plain');
    const srcIdx = dragIdx ?? (srcText ? parseInt(srcText, 10) : null);
    setDragIdx(null);
    if (srcIdx == null || srcIdx === targetIdx) return;

    const next = moveItem(items, srcIdx, targetIdx);
    onItemsChange(next);
    await persistOrder(next);
  }

  function onBottleClick(fragranceId) {
    if (arrange) return;
    window.location.href = `/fragrance/${fragranceId}`;
  }

  return (
    <div ref={wrapRef} className="absolute inset-0 pointer-events-none z-10">
      {/* Arrange toggle */}
      <div className="absolute right-4 top-4 z-20 pointer-events-auto">
        <button
          onClick={() => setArrange((v) => !v)}
          className={`px-3 py-1 rounded text-white ${arrange ? 'bg-pink-700' : 'bg-black/70'} hover:opacity-90`}
          title="Drag to reorder; saves automatically (press G to toggle guides)"
        >
          {arrange ? 'Done' : 'Arrange shelves'}
        </button>
      </div>

      {/* Optional shelf guides for fine-tuning */}
      {showGuides && SHELF_TOP_Y.map((y, i) => (
        <div
          key={`guide-${i}`}
          className="absolute left-0 right-0 border-t-2 border-pink-500/60"
          style={{ top: `${y}%` }}
        />
      ))}

      {rows.map((rowItems, rowIdx) => (
        <div
          key={rowIdx}
          className="absolute flex items-start justify-evenly"
          style={{
            top: `${SHELF_TOP_Y[rowIdx]}%`,       // shelf TOP edge
            left: `${SHELF_LEFT_PCT}%`,
            right: `${100 - SHELF_RIGHT_PCT}%`,
            transform: 'translateY(0)',
            gap: '20px',
            pointerEvents: 'none',
          }}
          onDragOver={onDragOver}
        >
          {rowItems.map((it) => {
            const globalIdx = indexOfLinkId(items, it.linkId);
            return (
              <div
                key={it.linkId}
                className={`flex items-end ${arrange ? 'ring-1 ring-pink-400/50 rounded-md' : ''}`}
                style={{
                  height: `${bottleH}px`,
                  pointerEvents: 'auto',
                  transform: 'translateY(-100%)', // bottom sits ON the line above
                  cursor: arrange ? 'grab' : 'pointer',
                }}
                draggable={arrange}
                onDragStart={(e) => onDragStart(e, globalIdx)}
                onDrop={(e) => onDrop(e, globalIdx)}
                onClick={() => onBottleClick(it.fragrance.id)}
                title={`${it.fragrance.brand || ''} — ${it.fragrance.name || ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={srcFrom(it.fragrance)}
                  alt={it.fragrance.name || 'fragrance'}
                  loading="lazy"
                  className={`object-contain transition-transform duration-150 ${arrange ? 'hover:scale-[1.02]' : 'hover:scale-[1.04]'}`}
                  style={{
                    height: '100%',
                    width: 'auto',
                    mixBlendMode: 'multiply', // transparent PNGs ignore this
                    filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
                  }}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
