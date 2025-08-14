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

const LS_LINK = (u) => `fragrantique_layout_${u}`;
const LS_BRAND = (u) => `fragrantique_layout_by_brand_${u}`;

function loadLocal(username) {
  try {
    const byLink = JSON.parse(localStorage.getItem(LS_LINK(username)) || '{}');
    const byBrand = JSON.parse(localStorage.getItem(LS_BRAND(username)) || '{}');
    for (const k in byLink) {
      byLink[k].x_pct = toNum(byLink[k].x_pct);
      byLink[k].y_pct = toNum(byLink[k].y_pct);
    }
    for (const k in byBrand) {
      byBrand[k].x_pct = toNum(byBrand[k].x_pct);
      byBrand[k].y_pct = toNum(byBrand[k].y_pct);
    }
    return { byLink, byBrand };
  } catch { return { byLink: {}, byBrand: {} }; }
}
function saveLocal(username, { byLink, byBrand }) {
  try {
    if (byLink) localStorage.setItem(LS_LINK(username), JSON.stringify(byLink));
    if (byBrand) localStorage.setItem(LS_BRAND(username), JSON.stringify(byBrand));
  } catch {}
}

/** Choose which bottle represents a brand:
 * 1) manual=true   2) has transparent image   3) shortest name
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
  const [status, setStatus] = useState(null);
  const [dbOnly, setDbOnly] = useState(false);

  const [profileId, setProfileId] = useState(null);
  const [links, setLinks] = useState([]);  // user_fragrances + fragrance
  const [brandPos, setBrandPos] = useState(new Map()); // brand_key -> {x_pct,y_pct}
  const [reps, setReps] = useState([]);    // one per brand

  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const lastSavedRef = useRef(null);

  async function loadData({ ignoreLocal = false } = {}) {
    setLoading(true);
    setStatus(null);
    setDbOnly(ignoreLocal);

    // 1) profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();

    if (!prof?.id) {
      setProfileId(null);
      setLinks([]); setReps([]); setBrandPos(new Map());
      setLoading(false);
      return;
    }
    setProfileId(prof.id);

    // 2) all user_fragrances for this user
    const { data: rows } = await supabase
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

    const mapped = (rows || []).map(r => ({
      linkId: r.id,
      user_id: r.user_id,
      fragId: r.fragrance_id,
      x_pct: toNum(r.x_pct),
      y_pct: toNum(r.y_pct),
      manual: !!r.manual,
      frag: r.fragrance
    }));
    setLinks(mapped);

    // 3) brand-level positions (DB truth)
    const { data: posRows } = await supabase
      .from('user_brand_positions')
      .select('brand_key, x_pct, y_pct')
      .eq('user_id', prof.id);

    const map = new Map();
    (posRows || []).forEach(p => {
      map.set(p.brand_key, { x_pct: toNum(p.x_pct), y_pct: toNum(p.y_pct) });
    });
    setBrandPos(map);

    // flags
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('edit') === '1') setArrange(true);

    setLoading(false);
  }

  useEffect(() => { loadData(); }, [username]);

  // Build one representative per brand; apply positions from DB brandPos, then (if not dbOnly) local fallback
  useEffect(() => {
    const byBrand = new Map();
    for (const it of links) {
      const bk = brandKey(it.frag?.brand);
      if (!byBrand.has(bk)) byBrand.set(bk, []);
      byBrand.get(bk).push(it);
    }

    const chosen = Array.from(byBrand.entries())
      .map(([bk, list]) => {
        const rep = chooseRepForBrand(list);
        if (!rep) return null;
        const brand = rep.frag?.brand || 'Unknown';
        const pos = brandPos.get(bk);
        const out = {
          ...rep,
          brand,
          brandKey: bk,
          x_pct: isNum(pos?.x_pct) ? pos.x_pct : rep.x_pct, // DB brand pos first
          y_pct: isNum(pos?.y_pct) ? pos.y_pct : rep.y_pct,
        };

        if (!dbOnly) {
          // apply local overlay if present
          try {
            const { byLink, byBrand } = loadLocal(username);
            const fromLink = byLink?.[rep.linkId];
            const fromBrand = byBrand?.[bk];
            if (fromLink && isNum(fromLink.x_pct) && isNum(fromLink.y_pct)) {
              out.x_pct = fromLink.x_pct; out.y_pct = fromLink.y_pct;
            } else if (fromBrand && isNum(fromBrand.x_pct) && isNum(fromBrand.y_pct)) {
              out.x_pct = fromBrand.x_pct; out.y_pct = fromBrand.y_pct;
            }
          } catch {}
        }

        return out;
      })
      .filter(Boolean)
      .sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()));

    setReps(chosen);
  }, [links, brandPos, username, dbOnly]);

  function startDrag(e, itm) {
    if (!arrange) return;
    const container = rootRef.current;
    if (!container) return;
    e.preventDefault(); e.stopPropagation();

    if (e.currentTarget.setPointerCapture && e.pointerId != null) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    }

    const rect = container.getBoundingClientRect();
    const pointerX = (e.touches ? e.touches[0].clientX : e.clientX);
    const pointerY = (e.touches ? e.touches[0].clientY : e.clientY);

    const currentXPct = isNum(itm.x_pct) ? itm.x_pct : 50;
    const currentYPct = isNum(itm.y_pct) ? itm.y_pct : 80;

    dragRef.current = {
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

    const { brandKey, startXPct, startYPct, startX, startY, rect } = dragRef.current;
    const pointerX = (e.touches ? e.touches[0].clientX : e.clientX);
    const pointerY = (e.touches ? e.touches[0].clientY : e.clientY);

    const dxPct = pxToPct((pointerX - startX), rect.width);
    const dyPct = pxToPct((pointerY - startY), rect.height);

    const newXPct = clamp(startXPct + dxPct, 0, 100);
    const newYPct = clamp(startYPct + dyPct, 0, 100);

    setReps(prev => prev.map(it =>
      it.brandKey === brandKey ? { ...it, x_pct: newXPct, y_pct: newYPct } : it
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
    const { brandKey: bk } = snap;
    const itm = reps.find(i => i.brandKey === bk);
    if (!itm) return;

    setStatus('Saving…');
    lastSavedRef.current = { x: Number(itm.x_pct), y: Number(itm.y_pct) };

    // 1) Save to brand-level table (server truth)
    let dbErr = null;
    if (profileId) {
      const { error } = await supabase
        .from('user_brand_positions')
        .upsert({
          user_id: profileId,
          brand_key: bk,
          x_pct: Number(itm.x_pct),
          y_pct: Number(itm.y_pct),
        });
      if (error) dbErr = error.message;
    } else {
      dbErr = 'no profile';
    }

    // 2) Mirror to localStorage as extra safety
    try {
      const { byLink, byBrand } = loadLocal(username);
      const nextByBrand = { ...byBrand, [bk]: { x_pct: Number(itm.x_pct), y_pct: Number(itm.y_pct) } };
      saveLocal(username, { byLink, byBrand: nextByBrand });
    } catch {}

    setStatus(dbErr ? `DB blocked: ${dbErr}. Saved locally.` : 'DB saved ✓');

    // 3) Refresh DB positions so Reload DB will show the new spot
    if (!dbErr) {
      const { data: posRows } = await supabase
        .from('user_brand_positions')
        .select('brand_key, x_pct, y_pct')
        .eq('user_id', profileId);
      const map = new Map();
      (posRows || []).forEach(p => map.set(p.brand_key, { x_pct: toNum(p.x_pct), y_pct: toNum(p.y_pct) }));
      setBrandPos(map);
    }
  }

  // Defaults for any brand without a position yet
  const placedReps = useMemo(() => {
    const withPos = [];
    const missing = [];

    for (const it of reps) {
      if (isNum(it.x_pct) && isNum(it.y_pct)) withPos.push(it);
      else missing.push(it);
    }

    if (!missing.length) return withPos;

    // scatter along bottom rows (you can drag them up)
    const cols = 14, startY = 86, rowPitch = 6, pad = 4;
    const span = 100 - pad * 2;
    const step = span / (cols - 1);

    missing.forEach((it, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      it.x_pct = pad + col * step;
      it.y_pct = startY - row * rowPitch;
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
        <div className="absolute right-4 top-4 z-20 flex gap-2 items-center">
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

          {arrange && (
            <>
              <button
                onClick={() => loadData({ ignoreLocal: true })}
                className="px-2 py-1 rounded bg-black/40 text-white hover:opacity-90 text-xs"
                title="Reload from database (ignore local layout)"
              >
                Reload DB
              </button>
              {status && (
                <span className="text-xs px-2 py-1 rounded bg-white/85 border shadow">
                  {status}
                  {lastSavedRef.current && (
                    <> · x{Math.round(lastSavedRef.current.x)}% y{Math.round(lastSavedRef.current.y)}%</>
                  )}
                </span>
              )}
              {dbOnly && (
                <span className="text-xs px-2 py-1 rounded bg-amber-200 border shadow">
                  DB-only view
                </span>
              )}
            </>
          )}
        </div>

        {/* Guides (optional) */}
        {showGuides && [35.8, 46.8, 57.8, 68.8, 79.8].map((y, i) => (
          <div key={i} className="absolute left-0 right-0 border-t-2 border-pink-500/70" style={{ top: `${y}%` }} />
        ))}

        {/* One bottle per brand */}
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

          return arrange ? (
            <div
              key={`${it.brandKey}`}
              className="group absolute select-none cursor-grab active:cursor-grabbing"
              style={wrapperStyle}
              onPointerDown={(e) => startDrag(e, it)}
              onTouchStart={(e) => startDrag(e, it)}
              title={`${it.brand}`}
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
              {/* Hover label */}
              <div className="pointer-events-none absolute left-1/2 -bottom-5 -translate-x-1/2 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {it.brand}
              </div>
            </div>
          ) : (
            <Link
              key={`${it.brandKey}`}
              href={href}
              prefetch={false}
              className="group absolute select-none cursor-pointer"
              style={wrapperStyle}
              title={`${it.brand} — view all`}
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
              <div className="pointer-events-none absolute left-1/2 -bottom-5 -translate-x-1/2 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {it.brand}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="max-w-6xl mx-auto px-2 py-4 text-sm opacity-70">
        Viewing <span className="font-medium">@{username}</span> boutique — one bottle per brand
        {arrange ? ' · arranging (brand-level save)' : ''}
      </div>
    </div>
  );
}
