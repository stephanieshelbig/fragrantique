'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

/** Shelf TOP edges (% from image top). Tuned so bottoms sit on the lip. */
const SHELF_TOP_Y = [28.5, 39.3, 49.6, 59.7, 69.8, 78.9, 83.0]; // 0 = top, 6 = bottom

/** Column centers (% from image left) for the three alcoves */
const SHELF_CENTER_X = { left: 31.8, center: 50.0, right: 68.2 };
const COLUMNS = ['left', 'center', 'right'];

/** Bottle heights per breakpoint */
const H_DESKTOP = 60, H_TABLET = 50, H_MOBILE = 42;
function bottleH() {
  if (typeof window === 'undefined') return H_DESKTOP;
  const w = window.innerWidth;
  if (w < 640) return H_MOBILE;
  if (w < 1024) return H_TABLET;
  return H_DESKTOP;
}

/** Prefer transparent PNG; cache-bust with a version param */
function bottleSrc(f) {
  const best = f.image_url_transparent || f.image_url;
  if (!best) return '';
  const base = best.startsWith('http')
    ? best
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${best}`;
  const ver = f.created_at ? new Date(f.created_at).getTime() : Date.now();
  return `${base}${base.includes('?') ? '&' : '?'}v=${ver}`;
}

/** Snap helpers */
function nearestShelfIndex(topPct) {
  let best = 0, dist = Infinity;
  SHELF_TOP_Y.forEach((y, i) => {
    const d = Math.abs(topPct - y);
    if (d < dist) { dist = d; best = i; }
  });
  return best;
}
function nearestColumnKey(leftPct) {
  let best = 'center', dist = Infinity;
  for (const k of COLUMNS) {
    const d = Math.abs(leftPct - SHELF_CENTER_X[k]);
    if (d < dist) { dist = d; best = k; }
  }
  return best;
}

/** Bottom-shelf-first defaults for unslotted bottles */
function applyBottomFirstDefaults(list) {
  if (!list?.length) return [];
  const out = [];
  const bottom = SHELF_TOP_Y.length - 1; // bottom index = 6
  let shelf = bottom;
  let colIdx = 0;

  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    let s = Number.isInteger(it.shelf_index) ? it.shelf_index : null;
    let c = it.column_key && COLUMNS.includes(it.column_key) ? it.column_key : null;

    if (s == null || c == null) {
      s = shelf;
      c = COLUMNS[colIdx];
      colIdx++;
      if (colIdx >= COLUMNS.length) {
        colIdx = 0;
        shelf = Math.max(0, shelf - 1); // move up a shelf
      }
      it._needsSave = true; // mark so we persist the defaulted layout once
    }
    out.push({ ...it, shelf_index: s, column_key: c });
  }
  return out;
}

export default function StephanieBoutique() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]); // [{ linkId, position, shelf_index, column_key, fragrance }]
  const rootRef = useRef(null);
  const [bH, setBH] = useState(bottleH());
  const [arrange, setArrange] = useState(false);
  const [drag, setDrag] = useState(null); // { idx }
  const [dragPos, setDragPos] = useState(null); // { xPct, yPct }
  const [showGuides, setShowGuides] = useState(false);

  // Guides toggle
  useEffect(() => {
    const onKey = (e) => { if (e.key.toLowerCase() === 'g') setShowGuides(v => !v); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Bottle height on resize
  useEffect(() => {
    const onResize = () => setBH(bottleH());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load shelves for 'stephanie'
  useEffect(() => {
    (async () => {
      // find Stephanie id
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', 'stephanie')
        .single();
      if (pErr || !prof) { setLoading(false); return; }
      setUserId(prof.id);

      // load shelves (ordered)
      const { data, error } = await supabase
        .from('user_fragrances')
        .select('id, position, shelf_index, column_key, fragrance:fragrances(*)')
        .eq('user_id', prof.id)
        .order('position', { ascending: true });

      if (error) { setLoading(false); return; }

      // map into items and apply defaults for missing slots
      const mapped = (data || []).map((row, i) => ({
        linkId: row.id,
        position: row.position ?? i,
        shelf_index: row.shelf_index,
        column_key: row.column_key,
        fragrance: row.fragrance,
      }));

      const withDefaults = applyBottomFirstDefaults(mapped);

      // persist any defaulted ones (one-time)
      for (const it of withDefaults) {
        if (it._needsSave) {
          await supabase
            .from('user_fragrances')
            .update({
              shelf_index: it.shelf_index,
              column_key: it.column_key,
              position: it.position,
            })
            .eq('id', it.linkId)
            .eq('user_id', prof.id);
        }
      }

      setItems(withDefaults);
      setLoading(false);
    })();
  }, []);

  // Move bottle by snapping to nearest shelf + column, then save
  async function placeAndSave(idx, xPct, yPct) {
    const it = items[idx];
    const s = nearestShelfIndex(yPct);
    const c = nearestColumnKey(xPct);

    const next = items.map((x, i) =>
      i === idx ? { ...x, shelf_index: s, column_key: c } : x
    );
    setItems(next);

    if (userId) {
      await supabase
        .from('user_fragrances')
        .update({ shelf_index: s, column_key: c, position: it.position ?? idx })
        .eq('id', it.linkId)
        .eq('user_id', userId);
    }
  }

  // Pointer drag (no dependencies)
  function onPointerDown(e, idx) {
    if (!arrange) { 
      // open fragrance detail if not arranging
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
    if (!arrange || !drag || !rootRef.current) return;
    const box = rootRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - box.left) / box.width) * 100;
    const yPct = ((e.clientY - box.top) / box.height) * 100;
    setDragPos({ xPct, yPct });
  }
  async function onPointerUp() {
    if (!arrange || !drag || !dragPos) { setDrag(null); return; }
    await placeAndSave(drag.idx, dragPos.xPct, dragPos.yPct);
    setDrag(null);
    setDragPos(null);
  }

  const arranged = useMemo(() => items || [], [items]);

  if (loading) return <div className="p-6">Loading your boutique…</div>;

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      {/* Keep a fixed 3:2 box so shelf % positions stay accurate */}
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

        {/* Arrange / Done + Guides toggle help */}
        <div className="absolute right-4 top-4 z-20 pointer-events-auto flex gap-2">
          <button
            onClick={() => setArrange(v => !v)}
            className={`px-3 py-1 rounded text-white ${arrange ? 'bg-pink-700' : 'bg-black/70'} hover:opacity-90`}
            title="Drag bottles to reposition (press G to toggle guides)"
          >
            {arrange ? 'Done' : 'Arrange shelves'}
          </button>
          <button
            onClick={() => setShowGuides(v => !v)}
            className="px-3 py-1 rounded bg-black/50 text-white hover:opacity-90"
            title="Toggle alignment guides (G)"
          >
            Guides
          </button>
        </div>

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
            {Object.entries(SHELF_CENTER_X).map(([k, x]) => (
              <div
                key={`gx-${k}`}
                className="absolute top-0 bottom-0 border-l-2 border-pink-500/40"
                style={{ left: `${x}%` }}
              />
            ))}
          </>
        )}

        {/* Bottles */}
        {arranged.map((it, idx) => {
          const x = SHELF_CENTER_X[it.column_key] ?? SHELF_CENTER_X.center;
          const y = SHELF_TOP_Y[it.shelf_index] ?? SHELF_TOP_Y[SHELF_TOP_Y.length - 1];

          const draggingThis = drag && drag.idx === idx;

          return (
            <div
              key={it.linkId}
              className={`absolute ${arrange ? 'ring-1 ring-pink-400/50 rounded-md' : ''}`}
              style={{
                top: `${y}%`,
                left: `${x}%`,
                transform: 'translate(-50%, -100%)',
                height: `${bH}px`,
                pointerEvents: 'auto',
                cursor: arrange ? 'grab' : 'pointer',
                zIndex: draggingThis ? 30 : 'auto',
              }}
              title={`${it.fragrance.brand || ''} — ${it.fragrance.name || ''}`}
              onPointerDown={(e) => onPointerDown(e, idx)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bottleSrc(it.fragrance)}
                alt={it.fragrance.name || 'fragrance'}
                className={`object-contain transition-transform duration-150 ${arrange ? 'hover:scale-[1.02]' : 'hover:scale-[1.04]'}`}
                style={{
                  height: '100%',
                  width: 'auto',
                  mixBlendMode: 'multiply', // ignored by transparent PNGs
                  filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
                  touchAction: 'none',
                }}
                draggable={false}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
