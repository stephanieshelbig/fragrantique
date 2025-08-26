'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

/**
 * Boutique Page: shows one bottle per brand, with draggable positions
 * - Public visitors see published positions
 * - Owners see arrange mode + can reposition bottles
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

  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [arrange, setArrange] = useState(false);
  const [status, setStatus] = useState(null);
  const [viewerId, setViewerId] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [links, setLinks] = useState([]);
  const [dbPositions, setDbPositions] = useState({});
  const [localBrand, setLocalBrand] = useState({});
  const rootRef = useRef(null);
  const dragState = useRef(null);
  const lastSavedRef = useRef(null);

  function setEditParam(on) {
    try {
      const url = new URL(window.location.href);
      if (on) url.searchParams.set('edit', '1');
      else url.searchParams.delete('edit');
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }

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
    const { data: prof } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();

    if (!prof?.id) { setProfileId(null); setLinks([]); setLoading(false); return; }
    setProfileId(prof.id);

    const { data: rows } = await supabase
      .from('user_fragrances')
      .select(`
        id, user_id, fragrance_id, x_pct, y_pct, manual,
        fragrance:fragrances(id, brand, name, image_url, image_url_transparent)
      `)
      .eq('user_id', prof.id);

    const mapped = (rows || []).map(r => ({
      linkId: r.id, user_id: r.user_id, fragId: r.fragrance_id,
      x_pct: toNum(r.x_pct), y_pct: toNum(r.y_pct),
      manual: !!r.manual, frag: r.fragrance
    }));
    setLinks(mapped);

    const { data: pubRows } = await supabase
      .from('user_brand_positions')
      .select('brand_key, x_pct, y_pct, is_public')
      .eq('user_id', prof.id)
      .eq('is_public', true);

    const merged = {};
    (pubRows || []).forEach(p => { merged[p.brand_key] = { x_pct: toNum(p.x_pct), y_pct: toNum(p.y_pct) }; });
    setDbPositions(merged);

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
    return Array.from(byBrand.entries()).map(([strict, list]) => {
      const rep = chooseRepForBrand(list);
      if (!rep) return null;
      const brand = rep.frag?.brand || 'Unknown';
      const canon = canonicalBrandKey(brand);
      const dbStrict = dbPositions[strict];
      const dbCanon = dbPositions[canon];
      return {
        ...rep, brand, brandKeyStrict: strict, brandKeyCanon: canon,
        x_pct: dbStrict?.x_pct ?? dbCanon?.x_pct ?? 50,
        y_pct: dbStrict?.y_pct ?? dbCanon?.y_pct ?? 80
      };
    }).filter(Boolean);
  }, [links, dbPositions, localBrand]);

  function startDrag(e, itm) {
    if (!arrange || viewerId !== profileId) return;
    const container = rootRef.current; if (!container) return;
    e.preventDefault(); e.stopPropagation();
    const rect = container.getBoundingClientRect();
    const startX = itm.x_pct ?? 50; const startY = itm.y_pct ?? 80;
    dragState.current = { brandKeyCanon: itm.brandKeyCanon, rect, startX, startY,
      pointerX: e.clientX, pointerY: e.clientY };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  }

  function onDragMove(e) {
    if (!dragState.current) return;
    const { brandKeyCanon, rect, startX, startY, pointerX, pointerY } = dragState.current;
    const newX = clamp(startX + pxToPct(e.clientX - pointerX, rect.width), 0, 100);
    const newY = clamp(startY + pxToPct(e.clientY - pointerY, rect.height), 0, 100);
    setDbPositions(prev => ({ ...prev, [brandKeyCanon]: { x_pct: newX, y_pct: newY } }));
    dragState.current.lastX = newX; dragState.current.lastY = newY;
  }

  async function onDragEnd() {
    const snap = dragState.current; dragState.current = null;
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    if (!snap || viewerId !== profileId) return;
    const { brandKeyCanon, lastX, lastY } = snap;
    await supabase.from('user_brand_positions').upsert({
      user_id: profileId, brand_key: brandKeyCanon, x_pct: lastX, y_pct: lastY, is_public: true
    });
    setStatus('DB saved ✓');
  }

  if (!authReady || loading) return <div className="p-6">Loading boutique…</div>;
  const isOwner = viewerId === profileId;

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      {/* Header Links */}
      <div className="flex justify-end gap-4 py-3 text-sm font-medium">
        <Link href="/brand" className="hover:underline">Brand Index</Link>
        <Link href="/chat" className="hover:underline">Contact Me</Link>
        <Link href="/cart" className="hover:underline">Cart</Link>
        {isOwner && (
          <button
            onClick={() => { const next = !arrange; setArrange(next); setEditParam(next); }}
            className="px-3 py-1 rounded text-white bg-black/70 hover:bg-black/80"
          >
            {arrange ? 'Arranging…' : 'Arrange'}
          </button>
        )}
      </div>

      {/* Boutique Background */}
      <div className="relative w-full" ref={rootRef} style={{ aspectRatio: CANVAS_ASPECT }}>
        <Image src="/Fragrantique_boutiqueBackground.png" alt="Boutique" fill style={{ objectFit: 'cover' }} priority />

        {reps.map((it) => {
          const wrapperStyle = { top: `${it.y_pct}%`, left: `${it.x_pct}%`,
            transform: 'translate(-50%, -100%)', height: `${DEFAULT_H}px` };
          return isOwner && arrange ? (
            <div key={it.brandKeyStrict} className="absolute cursor-grab" style={wrapperStyle}
              onPointerDown={(e) => startDrag(e, it)}>
              <img src={bottleSrc(it.frag)} alt={it.frag?.name}
                style={{ height: '100%', width: 'auto', userSelect: 'none' }} />
            </div>
          ) : (
            <Link key={it.brandKeyStrict} href={`/u/${username}/brand/${brandKey(it.brand)}`}
              className="absolute" style={wrapperStyle}>
              <img src={bottleSrc(it.frag)} alt={it.frag?.name}
                style={{ height: '100%', width: 'auto', userSelect: 'none' }} />
            </Link>
          );
        })}
      </div>

      <div className="text-sm opacity-70 py-4">Viewing <b>@{username}</b> boutique {arrange && '· arranging'}</div>
      {status && <div className="text-xs text-green-700">{status}</div>}
    </div>
  );
}
