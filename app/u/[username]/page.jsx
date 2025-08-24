// app/u/[username]/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Rnd } from 'react-rnd';
import { supabase } from '@/lib/supabase';

type Profile = { id: string; username: string | null; display_name?: string | null };
type Bottle = {
  id: number;
  name: string;
  brand: string;
  image_url: string | null;
  image_url_transparent: string | null;
};
type BrandRep = { brandKey: string; brand: string; bottle: Bottle };
type Pos = { x_pct: number; y_pct: number };

function slugifyBrand(brand: string) {
  return brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function UserBoutiquePage({ params }: { params: { username: string } }) {
  const username = params.username;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [isOwner, setIsOwner] = useState(false);
  const [arranging, setArranging] = useState(false);

  const [reps, setReps] = useState<BrandRep[]>([]);
  const [dbPositions, setDbPositions] = useState<Record<string, Pos>>({});

  const [status, setStatus] = useState<string | null>(null); // small status chip text

  const rootRef = useRef<HTMLDivElement | null>(null);

  // ---- Load profile, session, bottles and positions ----
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

      // 2) Is current viewer the owner? (only owners can Arrange)
      const { data: sess } = await supabase.auth.getSession();
      const viewerId = sess?.session?.user?.id || null;
      if (viewerId && viewerId === pRow.id) {
        setIsOwner(true);
      } else {
        setIsOwner(false);
      }

      // 3) Load brand positions saved by this user
      const { data: posRows } = await supabase
        .from('brand_positions')
        .select('brand_key, x_pct, y_pct')
        .eq('user_id', pRow.id);

      const posMap: Record<string, Pos> = {};
      (posRows || []).forEach((r: any) => {
        if (r.brand_key) posMap[r.brand_key] = { x_pct: Number(r.x_pct) || 0, y_pct: Number(r.y_pct) || 0 };
      });
      if (!mounted) return;
      setDbPositions(posMap);

      // 4) Load this user's bottles and pick one representative per brand
      //    We order by brand asc, name asc so the "first" is deterministic.
      const { data: rows, error: fErr } = await supabase
        .from('user_fragrances')
        .select('fragrance:fragrances(id,name,brand,image_url,image_url_transparent)')
        .eq('user_id', pRow.id)
        .order('brand', { referencedTable: 'fragrances', ascending: true })
        .order('name', { referencedTable: 'fragrances', ascending: true });

      if (fErr) {
        setStatus('load error');
        setLoading(false);
        return;
      }

      const repMap = new Map<string, BrandRep>();
      (rows || []).forEach((r: any) => {
        const f: Bottle | null = r?.fragrance || null;
        if (!f || !f.brand) return;
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
      setStatus(null);
      setLoading(false);
    }

    loadAll();

    return () => { mounted = false; };
  }, [username]);

  // Fallback layout (only used if a brand has no saved position yet)
  // This simply lays bottles left-to-right in rows.
  const fallbackPositions = useMemo(() => {
    const cols = 10;              // number of columns
    const leftPadding = 6;        // %
    const rightPadding = 6;       // %
    const topStart = 18;          // %
    const rowGap = 14;            // %
    const usable = 100 - leftPadding - rightPadding;
    const step = usable / Math.max(1, cols - 1);

    const map: Record<string, Pos> = {};
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

  // Decide actual position for each brand: db saved → else fallback
  function posFor(brandKey: string): Pos {
    return dbPositions[brandKey] || fallbackPositions[brandKey] || { x_pct: 10, y_pct: 20 };
  }

  // Save a brand position (only for the owner)
  async function savePosition(brandKey: string, next: Pos) {
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

  // Convert absolute px to % relative to the canvas
  function pxToPct(x: number, y: number) {
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
          <h1 className="text-xl font-semibold">{titleName}'s Brand Showcase</h1>
          <div className="text-xs text-gray-500">
            One bottle per brand • Drag to arrange (owner only)
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => setArranging((v) => !v)}
              className={`px-3 py-1.5 rounded border text-sm ${
                arranging ? 'bg-black text-white' : 'bg-white'
              }`}
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
      {status && (
        <div className="fixed top-3 right-3 bg-black text-white text-xs px-2.5 py-1.5 rounded-full shadow">
          {status}
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
          // bottle display size (tweak if you want larger/smaller)
          const bottleW = 90;   // px
          const bottleH = 160;  // px

          // position in px once container is known
          // we position by the bottle's "foot" sitting on the position point:
          // translate(-50%, -100%) => center horizontally, bottom aligns to y
          const stylePos: React.CSSProperties = {
            position: 'absolute',
            left: `${p.x_pct}%`,
            top: `${p.y_pct}%`,
            transform: 'translate(-50%, -100%)',
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

          // Arrange mode: make it draggable within the canvas
          return (
            <Rnd
              key={r.brandKey}
              default={{
                x: 0, y: 0, width: bottleW, height: bottleH,
              }}
              position={{
                x: 0, y: 0,
              }}
              size={{ width: bottleW, height: bottleH }}
              enableResizing={false}
              bounds="parent"
              dragHandleClassName=""
              onDragStop={(e, data) => {
                // data.x/y are from absolute positioned element; we need the visual point after transforms.
                // We'll compute the bottle's "anchor" (its bottom center) from the mouse position.
                const el = rootRef.current;
                if (!el) return;
                const rect = el.getBoundingClientRect();
                // Compute absolute x/y relative to canvas from the element's current transform:
                // We have style left/top in % via p.x_pct, p.y_pct, but in drag we receive px delta relative to current.
                // Easiest: read the element's current screen box and compute bottom-center.
                const target = (e.target as HTMLElement).parentElement as HTMLElement; // Rnd wrapper
                if (!target) return;
                const b = target.getBoundingClientRect();
                const bottomCenterX = b.left + b.width / 2 - rect.left; // px within canvas
                const bottomY       = b.top + b.height - rect.top;      // px within canvas
                const next = pxToPct(bottomCenterX, bottomY);
                savePosition(r.brandKey, next);
              }}
              onDragStart={() => setStatus('dragging…')}
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
