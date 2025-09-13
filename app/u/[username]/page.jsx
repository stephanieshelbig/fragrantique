'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

/**
 * Boutique Page: shows one bottle per brand, with draggable positions
 * - Public visitors see published positions (user_brand_positions.is_public = true)
 * - Owners can toggle Arrange mode and drag to save public positions
 */

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

const STOPWORDS = new Set([
  'paris','london','milan','new','york','nyc','roma','rome',
  'perfume','perfumes','parfum','parfums','fragrance','fragrances',
  'inc','ltd','llc','co','company','laboratories','laboratory','lab','labs',
  'edition','editions','house','maison','atelier','collection','collections'
]);
function canonicalBrandKey(b) {
  const strict = brandKey(b);
  const parts = strict.split('-').filter(Boolean);
  const kept = parts.filter(p => !STOPWORDS.has(p));
  const canon = kept.join('-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return canon || strict;
}

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

  const [authReady, setAuthReady]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [arrange, setArrange]       = useState(false);
  const [status, setStatus]         = useState(null);

  const [viewerId, setViewerId]     = useState(null);
  const [profileId, setProfileId]   = useState(null);

  const [links, setLinks]             = useState([]);
  const [dbPositions, setDbPositions] = useState({});
  const [localBrand, setLocalBrand]   = useState({});

  const rootRef = useRef(null);
  const dragState = useRef(null);
  const lastSavedRef = useRef(null);

  const LS_BRAND = (u) => `fragrantique_layout_by_brand_${u}`;
  function loadLocalBrand(u) {
    try {
      const obj = JSON.parse(localStorage.getItem(LS_BRAND(u)) || '{}');
      for (const k in obj) {
        obj[k].x_pct = toNum(obj[k].x_pct);
        obj[k].y_pct = toNum(obj[k].y_pct);
      }
      return obj;
    } catch { return {}; }
  }
  function saveLocalBrand(u, mapObj) {
    try { localStorage.setItem(LS_BRAND(u), JSON.stringify(mapObj)); } catch {}
  }

  function setEditParam(on) {
    try {
      const url = new URL(window.location.href);
      if (on) url.searchParams.set('edit', '1');
      else url.searchParams.delete('edit');
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }

  // Auth + load
  useEffect(() => {
    let sub = null;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      setViewerId(sess?.session?.user?.id || null);
      setAuthReady(true);
      await loadData(sess?.session?.user?.id || null);
      sub = supabase.auth.onAuthStateChange(async (_event, session) => {
        setViewerId(session?.user?.id || null);
        await loadData(session?.user?.id || null);
      }).data?.subscription || null;
    })();
    return () => { if (sub) sub.unsubscribe(); };
  }, [username]);

  async function loadData(currentViewerId) {
    setLoading(true);
    setStatus(null);

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

    const { data: rows } = await supabase
      .from('user_fragrances')
      .select(`
        id, user_id, fragrance_id, x_pct, y_pct, manual,
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

    const { data: pubRows } = await supabase
      .from('user_brand_positions')
      .select('brand_key, x_pct, y_pct, is_public')
      .eq('user_id', prof.id)
      .eq('is_public', true);

    let privRows = [];
    if (currentViewerId && currentViewerId === prof.id) {
      const { data: myRows } = await supabase
        .from('user_brand_positions')
        .select('brand_key, x_pct, y_pct, is_public')
        .eq('user_id', prof.id);
      privRows = myRows || [];
    }

    const merged = {};
    (pubRows || []).forEach(p => { merged[p.brand_key] = { x_pct: toNum(p.x_pct), y_pct: toNum(p.y_pct) }; });
    (privRows || []).forEach(p => { merged[p.brand_key] = { x_pct: toNum(p.x_pct), y_pct: toNum(p.y_pct) }; });
    setDbPositions(merged);

    setLocalBrand(loadLocalBrand(username));

    const qs = new URLSearchParams(window.location.search);
    if (qs.get('edit') === '1') setArrange(true);

    setLoading(false);
  }

  const reps = useMemo(() => {
    const byBrand = new Map();
    for (const it of links) {
      const strict = brandKey(it.frag?.brand);
      if (!byBrand.has(strict)) byBrand.set(strict, []);
      byBrand.get(strict).push(it);
    }

    const chosen = Array.from(byBrand.entries()).map(([strict, list]) => {
      const rep = chooseRepForBrand(list);
      if (!rep) return null;

      const brand = rep.frag?.brand || 'Unknown';
      const canon = canonicalBrandKey(brand);

      const dbStrict = dbPositions[strict];
      const dbCanon  = dbPositions[canon];
      const locCanon = localBrand[canon];

      const x = isNum(dbStrict?.x_pct) ? dbStrict.x_pct
              : isNum(dbCanon?.x_pct)  ? dbCanon.x_pct
              : isNum(locCanon?.x_pct) ? locCanon.x_pct
              : undefined;

      const y = isNum(dbStrict?.y_pct) ? dbStrict.y_pct
              : isNum(dbCanon?.y_pct)  ? dbCanon.y_pct
              : isNum(locCanon?.y_pct) ? locCanon.y_pct
              : undefined;

      return {
        ...rep,
        brand,
        brandKeyStrict: strict,
        brandKeyCanon : canon,
        x_pct: x,
        y_pct: y
      };
    }).filter(Boolean);

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

    positioned.sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()));
    needDefaults.sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()));
    return [...positioned, ...needDefaults];
  }, [links, dbPositions, localBrand]);

  function startDrag(e, itm) {
    if (!arrange || !viewerId || viewerId !== profileId) return;
    const container = rootRef.current;
    if (!container) return;
    e.preventDefault(); e.stopPropagation();

    if (e.currentTarget.setPointerCapture && e.pointerId != null) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    }

    const rect = container.getBoundingClientRect();
    const pointerX = e.touches ? e.touches[0].clientX : e.clientX;
    const pointerY = e.touches ? e.touches[0].clientY : e.clientY;

    const startX = isNum(itm.x_pct) ? itm.x_pct : 50;
    const startY = isNum(itm.y_pct) ? itm.y_pct : 80;

    dragState.current = {
      brandKeyCanon : itm.brandKeyCanon,
      startXPct: startX,
      startYPct: startY,
      pointerX,
      pointerY,
      rect,
      lastXPct: startX,
      lastYPct: startY
    };

    window.addEventListener('pointermove', onDragMove, { passive: false });
    window.addEventListener('pointerup', onDragEnd);
    window.addEventListener('touchmove', onDragMove, { passive: false });
    window.addEventListener('touchend', onDragEnd);
  }

  function onDragMove(e) {
    if (!dragState.current) return;
    e.preventDefault();

    const { startXPct, startYPct, pointerX, pointerY, rect, brandKeyCanon } = dragState.current;
    const nowX = e.touches ? e.touches[0].clientX : e.clientX;
    const nowY = e.touches ? e.touches[0].clientY : e.clientY;

    const dxPct = pxToPct(nowX - pointerX, rect.width);
    const dyPct = pxToPct(nowY - pointerY, rect.height);

    const newX = clamp(startXPct + dxPct, 0, 100);
    const newY = clamp(startYPct + dyPct, 0, 100);

    dragState.current.lastXPct = newX;
    dragState.current.lastYPct = newY;

    setDbPositions(prev => ({ ...prev, [brandKeyCanon]: { x_pct: newX, y_pct: newY } }));
  }

  async function onDragEnd() {
    const snap = dragState.current;
    dragState.current = null;

    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    window.removeEventListener('touchmove', onDragMove);
    window.removeEventListener('touchend', onDragEnd);

    if (!snap) return;
    const { brandKeyCanon, lastXPct, lastYPct } = snap;
    const x = Number(lastXPct);
    const y = Number(lastYPct);

    setStatus('Saving…');
    lastSavedRef.current = { x, y };

    let err = null;
    if (profileId && viewerId === profileId) {
      const { error } = await supabase
        .from('user_brand_positions')
        .upsert({ user_id: profileId, brand_key: brandKeyCanon, x_pct: x, y_pct: y, is_public: true });
      if (error) err = error.message;
    } else {
      err = 'not owner';
    }

    try {
      const nextLocal = { ...localBrand, [brandKeyCanon]: { x_pct: x, y_pct: y } };
      saveLocalBrand(username, nextLocal);
      setLocalBrand(nextLocal);
    } catch {}

    setStatus(err ? `DB blocked: ${err}. Saved locally.` : 'DB saved ✓ (public)');
  }

  if (!authReady || loading) return <div className="p-6">Loading boutique…</div>;
  const isOwner = viewerId && profileId && viewerId === profileId;

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      {/* Header Links */}
      <div className="flex justify-end gap-4 py-3 text-sm font-medium">
        <Link href="/brand" className="hover:underline">Sort By Brand</Link>
        <Link href="/chat" className="hover:underline">Contact Me</Link>
        <Link href="/cart" className="hover:underline">Cart</Link>
        {isOwner && (
          <button
            onClick={() => { const next = !arrange; setArrange(next); setEditParam(next); }}
            className="px-3 py-1 rounded text-white bg-black/70 hover:bg-black/80"
          >
            {arrange ? 'Arranging… (drag)' : 'Arrange'}
          </button>
        )}
      </div>

      {/* NEW: link to /decants */}
      <div className="mb-3 text-center text-sm">
        <Link href="/decants" className="font-semibold underline">
          click here for all available decants
        </Link>
      </div>

      {/* Boutique background + bottles */}
      <div className="relative w-full" ref={rootRef} style={{ aspectRatio: CANVAS_ASPECT }}>
        <Image
          src="/Fragrantique_boutiqueBackground.png"
          alt="Boutique"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />

        {reps.map((it) => {
          const topPct  = clamp(isNum(it.y_pct) ? it.y_pct : 80, 0, 100);
          const leftPct = clamp(isNum(it.x_pct) ? it.x_pct : 50, 0, 100);
          const href = `/u/${encodeURIComponent(username)}/brand/${brandKey(it.brand)}`;

          const wrapperStyle = {
            top: `${topPct}%`,
            left: `${leftPct}%`,
            transform: 'translate(-50%, -100%)',
            height: `${DEFAULT_H}px`,
            touchAction: 'none',
          };

          return isOwner && arrange ? (
            <div
              key={it.brandKeyStrict}
              className="group absolute select-none cursor-grab active:cursor-grabbing"
              style={wrapperStyle}
              onPointerDown={(e) => startDrag(e, it)}
              onTouchStart={(e) => startDrag(e, it)}
              title={`${it.brand}`}
            >
              {/* Bottle */}
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
              key={it.brandKeyStrict}
              href={href}
              prefetch={false}
              className="group absolute select-none cursor-pointer"
              style={wrapperStyle}
              title={`${it.brand} — view all`}
            >
              {/* Bottle */}
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
