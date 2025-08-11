
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const SHELF_Y = [27.15, 38.09, 48.14, 58.20, 68.26, 77.54, 83.89];
const SHELF_LEFT_PCT = 20;
const SHELF_RIGHT_PCT = 80;

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

function srcFrom(f) {
  const best = f.image_url_transparent || f.image_url;
  if (!best) return '';
  return best.startsWith('http')
    ? best
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${best}`;
}

export default function BoutiqueShelves({ fragrances }) {
  const wrapperRef = useRef(null);
  const [wrapWidth, setWrapWidth] = useState(0);
  const [bottleH, setBottleH] = useState(getBottleH());

  useEffect(() => {
    function measure() {
      if (!wrapperRef.current) return;
      const box = wrapperRef.current.getBoundingClientRect();
      const inner = box.width * ((SHELF_RIGHT_PCT - SHELF_LEFT_PCT) / 100);
      setWrapWidth(inner);
      setBottleH(getBottleH());
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const rows = useMemo(() => {
    const r = SHELF_Y.map(() => []);
    (fragrances || []).forEach((f, i) => r[i % r.length].push(f));
    return r;
  }, [fragrances]);

  return (
    <div ref={wrapperRef} className="absolute inset-0 pointer-events-none z-10">
      {rows.map((rowFrags, idx) => {
        const estBottleW = Math.round(bottleH * 0.75);
        const minGap = 16;
        let gap = minGap;
        if (wrapWidth && rowFrags.length > 1) {
          const totalBottleW = estBottleW * rowFrags.length;
          const free = Math.max(wrapWidth - totalBottleW, minGap * (rowFrags.length - 1));
          gap = Math.floor(free / (rowFrags.length - 1));
        }

        return (
          <div
            key={idx}
            className="absolute flex items-center"
            style={{
              top: `${SHELF_Y[idx]}%`,
              transform: 'translateY(-50%)',
              left: `${SHELF_LEFT_PCT}%`,
              right: `${100 - SHELF_RIGHT_PCT}%`,
              justifyContent: 'center',
              gap: `${gap}px`,
              pointerEvents: 'none',
            }}
          >
            {rowFrags.map((f) => {
              const imgSrc = srcFrom(f);
              return (
                <img
                  key={f.id}
                  src={imgSrc}
                  alt={`${f.brand || ''} — ${f.name || ''}`}
                  title={`${f.brand || ''} — ${f.name || ''}`}
                  className="object-contain hover:scale-[1.05] transition-transform duration-150"
                  style={{
                    height: `${bottleH}px`,
                    width: 'auto',
                    mixBlendMode: 'multiply',
                    filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                  }}
                  onClick={() => (window.location.href = `/fragrance/${f.id}`)}
                  loading="lazy"
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
