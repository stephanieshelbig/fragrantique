// app/u/[username]/page.jsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Rnd } from 'react-rnd';
import { supabase } from '@/lib/supabase';

function slugifyBrand(brand) {
  return String(brand || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function UserBoutiquePage({ params }) {
  const username = params.username;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const [isOwner, setIsOwner] = useState(false);
  const [arranging, setArranging] = useState(false);

  const [reps, setReps] = useState([]);          // one bottle per brand
  const [dbPositions, setDbPositions] = useState({}); // {brandKey: {x_pct,y_pct}}

  const [status, setStatus] = useState(null);    // small status chip text
  const [debug, setDebug] = useState('');        // tiny debug line (counts)

  const rootRef = useRef(null);

  // ---- Load profile, session, positions, and fragrances (two-step) ----
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      setLoading(true);
      setStatus('loading');

      // 1) Who is this boutique owner?
      const { data: pRow, error: pErr } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('username', username)
        .maybeSingle();

      if (pErr || !pRow) {
        setStatus('not found');
        setLoading(false);
        return;
      }
      if (!mounted) return;
      setProfile(pRow);

      // 2) Is current viewer the owner?
      const { data: sess } = await supabase.auth.getSession();
      const viewerId = sess?.session?.user?.id || null;
      setIsOwner(!!viewerId && viewerId === pRow.id);

      // 3) Load saved brand positions (publicly readable)
      const { data: posRows } = await supabase
        .from('brand_positions')
        .select('brand_key, x_pct, y_pct')
        .eq('user_id', pRow.id);

      const posMap = {};
      (posRows || []).forEach((r) => {
        if (r.brand_key) posMap[r.brand_key] = {
          x_pct: Number(r.x_pct) || 0,
          y_pct: Number(r.y_pct) || 0
        };
      });
      if (!mounted) return;
      setDbPositions(posMap);

      // 4) Load user_fragrances → just the IDs (this is small)
      const { data: links, error: lErr } = await supabase
        .from('user_fragrances')
        .select('fragrance_id')
        .eq('user_id', pRow.id);

      if (lErr) {
        setStatus('load error (links)');
        setLoading(false);
        return;
      }

      const ids = (links || [])
        .map((r) => r?.fragrance_id)
        .filter((v) => v != null);

      // If no links, we’re done
      if (!ids.length) {
        if (!mounted) return;
        setDebug(`links: 0`);
        setReps([]);
        setStatus(null);
        setLoading(false);
        return;
      }

      // 5) Fetch those fragrances directly (avoids RLS join pitfalls)
      //    Order by brand, name so the first per-brand is deterministic.
      const { data: frags, error: fErr } = await supabase
        .from('fragrances')
        .select('id, name, brand, image_url, image_url_transparent')
        .in('id', ids)
        .order('brand', { ascending: true })
        .order('name', { ascending: true });

      if (fErr) {
        setStatus('load error (fragrances)');
        setLoading(false);
        return;
      }

      // Build one representative per brand
      const repMap = new Map();
      (frags || []).forEach((f) => {
        if (!f?.brand) return;
        const brandKey = slugifyBrand(f.brand);
        if (!repMap.has(brandKey)) {
          repMap.set(brandKey, {
            brandKey,
            brand: f.brand,
            bottle: {
              id: f.id,
              name: f.name,
              brand: f.brand,
              image_url: f.image_url,
              image_url_transparent: f.image_url_transparent,
            },
          });
        }
      });

      const repList = Array.from(repMap.values()).sort((a, b) =>
        a.brand.localeCompare(b.brand, undefined, { sensitivity: 'base' })
      );

      if (!mounted) return;
      setReps(repList);
      setDebug(`links: ${ids.length} · reps: ${repList.length}`);
      setStatus(null);
      setLoading(false);
    }

    loadAll();
    return () => { mounted = false; };
  }, [username]);

  // Fallback layout (only used if no saved position yet)
  const fallbackPositions = useMemo(() => {
    const cols = 10;
    const leftPadding = 6;   // %
    const rightPadding = 6;  // %
    const topStart = 18;     // %
    const rowGap = 14;       // %
    const usable = 100 - leftPadding - rightPadding;
    const step = usable / Math.max(1, cols - 1);

    const map = {};
    reps.forEach((r, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      map[r.brandKey] = {
        x_pct: leftPadding + col * step,
        y_pct: topStart + row * rowGap,
      };
    });
    return map;
  }, [reps]);

  function posFor(brandKey) {
    return dbPositions[brandKey] || fallbackPositions[brandKey] || { x_pct: 10, y_pct: 20 };
  }

  async function savePosition(brandKey, next) {
    if (!profile || !isOwner) return;
    setStatus('saving…');
    const { error } = await supabase
      .from('brand_positions')
      .upsert(
        {
          user_id: profile.id,
          brand_key: brandKey,
          x_pct: next.x_pct,
          y_pct: next.y_pct,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,brand_key' }
      );

    if (error) {
      setStatus('save error');
      return;
    }
    setDbPositions((prev) => ({ ...prev, [brandKey]: next }));
    setStatus('saved');
    setTimeout(() => setStatus(null), 1200);
  }

  function pxToPct(x, y) {
    const el = rootRef.current;
    if (!el) return { x_pct: 0, y_pct: 0 };
    const rect = el.getBoundingClientRect();
    const x_pct = (x / rect.width) * 100;
    const y_pct = (y / rect.height) * 100;
    return { x_pct, y_pct };
  }

  const titleName = profile?.display_name || profile?.username || username;

  return (
    <div className="min-h-screen bg-[#fdfcf9]">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{titleName}&apos;s Brand Showcase</h1>
          <div className="text-xs text-gray-500">
            One bottle per brand • Drag to arrange (owner only)
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => setArranging((v) => !v)}
              className={`px-3 py-1.5 rounded border text-sm ${arranging ? 'bg-black text-white' : 'bg-white'}`}
              title="Toggle arrange mode"
            >
              {arranging ? 'Arranging… (drag)' : 'Arrange'}
            </button>
          )}
          <Link href="/" className="text-sm underline">Home</Link>
          <Link href="/brand" className="text-sm underline">Brand Index</Link>
        </div>
      </div>

      {/* Status chip */}
      {(status || debug) && (
        <div className="fixed top-3 right-3 bg-black text-white text-xs px-2.5 py-1.5 rounded-full shadow">
          {status ? status : debug}
        </div>
      )}

      {/* Canvas with boutique background */}
      <div
        ref={rootRef}
        className="relative mx-auto my-2"
        style={{
          width: 'min(1200px, 95vw)',
          aspectRatio: '16 / 9',
          backgroundImage: 'url(/Fragrantique_boutiqueBackground.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: '14px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {reps.map((r) => {
          const p = posFor(r.brandKey);
          const img = r.bottle.image_url_transparent || r.bottle.image_url || '';
          const bottleW = 90;   // px
          const bottleH = 160;  // px

          const stylePos = {
            position: 'absolute',
            left: `${p.x_pct}%`,
            top: `${p.y_pct}%`,
            transform: 'translate(-50%, -100%)', // bottom sits on y, centered on x
            width: bottleW,
            height: bottleH,
            cursor: arranging ? 'grab' : 'pointer',
            userSelect: 'none',
            zIndex: arranging ? 20 : 1,
          };

          const content = (
            <img
              src={img}
              alt={`${r.brand} — ${r.bottle.name}`}
              draggable={false}
              className="w-full h-full object-contain drop-shadow-xl"
              onClick={() => {
                if (!arranging) router.push(`/brand/${r.brandKey}`);
              }}
            />
          );

          if (!arranging) {
            // Read-only (public) view
            return (
              <div key={r.brandKey} style={stylePos} title={r.brand}>
                {content}
              </div>
            );
          }

          // Arrange mode: draggable within the canvas
          return (
            <Rnd
              key={r.brandKey}
              default={{ x: 0, y: 0, width: bottleW, height: bottleH }}
              position={{ x: 0, y: 0 }}
              size={{ width: bottleW, height: bottleH }}
              enableResizing={false}
              bounds="parent"
              onDragStart={() => setStatus('dragging…')}
              onDragStop={(e, data) => {
                const el = rootRef.current;
                if (!el) return;
                const rect = el.getBoundingClientRect();
                const target = e.target?.parentElement; // Rnd wrapper
                if (!target) return;
                const b = target.getBoundingClientRect();
                const bottomCenterX = b.left + b.width / 2 - rect.left;
                const bottomY = b.top + b.height - rect.top;
                const next = pxToPct(bottomCenterX, bottomY);
                savePosition(r.brandKey, next);
              }}
              style={stylePos}
            >
              {content}
            </Rnd>
          );
        })}
      </div>

      {/* Footer helper */}
      <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-gray-500">
        {reps.length
          ? `${reps.length} brands • ${Object.keys(dbPositions).length} saved positions`
          : 'No brands found. Add fragrances to your wardrobe to populate this page.'}
      </div>
    </div>
  );
}
