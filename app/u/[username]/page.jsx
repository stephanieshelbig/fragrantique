'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

/** Config **********************************************************/
const CANVAS_ASPECT = '3 / 2';   // matches your background image
const DEFAULT_H = 54;            // bottle height in pixels
const SHOW_LABELS = true;

/* utils ************************************************************/
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const pxToPct = (x, total) => (x / total) * 100;
const bottleSrc = (f) => f?.image_url_transparent || f?.image_url || '/bottle-placeholder.png';

/** Choose ONE representative per brand *****************************
 * Priority:
 *  1) already placed manually (manual=true) → keeps your chosen rep
 *  2) has transparent image
 *  3) shortest name (a stable deterministic choice)
 ********************************************************************/
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
  const username = decodeURIComponent(params.username); // e.g., "stephanie"

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  const [arrange, setArrange] = useState(false);
  const [showGuides, setShowGuides] = useState(false);

  // all links (user_fragrances joined with fragrances)
  const [links, setLinks] = useState([]);
  // representatives after grouping by brand (what we actually render)
  const [reps, setReps] = useState([]);

  const rootRef = useRef(null);

  /** Load session (owner check) **********************************************/
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const sub = supabase.auth.onAuthStateChange((_e, s) => setSession(s?.session || null));
    return () => sub.data.subscription.unsubscribe();
  }, []);

  /** Load profile + links ****************************************************/
  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('username', username)
        .maybeSingle();

      if (!prof?.id) { setProfile(null); setLinks([]); setLoading(false); return; }
      setProfile(prof);

      // owner?
      setIsOwner(!!(session?.user?.id && session.user.id === prof.id));

      // 2) links + fragrance info
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
        x_pct: row.x_pct,       // may be null
        y_pct: row.y_pct,
        manual: row.manual,     // marks “chosen/placed”
        frag: row.fragrance,    // {id, brand, name, ...}
      }));

      setLinks(mapped);
      setLoading(false);
    })();
  }, [username, session?.user?.id]);

  /** Collapse to ONE rep per brand *******************************************/
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

    // Sort alphabetically by brand
    chosen.sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()));

    setReps(chosen);
  }, [links]);

  /** Dragging ***************************************************************/
  const dragRef = useRef(null);

  function startDrag(e, itm) {
    if (!arrange || !isOwner) return;
    const container = rootRef.current;
    if (!container) return;

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

    await supabase
      .from('user_fragrances')
      .update({ x_pct: itm.x_pct, y_pct: itm.y_pct, manual: true })
      .eq('id', id);
  }

  /** Provide default positions for reps missing coords ***********************/
  const placedReps = useMemo(() => {
    const withPos = [];
    const missing = [];

    for (const it of reps) {
      if (typeof it.x_pct === 'number' && typeof it.y_pct === 'number') withPos.push(it);
      else missing.push(it);
    }

    if (!missing.length) return withPos;

    // Scatter missing reps along bottom rows (owner can drag into place)
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
          {isOwner && (
            <button
              onClick={() => setArrange(a => !a)}
              className={`px-3 py-1 rounded text-white ${arrange ? 'bg-pink-700' : 'bg-black/70'}`}
              title="Toggle arrange mode"
            >
              {arrange ? 'Arranging… (drag)' : 'Arrange'}
            </button>
          )}
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

        {/* Optional guides: your shelf red-lines */}
        {showGuides && [35.8, 46.8, 57.8, 68.8, 79.8].map((y, i) => (
          <div key={i} className="absolute left-0 right-0 border-t-2 border-pink-500/70" style={{ top: `${y}%` }} />
        ))}

        {/* ONE bottle per brand (draggable for owner) */}
        {placedReps.map((it) => {
          const topPct = clamp(it.y_pct ?? 80, 0, 100);
          const leftPct = clamp(it.x_pct ?? 50, 0, 100);
          const canDrag = arrange && isOwner;

          return (
            <div
              key={it.linkId}
              className={`absolute select-none ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
              style={{
                top: `${topPct}%`,
                left: `${leftPct}%`,
                transform: 'translate(-50%, -100%)',
                height: `${DEFAULT_H}px`,
              }}
              onPointerDown={(e) => startDrag(e, it)}
              onTouchStart={(e) => startDrag(e, it)}
              title={`${it.frag?.brand || ''} ${it.frag?.name || ''}`}
              onClick={() => {
                if (canDrag) return; // don't navigate while arranging
                if (it.fragId) window.location.href = `/fragrance/${it.fragId}`;
              }}
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
                  opacity: canDrag ? 0.95 : 1,
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
                  {it.brand || ''}{it.frag?.name ? ` — ${it.frag.name}` : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="max-w-6xl mx-auto px-2 py-4 text-sm opacity-70">
        Viewing <span className="font-medium">@{username}</span> boutique — one bottle per brand
        {isOwner ? ' · drag anywhere to arrange' : ''}
      </div>
    </div>
  );
}
