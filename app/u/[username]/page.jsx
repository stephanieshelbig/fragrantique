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
  const [links, setLinks]           = useState([]);
  const [dbPositions, setDbPositions] = useState({});
  const [localBrand, setLocalBrand] = useState({});
  const [dbPosCount, setDbPosCount] = useState(0);

  const rootRef = useRef(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setLinks([]); setDbPositions({}); setLocalBrand({}); setDbPosCount(0);
      setLoading(false);
      return;
    }
    setProfileId(prof.id);

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
    setDbPosCount((pubRows?.length || 0) + (privRows?.length || 0));

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

      const x = isNum(dbStrict?.x_pct) ? dbStrict.x_pct
              : isNum(dbCanon?.x_pct)  ? dbCanon.x_pct
              : undefined;

      const y = isNum(dbStrict?.y_pct) ? dbStrict.y_pct
              : isNum(dbCanon?.y_pct)  ? dbCanon.y_pct
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

    return chosen;
  }, [links, dbPositions]);

  if (!authReady) return <div className="p-6">Starting session…</div>;
  if (loading)     return <div className="p-6">Loading boutique…</div>;

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      {/* Boutique Header */}
      <div className="relative w-full h-40 mb-4">
        <Image
          src="/StephaniesBoutiqueHeader.png"
          alt="Stephanie's Boutique Header"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* Boutique shelves */}
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

          return (
            <Link
              key={it.brandKeyStrict}
              href={href}
              prefetch={false}
              className="group absolute select-none cursor-pointer"
              style={wrapperStyle}
              title={`${it.brand} — view all`}
            >
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
    </div>
  );
}
