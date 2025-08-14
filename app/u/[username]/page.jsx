'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const CANVAS_ASPECT = '3 / 2';
const DEFAULT_H = 54;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const pxToPct = (x, total) => (x / total) * 100;
const toNum = (v) => (v === null || v === undefined || v === '' ? undefined : Number(v));
const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);
const bottleSrc = (f) => f?.image_url_transparent || f?.image_url || '/bottle-placeholder.png';

const brandKey = (b) =>
  (b || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const LAYOUT_KEY = (username) => `fragrantique_layout_${username}`;
const BRAND_LAYOUT_KEY = (username) => `fragrantique_layout_by_brand_${username}`;

function loadLocal(username) {
  try {
    const byLinkRaw = localStorage.getItem(LAYOUT_KEY(username));
    const byBrandRaw = localStorage.getItem(BRAND_LAYOUT_KEY(username));
    const byLinkObj = byLinkRaw ? JSON.parse(byLinkRaw) : {};
    const byBrandObj = byBrandRaw ? JSON.parse(byBrandRaw) : {};
    // coerce to numbers
    for (const k in byLinkObj) {
      const o = byLinkObj[k] || {};
      o.x_pct = toNum(o.x_pct);
      o.y_pct = toNum(o.y_pct);
      byLinkObj[k] = o;
    }
    for (const k in byBrandObj) {
      const o = byBrandObj[k] || {};
      o.x_pct = toNum(o.x_pct);
      o.y_pct = toNum(o.y_pct);
      byBrandObj[k] = o;
    }
    return { byLink: byLinkObj, byBrand: byBrandObj };
  } catch {
    return { byLink: {}, byBrand: {} };
  }
}
function saveLocal(username, { byLink, byBrand }) {
  try {
    if (byLink) localStorage.setItem(LAYOUT_KEY(username), JSON.stringify(byLink));
    if (byBrand) localStorage.setItem(BRAND_LAYOUT_KEY(username), JSON.stringify(byBrand));
  } catch {}
}

/** Representative priority:
 *  1) manual=true (means you dragged it once)
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
  const [arrange, setArrange] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [toast, setToast] = useState(null);
  const [debug, setDebug] = useState(false);

  const [links, setLinks] = useState([]); // all user_fragrances rows + frag
  const [reps, setReps] = useState([]);   // one rep per brand

  const rootRef = useRef(null);

  // Load shelves
  useEffect(() => {
    (async () => {
      setLoading(true);

      // find profile id by username
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', username)
        .maybeSingle();

      if (!prof?.id) {
        setLinks([]);
        setReps([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
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

      const mapped = (data || []).map(row => ({
        linkId: row.id,
        user_id: row.user_id,
        fragId: row.fragrance_id,
        x_pct: toNum(row.x_pct), // ← force numeric
        y_pct: toNum(row.y_pct), // ← force numeric
        manual: !!row.manual,
        frag: row.fragrance
      }));

      setLinks(mapped);

      // Auto flags via querystring
      const qs = new URLSearchParams(window.location.search);
      if (qs.get('edit') === '1') setArrange(true);
      if (qs.get('debug') === '1') setDebug(true);

      setLoading(false);
    })();
  }, [username]);

  // Reduce to ONE representative per brand
  useEffect(() => {
    const byBrand = new Map();
    for (const it of links) {
      const bk = brandKey(it.frag?.brand);
      if (!byBrand.has(bk)) byBrand.set(bk, []);
      byBrand.get(bk).push(it);
    }

    const chosen = Array.from(byBrand.entries()).map(([bk, list]) => {
      const rep = chooseRepForBrand(list);
      return rep ? { ...rep, brand: rep.frag?.brand || 'Unknown', brandKey: bk } : null;
    }).filter(Boolean);

    // apply saved local positions (by link first; fallback by brand)
    try {
      const { byLink, byBrand } = loadLocal(username);
      for (const it of chosen) {
        const fromLink = byLink?.[it.linkId];
        const fromBrand = byBrand?.[it.brandKey];
        if (fromLink && isNum(fromLink.x_pct) && isNum(fromLink.y_pct)) {
          it.x_pct = fromLink.x_pct; it.y_pct = fromLink.y_pct;
        } else if (fromBrand && isNum(fromBrand.x_pct) && isNum(fromBrand.y_pct)) {
          it.x_pct = fromBrand.x_pct; it.y_pct = fromBrand.y_pct;
        }
      }
    } catch {}

    // sort brands A→Z
    chosen.sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()));

    setReps(chosen);
  }, [links, username]);

  // Dragging
  const dragRef = useRef(null);

  function startDrag(e, itm) {
    if (!arrange) return;
    const container = rootRef.current;
    if (!container) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.currentTarget.setPointerCapture && e.pointerId != null) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    }

    const rect = container.getBoundingClientRect();
    const pointerX = (e.touches ? e.touches[0].clientX : e.clientX);
    const pointerY = (e.touches ? e.touches[0].clientY : e.clientY);

    const currentXPct = isNum(itm.x_pct) ? itm.x_pct : 50;
    const currentYPct = isNum(itm.y_pct) ? itm.y_pct : 80;

    dragRef.current = {
      id: itm.linkId,
      brandKey: itm.brandKey,
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
    const { id, brandKey: bk } = snap;
    const itm = reps.find(i => i.linkId === id);
    if (!itm) return;

    // 1) Try to persist in Supabase (requires being signed in + RLS allowing update)
    const { error } = await supabase
      .from('user_fragrances')
      .update({ x_pct: itm.x_pct, y_pct: itm.y_pct, manual: true })
      .eq('id', id);

    // 2) Always mirror to localStorage by linkId and by brandKey (coerce to number)
    try {
      const { byLink, byBrand } = loadLocal(username);
      const nextByLink = { ...byLink, [id]: { x_pct: Number(itm.x_pct), y_pct: Number(itm.y_pct) } };
      const nextByBrand = { ...byBrand, [bk]: { x_pct: Number(itm.x_pct), y_pct: Number(itm.y_pct) } };
      saveLocal(username, { byLink: nextByLink, byBrand: nextByBrand });
    } catch {}

    // Toast
    setToast(error ? 'Saved locally (not in database).' : 'Saved!');
    setTimeout(() => setToast(null), 1600);
  }

  // Provide defaults for reps without any position
  const placedReps = useMemo(() => {
    const withPos = [];
    const missing = [];

    for (const it of reps) {
      if (isNum(it.x_pct) && isNum(it.y_pct)) withPos.push(it);
      else missing.push(it);
    }

    if (!missing.length) return withPos;

    // scatter along bottom rows (you can drag them into place)
    const cols = 14, startY = 86, rowPitch = 6, pad = 4;
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
          <button
            onClick={() => setDebug(d => !d)}
            className="px-3 py-1 rounded bg-black/50 text-white hover:opacity-90"
            title="Toggle debug labels"
          >
            Debug
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute left-1/2 top-4 -translate-x-1/2 z-20 px-3 py-1 rounded bg-black/70 text-white text-sm">
            {toast}
          </div>
        )}

        {/* Optional shelf guides (toggle) */}
        {showGuides && [35.8, 46.8, 57.8, 68.8, 79.8].map((y, i) => (
          <div key={i} className="absolute left-0 right-0 border-t-2 border-pink-500/70" style={{ top: `${y}%` }} />
        ))}

        {/* One bottle per brand (drag in arrange mode; click in view mode) */}
        {placedReps.map((it) => {
          const topPct = clamp(isNum(it.y_pct) ? it.y_pct : 80, 0, 100);
          const leftPct = clamp(isNum(it.x_pct) ? it.x_pct : 50, 0, 100);
          const href = `/u/${encodeURIComponent(username)}/brand/${brandKey(it.brand)}`;

          const wrapperStyle = {
            top: `${topPct}%`,
            left: `${leftPct}%`,
            transform: 'translate(-50%, -100%)',
            height: `${DEFAULT_H}px`,
            touchAction: 'none',
          };

          const Bottle = (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bottleSrc(it.frag)}
              alt={it.frag?.name || 'fragrance'}
              className="object-contain"
              style={{
                height: '100%',
                width: 'auto',
                mixBlendMode: 'multiply',
                filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
                opacity: arrange ? 0.9 : 1,
                userSelect: 'none',
                WebkitUserDrag: 'none',
              }}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallback) {
                  img.dataset.fallback = '1';
                  img.src = '/bottle-placeholder.png';
                }
              }}
            />
          );

          // Hover-only brand label
          const HoverLabel = (
            <div
              className="
                pointer-events-none
                absolute left-1/2 -bottom-5 -translate-x-1/2
                text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded
                bg-black/55 text-white backdrop-blur
                opacity-0 group-hover:opacity-100 transition-opacity duration-150
              "
              style={{ whiteSpace: 'nowrap' }}
            >
              {it.brand}
            </div>
          );

          // Optional debug tag (linkId + coords)
          const DebugTag = debug ? (
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] bg-pink-600 text-white px-1.5 py-0.5 rounded pointer-events-none">
              {it.linkId.slice(0, 6)} · {Math.round((it.x_pct ?? 0) * 10) / 10}% , {Math.round((it.y_pct ?? 0) * 10) / 10}%
            </div>
          ) : null;

          return arrange ? (
            <div
              key={it.linkId}
              className="group absolute select-none cursor-grab active:cursor-grabbing"
              style={wrapperStyle}
              onPointerDown={(e) => startDrag(e, it)}
              onTouchStart={(e) => startDrag(e, it)}
              title={`${it.brand}`}
            >
              {Bottle}
              {HoverLabel}
              {DebugTag}
            </div>
          ) : (
            <Link
              key={it.linkId}
              href={href}
              prefetch={false}
              className="group absolute select-none cursor-pointer"
              style={wrapperStyle}
              title={`${it.brand} — view all`}
            >
              {Bottle}
              {HoverLabel}
              {DebugTag}
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
