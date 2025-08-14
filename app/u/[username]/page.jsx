'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

/**
 * Brand-positioned boutique:
 * - One bottle per brand, draggable anywhere.
 * - Saves (user, brand_key) -> x_pct, y_pct to user_brand_positions.
 * - On load, reads DB positions; if missing, falls back to localStorage.
 * - Never overwrites DB values with older local values.
 */

const CANVAS_ASPECT = '3 / 2';   // matches your background aspect
const DEFAULT_H = 54;            // bottle render height in px

// Helpers
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const pxToPct = (x, total) => (x / total) * 100;
const toNum = (v) => (v === null || v === undefined || v === '' ? undefined : Number(v));
const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);
const bottleSrc = (f) => f?.image_url_transparent || f?.image_url || '/bottle-placeholder.png';

// Normalize brand -> key (stable)
const brandKey = (b) =>
  (b || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// LocalStorage (fallback only)
const LS_BRAND = (u) => `fragrantique_layout_by_brand_${u}`;
function loadLocalBrand(username) {
  try {
    const obj = JSON.parse(localStorage.getItem(LS_BRAND(username)) || '{}');
    for (const k in obj) {
      obj[k].x_pct = toNum(obj[k].x_pct);
      obj[k].y_pct = toNum(obj[k].y_pct);
    }
    return obj;
  } catch {
    return {};
  }
}
function saveLocalBrand(username, mapObj) {
  try { localStorage.setItem(LS_BRAND(username), JSON.stringify(mapObj)); } catch {}
}

/** Choose brand representative:
 *  1) manual=true   2) has transparent image   3) shortest name
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
  const [status, setStatus] = useState(null); // shows last save result

  const [profileId, setProfileId] = useState(null);
  const [links, setLinks] = useState([]);            // user_fragrances + fragrance
  const [dbPositions, setDbPositions] = useState({}); // {brandKey: {x_pct,y_pct}}
  const [localBrand, setLocalBrand] = useState({});   // fallback only

  const rootRef = useRef(null);       // ← declared ONCE
  const dragState = useRef(null);
  const lastSavedRef = useRef(null);

  // 1) Load data from DB (profile, links, brand positions)
  async function loadData() {
    setLoading(true);
    setStatus(null);

    // Profile
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();

    if (!prof?.id) {
      setProfileId(null);
      setLinks([]); setDbPositions({}); setLocalBrand({});
      setLoading(false);
      return;
    }
    setProfileId(prof.id);

    // All user_fragrances rows for this user
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
      x_pct: toNum(r.x_pct),          // unused now, but kept as fallback
      y_pct: toNum(r.y_pct),
      manual: !!r.manual,
      frag: r.fragrance
    }));
    setLinks(mapped);

    // Brand-level positions (DB truth)
    const { data: posRows } = await supabase
      .from('user_brand_positions')
      .select('brand_key, x_pct, y_pct')
      .eq('user_id', prof.id);

    const dbMap = {};
    (posRows || []).forEach(p => {
      dbMap[p.brand_key] = { x_pct: toNum(p.x_pct), y_pct: toNum(p.y_pct) };
    });
    setDbPositions(dbMap);

    // Local fallback loaded once; used only if DB position missing
    setLocalBrand(loadLocalBrand(username));

    // Querystring flags
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('edit') === '1') setArrange(true);

    setLoading(false);
  }

  useEffect(() => { loadData(); }, [username]);

  // 2) Build one representative per brand, merge with positions
  const reps = useMemo(() => {
    // Group all user bottles by brand
    const byBrand = new Map();
    for (const it of links) {
      const bk = brandKey(it.frag?.brand);
      if (!byBrand.has(bk)) byBrand.set(bk, []);
      byBrand.get(bk).push(it);
    }

    const chosen = Array.from(byBrand.entries()).map(([bk, list]) => {
      const rep = chooseRepForBrand(list);
      if (!rep) return null;
      const brand = rep.frag?.brand || 'Unknown';

      // DB brand position first; if missing, fallback to local; else scatter later
      const dbPos = dbPositions[bk];
      const locPos = localBrand[bk];

      const x = isNum(dbPos?.x_pct) ? dbPos.x_pct : (isNum(locPos?.x_pct) ? locPos.x_pct : undefined);
      const y = isNum(dbPos?.y_pct) ? dbPos.y_pct : (isNum(locPos?.y_pct) ? locPos.y_pct : undefined);

      return {
        ...rep,
        brand,
        brandKey: bk,
        x_pct: x,
        y_pct: y
      };
    }).filter(Boolean);

    // Give defaults to any without a position yet (scattered along bottom)
    const needDefaults = [];
    const positioned = [];
    for (const it of chosen) {
      if (isNum(it.x_pct) && isNum(it.y_pct)) positioned.push(it);
      else needDefaults.push(it);
    }

    if (needDefaults.length) {
      const cols = 14, startY = 86, rowPitch = 6, pad = 4;
      const span = 100 - pad * 2;
      const step = span / (cols - 1);
      needDefaults.forEach((it, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        it.x_pct = pad + col * step;
        it.y_pct = startY - row * rowPitch;
      });
    }

    // Sort A→Z
    positioned.sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()));
    needDefaults.sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()));

    return [...positioned, ...needDefaults];
  }, [links, dbPositions, localBrand]);

  // 3) Drag logic — update UI immediately; persist on pointer up
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
    const pointerX = e.touches ? e.touches[0].clientX : e.clientX;
    const pointerY = e.touches ? e.touches[0].clientY : e.clientY;

    const startX = isNum(itm.x_pct) ? itm.x_pct : 50;
    const startY = isNum(itm.y_pct) ? itm.y_pct : 80;

    dragState.current = {
      brandKey: itm.brandKey,
      startXPct: startX,
      startYPct: startY,
      pointerX,
      pointerY,
      rect
    };

    window.addEventListener('pointermove', onDragMove, { passive: false });
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('touchend', onDragEnd);
  }

  function onDragMove(e) {
    if (!dragState.current) return;
    e.preventDefault();

    const { brandKey: bk, startXPct, startYPct, pointerX, pointerY, rect } = dragState.current;
    const nowX = e.touches ? e.touches[0].clientX : e.clientX;
    const nowY = e.touches ? e.touches[0].clientY : e.clientY;

    const dxPct = pxToPct(nowX - pointerX, rect.width);
    const dyPct = pxToPct(nowY - pointerY, rect.height);

    const newX = clamp(startXPct + dxPct, 0, 100);
    const newY = clamp(startYPct + dyPct, 0, 100);

    // Update UI instantly by mutating dbPositions in memory (source of truth for rendering)
    setDbPositions(prev => ({ ...prev, [bk]: { x_pct: newX, y_pct: newY } }));
  }

  async function onDragEnd() {
    const snap = dragState.current;
    dragState.current = null;

    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    window.removeEventListener('touchmove', onDragMove);
    window.removeEventListener('touchend', onDragEnd);

    if (!snap) return;
    const { brandKey: bk } = snap;
    const pos = dbPositions[bk];
    if (!pos) return;

    const x = Number(pos.x_pct);
    const y = Number(pos.y_pct);

    setStatus('Saving…');
    lastSavedRef.current = { x, y };

    // Persist to DB (brand-level)
    let err = null;
    if (profileId) {
      const { error } = await supabase
        .from('user_brand_positions')
        .upsert({ user_id: profileId, brand_key: bk, x_pct: x, y_pct: y });
      if (error) err = error.message;
    } else {
      err = 'no profile';
    }

    // Mirror to local as fallback
    try {
      const nextLocal = { ...localBrand, [bk]: { x_pct: x, y_pct: y } };
      saveLocalBrand(username, nextLocal);
      setLocalBrand(nextLocal);
    } catch {}

    setStatus(err ? `DB blocked: ${err}. Saved locally.` : 'DB saved ✓');
  }

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
          <button
            onClick={loadData}
            className="px-2 py-1 rounded bg-black/40 text-white hover:opacity-90 text-xs"
            title="Reload from DB"
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
        </div>

        {/* Optional shelf guides */}
        {showGuides && [35.8, 46.8, 57.8, 68.8, 79.8].map((y, i) => (
          <div key={i} className="absolute left-0 right-0 border-t-2 border-pink-500/70" style={{ top: `${y}%` }} />
        ))}

        {/* One bottle per brand */}
        {reps.map((it) => {
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
              key={it.brandKey}
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
              key={it.brandKey}
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
