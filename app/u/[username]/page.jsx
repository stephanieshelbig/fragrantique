'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

/** Config **********************************************************/
const CANVAS_ASPECT = '3 / 2';       // matches your background
const DEFAULT_H = 54;                // default bottle height (px)
const ALCOVE_LEFT = 0;               // no restrictions (you asked for anywhere)
const ALCOVE_RIGHT = 100;
const SHOW_LABELS = true;            // little pill under each bottle

/* util *************************************************************/
function pxToPct(x, total) { return (x / total) * 100; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function bottleSrc(f) {
  const best = f?.image_url_transparent || f?.image_url;
  return best || '/bottle-placeholder.png';
}

/** Page ************************************************************/
export default function UserBoutiquePage({ params }) {
  const username = decodeURIComponent(params.username); // e.g., "stephanie"
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [arrange, setArrange] = useState(false);
  const [showGuides, setShowGuides] = useState(false);

  // items: array of { linkId, frag, x_pct, y_pct }
  const [items, setItems] = useState([]);

  const rootRef = useRef(null);

  /** Load session (to check owner) ******************************************/
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const sub = supabase.auth.onAuthStateChange((_e, s) => setSession(s?.session || null));
    return () => sub.data.subscription.unsubscribe();
  }, []);

  /** Load profile + user_fragrances *****************************************/
  useEffect(() => {
    (async () => {
      setLoading(true);
      // 1) profile
      const { data: prof } = await supabase.from('profiles')
        .select('id, username, email')
        .eq('username', username)
        .maybeSingle();

      if (!prof?.id) { setLoading(false); return; }
      setProfile(prof);

      // is owner?
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
        x_pct: row.x_pct, // may be null
        y_pct: row.y_pct,
        manual: row.manual,
        frag: row.fragrance
      }));

      setItems(mapped);
      setLoading(false);
    })();
  }, [username, session?.user?.id]);

  /** Drag handlers ***********************************************************/
  // We store active drag state transiently (not in DB until release)
  const dragRef = useRef(null); // { id, startXPct, startYPct, startX, startY, originX, originY }

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

    const newXPct = clamp(startXPct + dxPct, ALCOVE_LEFT, ALCOVE_RIGHT);
    const newYPct = clamp(startYPct + dyPct, 0, 100);

    setItems(prev => prev.map(it =>
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
    const itm = items.find(i => i.linkId === id);
    if (!itm) return;

    // Save to Supabase
    await supabase
      .from('user_fragrances')
      .update({ x_pct: itm.x_pct, y_pct: itm.y_pct, manual: true })
      .eq('id', id);
  }

  /** Default placement for items without coordinates ************************/
  const placedItems = useMemo(() => {
    // If no manual coords, scatter them in a simple flow near the bottom
    // (Owner can immediately drag to shelf spots.)
    const missing = [];
    const withPos = [];

    for (const it of items) {
      if (typeof it.x_pct === 'number' && typeof it.y_pct === 'number') {
        withPos.push(it);
      } else {
        missing.push(it);
      }
    }

    if (!missing.length) return withPos;

    // simple flow across bottom rows
    const cols = 14;
    const startY = 86;
    const rowPitch = 6;
    const span = 96 - 4; // 4% padding both sides
    const step = span / (cols - 1);

    missing.forEach((it, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      it.x_pct = 4 + col * step;
      it.y_pct = startY - row * rowPitch;
      it.manual = false;
    });

    return [...withPos, ...missing];
  }, [items]);

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
              {arrange ? 'Arranging… (drag to move)' : 'Arrange'}
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

        {/* Optional horizontal guides (your red lines) */}
        {showGuides && (
          <>
            {[35.8, 46.8, 57.8, 68.8, 79.8].map((y, i) => (
              <div key={i} className="absolute left-0 right-0 border-t-2 border-pink-500/70" style={{ top: `${y}%` }} />
            ))}
          </>
        )}

        {/* Bottles */}
        {placedItems.map((it) => {
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
                if (canDrag) return; // don’t navigate while arranging
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
                  {it.frag?.brand || ''}{it.frag?.name ? ` — ${it.frag.name}` : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer nav for convenience */}
      <div className="max-w-6xl mx-auto px-2 py-4 text-sm opacity-70">
        Viewing <span className="font-medium">@{username}</span> boutique
        {isOwner ? ' · you can drag bottles anywhere' : ''}
      </div>
    </div>
  );
}
