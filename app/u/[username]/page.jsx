'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rnd } from 'react-rnd';
import { supabase } from '@/lib/supabase';
import FooterNav from '@/components/FooterNav';

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

  // We’re removing UI for arranging; keep this false
  const arranging = false;

  const [reps, setReps] = useState([]);          // one bottle per brand
  const [dbPositions, setDbPositions] = useState({}); // {brandKey: {x_pct,y_pct}}

  const rootRef = useRef(null);

  // ---- Load profile, positions, and fragrances ----
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      setLoading(true);

      // 1) Who is this boutique owner?
      const { data: pRow } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('username', username)
        .maybeSingle();

      if (!pRow) {
        setLoading(false);
        return;
      }
      if (!mounted) return;
      setProfile(pRow);

      // 2) Load saved brand positions
      const { data: posRows } = await supabase
        .from('brand_positions')
        .select('brand_key, x_pct, y_pct')
        .eq('user_id', pRow.id);

      const posMap = {};
      (posRows || []).forEach((r) => {
        if (r.brand_key)
          posMap[r.brand_key] = {
            x_pct: Number(r.x_pct) || 0,
            y_pct: Number(r.y_pct) || 0,
          };
      });
      if (!mounted) return;
      setDbPositions(posMap);

      // 3) Load this user's bottles, pick one per brand
      const { data: rows } = await supabase
        .from('user_fragrances')
        .select('fragrance:fragrances(id,name,brand,image_url,image_url_transparent)')
        .eq('user_id', pRow.id)
        .order('brand', { referencedTable: 'fragrances', ascending: true })
        .order('name', { referencedTable: 'fragrances', ascending: true });

      const repMap = new Map();
      (rows || []).forEach((r) => {
        const f = r?.fragrance || null;
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
      setLoading(false);
    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, [username]);

  // Fallback layout grid if no position saved
  const fallbackPositions = useMemo(() => {
    const cols = 10;
    const leftPadding = 6;
    const rightPadding = 6;
    const topStart = 18;
    const rowGap = 14;
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

  const titleName = profile?.display_name || profile?.username || username;

  return (
    <div className="min-h-screen bg-[#fdfcf9]">
      {/* Simple heading (no buttons) */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <h1 className="text-xl font-semibold">{titleName}&apos;s Brand Showcase</h1>
        <div className="text-xs text-gray-500">One bottle per brand</div>
      </div>

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
          const bottleW = 90;
          const bottleH = 160;

          const stylePos = {
            position: 'absolute',
            left: `${p.x_pct}%`,
            top: `${p.y_pct}%`,
            transform: 'translate(-50%, -100%)',
            width: bottleW,
            height: bottleH,
            cursor: 'pointer',
            userSelect: 'none',
            zIndex: 1,
          };

          const content = (
            <img
              src={img}
              alt={`${r.brand} — ${r.bottle.name}`}
              draggable={false}
              className="w-full h-full object-contain drop-shadow-xl"
              onClick={() => router.push(`/brand/${r.brandKey}`)}
            />
          );

          // Always read-only (no arrange mode exposed)
          return (
            <div key={r.brandKey} style={stylePos} title={r.brand}>
              {content}
            </div>
          );
        })}
      </div>

      {/* Footer nav */}
      <FooterNav />
    </div>
  );
}
