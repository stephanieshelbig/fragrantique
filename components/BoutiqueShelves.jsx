'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/** Shelf *top* edges in % from the top of the image (tweak by ±0.5 if needed) */
const SHELF_TOP_Y = [24.6, 35.6, 45.9, 56.1, 66.2, 75.4, 82.1];

/** Inner alcove bounds */
const SHELF_LEFT_PCT = 20;
const SHELF_RIGHT_PCT = 80;

/** Bottle heights by breakpoint */
const DESKTOP_H = 120;
const TABLET_H  = 100;
const MOBILE_H  = 84;

function getBottleH() {
  if (typeof window === 'undefined') return DESKTOP_H;
  const w = window.innerWidth;
  if (w < 640) return MOBILE_H;
  if (w < 1024) return TABLET_H;
  return DESKTOP_H;
}

/** Prefer transparent PNG if present */
function srcFrom(f) {
  const best = f.image_url_transparent || f.image_url;
  if (!best) return '';
  const base = best.startsWith('http')
    ? best
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${best}`;
  // use created_at if present, else fall back to now
  const ver = f.created_at ? new Date(f.created_at).getTime() : Date.now();
  return `${base}${base.includes('?') ? '&' : '?'}v=${ver}`;
}

export default function BoutiqueShelves({ fragrances }) {
  const wrapRef = useRef(null);
  const [bottleH, setBottleH] = useState(getBottleH());

  useEffect(() => {
    const onResize = () => setBottleH(getBottleH());
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /** Distribute fragrances top→bottom across shelves */
  const rows = useMemo(() => {
    const r = SHELF_TOP_Y.map(() => []);
    (fragrances || []).forEach((f, i) => r[i % r.length].push(f));
    return r;
  }, [fragrances]);

  return (
    <div ref={wrapRef} className="absolute inset-0 pointer-events-none z-10">
      {rows.map((rowFrags, idx) => (
        <div
          key={idx}
          className="absolute flex items-start justify-evenly"
          style={{
            /* place the *top* of the row on the shelf edge */
            top: `${SHELF_TOP_Y[idx]}%`,
            left: `${SHELF_LEFT_PCT}%`,
            right: `${100 - SHELF_RIGHT_PCT}%`,
            transform: 'translateY(0)',
            gap: '20px',
            pointerEvents: 'none',
          }}
        >
          {rowFrags.map((f) => {
            const src = srcFrom(f);
            return (
              <div
                key={f.id}
                className="flex items-end"
                style={{
                  height: `${bottleH}px`,
                  pointerEvents: 'auto',
                  /* shift the whole bottle up so its *bottom* sits on the shelf line */
                  transform: 'translateY(-100%)',
                }}
                title={`${f.brand || ''} — ${f.name || ''}`}
                onClick={() => (window.location.href = `/fragrance/${f.id}`)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={f.name || 'fragrance'}
                  loading="lazy"
                  className="object-contain hover:scale-[1.04] transition-transform duration-150 cursor-pointer"
                  style={{
                    height: '100%',
                    width: 'auto',
                    /* helps non-PNG whites blend a bit; true transparent PNGs will ignore this */
                    mixBlendMode: 'multiply',
                    filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
                  }}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
