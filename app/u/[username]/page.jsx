'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const CANVAS_ASPECT = '3 / 2';
const DEFAULT_H = 54;
const SHOW_LABELS = true;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const pxToPct = (x, total) => (x / total) * 100;
const bottleSrc = (f) => f?.image_url_transparent || f?.image_url || '/bottle-placeholder.png';
const slugifyBrand = (b) =>
  (b || 'unknown')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Priority for brand representative:
 *  1) already placed manually (manual=true)
 *  2) has transparent image
 *  3) shortest name
 */
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

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const [arrange, setArrange] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [toast, setToast] = useState(null);

  // all user links (we will reduce to one per brand)
  const [links, setLinks] = useState([]);
  // chosen representatives (one per brand)
  const [reps, setReps] = useState([]);

  const rootRef = useRef(null);

  // Load profile + links
  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('username', username)
        .maybeSingle();

      if (!prof?.id) { setProfile(null); setLinks([]); setLoading(false); return; }
      setProfile(prof);

      const { data } = await supabase
        .from('user_fragrances')
        .select(`
          id,
          fragrance_id,
          x_pct,
          y_pct,
          manual,
          fragrance:fragrances(id, brand, name, image_url, image_url_transparent)
        `)
        .eq('user_id', prof.id);

      const mapped = (data || []).map(row => ({
        linkId: row.id,
        fragId: row.fragrance_id,
        x_pct: row.x_pct,
        y_pct: row.y_pct,
        manual: row.manual,
        frag: row.fragrance,
      }));

      setLinks(mapped);

      // Auto-enable arrange if ?edit=1
      const qs = new URLSearchParams(window.location.search);
      if (qs.get('edit') === '1') setArrange(true);

      setLoading(false);
    })();
  }, [username]);

  // Reduce to ONE representative per brand
  useEffect(() => {
    const byBrand = new Map();
    for (const it of links) {
      const brand = (it.frag?.brand || 'Unknown').trim();
      if (!byBrand.has(brand)) byBrand.set(brand, []);
      byBrand.get(brand).push(it);
    }

    const chosen = Array.from(byBrand.entries()).map(([brand, list]) => {
      const rep = chooseRepForBrand(list);
      return rep ? { ...rep, brand } : null;
    }).filter(Boolean);

    // sort A→Z by brand
    chosen.sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()));

    // Merge any localStorage positions (fallback if DB update blocked)
    try {
      const key = `fragrantique_layout_${username}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw); // { [linkId]: {x_pct,y_pct} }
        chosen.forEach(it => {
          const ov = saved[it.linkId];
          if (ov && typeof ov.x_pct === 'number' && typeof ov.y_pct === 'number') {
            it.x_pct = ov.x_pct;
            it.y_pct = ov.y_pct;
          }
        });
      }
    } catch {}

    setReps(chosen);
  }, [links, username]);

  // drag support (Arrange mode)
  const dragRef = useRef(null);

  function startDrag(e, itm) {
    if (!arrange) return;
    const container = rootRef.current;
    if (!container) return;

    if (e.currentTarget.setPointerCapture && e.pointerId != null) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    }

    const rect = container.getBoundingClientRect();
    const pointerX = (e.touches ? e.touches[0].clientX : e.clientX);
    const pointerY = (e.touches ? e.touches[0].clientY : e.clientY);

    const currentXPct = (itm.x_pct ?? 50);
    const currentYPct = (itm.y_pct ?? 80);

    dragRef.current = {
      id: itm.linkId,
      startXPct: currentXPct,
      startYPct: currentYPct,
      startX: pointerX,
      startY: pointerY,
      rect
    };

    window.addEventListener('pointermove', onDragMove, { passive: false });
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('touchend', onDragEnd);
  }

  function onDragMove(e) {
    if (!dragRef.current) return;
    e.preventDefault();

    const { id, startXPct, startYPct, startX, startY, rect } = dragRef.current;
    const pointerX = (e.touches ? e.touches[0].clientX : e.clientX);
    const pointerY = (e.touches ? e.touches[0].clientY : e.clientY);

    const dx = pointerX - startX;
    const dy = pointerY - startY;

    const dxPct = pxToPct(dx, rect.width);
    const dyPct = pxToPct(dy, rect.height);

    const newXPct = clamp(startXPct + dxPct, 0, 100);
    const newYPct = clamp(startYPct + dyPct, 0, 100);

    setReps(prev => prev.map(it =>
      it.linkId === id ? { ...it, x_pct: newXPct, y_pct: newYPct, manual: true } : it
    ));
  }

  async function onDragEnd() {
    const snap = dragRef.current;
    dragRef.current = null;

    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    window.removeEventListener('touchmove', onDragMove);
    window.removeEventListener('touchend', onDragEnd);

    if (!snap) return;
    const { id } = snap;
    const itm = reps.find(i => i.linkId === id);
    if (!itm) return;

    const { error } = await supabase
      .from('user_fragrances')
      .update({ x_pct: itm.x_pct, y_pct: itm.y_pct, manual: true })
      .eq('id', id);

    // localStorage mirror / fallback
    try {
      const key = `fragrantique_layout_${username}`;
      const raw = localStorage.getItem(key);
      const obj = raw ? JSON.parse(raw) : {};
      obj[id] = { x_pct: itm.x_pct, y_pct: itm.y_pct };
      localStorage.setItem(key, JSON.stringify(obj));
    } catch {}

    if (error) {
      setToast('Saved locally (DB blocked).'); setTimeout(() => setToast(null), 2000);
    } else {
      setToast('Saved!'); setTimeout(() => setToast(null), 1200);
    }
  }

  // Provide temporary defaults for missing coords
  const placedReps = useMemo(() => {
    const withPos = [];
    const missing = [];

    for (const it of reps) {
      if (typeof it.x_pct === 'number' && typeof it.y_pct === 'number') withPos.push(it);
      else missing.push(it);
    }

    if (!missing.length) return withPos;

    // scatter along bottom rows (you’ll drag into place)
    const cols = 14;
    const startY = 86;
    const rowPitch = 6;
    const pad = 4;
    const span = 100 - pad * 2;
    const step = span / (cols - 1);

    missing.forEach((it, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      it.x_pct = pad + col * step;
      it.y_pct = startY - row * rowPitch;
      it.manual = false;
    });

    return [...withPos, ...missing];
  }, [reps]);

  if (loading) return <div className="p-6">Loading boutique…</div>;

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      <div className="relative w-full" ref={rootRef} style={{ aspectRatio: CANVAS_ASPECT }}>
        <Image
          src="/Fragrantique_boutiqueBackground.png"
          alt="Boutique"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />

        {/* Controls */}
        <div className="absolute right-4 top-4 z-20 flex gap-2">
          <button
            onClick={() => setArrange(a => !a)}
            className={`px-3 py-1 rounded text-white ${arrange ? 'bg-pink-700' : 'bg-black/70'}`}
            title="Toggle arrange mode"
          >
            {arrange ? 'Arranging… (drag)' : 'Arrange'}
          </button>
          <Link href="/brand" className="px-3 py-1 rounded bg-black/70 text-white hover:opacity-90">
            Brand index
          </Link>
          <button
            onClick={() => setShowGuides(g => !g)}
            className="px-3 py-1 rounded bg-black/50 text-white hover:opacity-90"
          >
            Guides
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute left-1/2 top-4 -translate-x-1/2 z-20 px-3 py-1 rounded bg-black/70 text-white text-sm">
            {toast}
          </div>
        )}

        {/* Optional shelf guides */}
        {showGuides && [35.8, 46.8, 57.8, 68.8, 79.8].map((y, i) => (
          <div key={i} className="absolute left-0 right-0 border-t-2 border-pink-500/70" style={{ top: `${y}%` }} />
        ))}

        {/* ONE rep bottle per brand */}
        {placedReps.map((it) => {
          const topPct = clamp(it.y_pct ?? 80, 0, 100);
          const leftPct = clamp(it.x_pct ?? 50, 0, 100);
          const canDrag = arrange;
          const brandSlug = slugifyBrand(it.brand);

          return (
            <Link
              key={it.linkId}
              prefetch={false}
              href={canDrag ? '#' : `/u/${encodeURIComponent(username)}/brand/${brandSlug}`}
              className={`absolute select-none ${canDrag ? 'pointer-events-none' : 'cursor-pointer'}`}
              style={{
                top: `${topPct}%`,
                left: `${leftPct}%`,
                transform: 'translate(-50%, -100%)',
                height: `${DEFAULT_H}px`,
              }}
              onPointerDown={(e) => startDrag(e, it)}
              onTouchStart={(e) => startDrag(e, it)}
              title={`${it.frag?.brand || ''} — view all`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bottleSrc(it.frag)}
                alt={it.frag?.name || 'fragrance'}
                className="object-contain"
                style={{
                  height: '100%',
                  width: 'auto',
                  mixBlendMode: 'multiply',
                  filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
                  opacity: canDrag ? 0.9 : 1,
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
              {SHOW_LABELS && (
                <div className="absolute left-1/2 -bottom-5 -translate-x-1/2 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-black/55 text-white backdrop-blur">
                  {it.brand}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      <div className="max-w-6xl mx-auto px-2 py-4 text-sm opacity-70">
        Viewing <span className="font-medium">@{username}</span> boutique — one bottle per brand
        {arrange ? ' · arranging (saves to DB if allowed, else locally)' : ''}
      </div>
    </div>
  );
}
