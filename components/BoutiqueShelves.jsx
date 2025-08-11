'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// Exact shelf centerlines (% from top of image)
const SHELF_Y = [27.15, 38.09, 48.14, 58.20, 68.26, 77.54, 83.89];

// Central alcove bounds (tweak a little if needed)
const SHELF_LEFT_PCT = 20;   // %
const SHELF_RIGHT_PCT = 80;  // %

const DESKTOP_H = 120; // px bottle height
const TABLET_H  = 100;
const MOBILE_H  = 84;

/** Choose a good bottle height for current viewport */
function getBottleH() {
  if (typeof window === 'undefined') return DESKTOP_H;
  const w = window.innerWidth;
  if (w < 640) return MOBILE_H;
  if (w < 1024) return TABLET_H;
  return DESKTOP_H;
}

export default function BoutiqueShelves({ fragrances }) {
  const wrapperRef = useRef(null);
  const [wrapWidth, setWrapWidth] = useState(0);
  const [bottleH, setBottleH] = useState(getBottleH());

  // Measure the inner alcove width so we can space evenly
  useEffect(() => {
    function measure() {
      if (!wrapperRef.current) return;
      const box = wrapperRef.current.getBoundingClientRect();
      const inner =
        box.width * ((SHELF_RIGHT_PCT - SHELF_LEFT_PCT) / 100);
      setWrapWidth(inner);
      setBottleH(getBottleH());
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Distribute fragrances top->bottom across shelves
  const rows = useMemo(() => {
    const r = SHELF_Y.map(() => []);
    fragrances.forEach((f, i) => r[i % r.length].push(f));
    return r;
  }, [fragrances]);

  return (
    <div ref={wrapperRef} className="absolute inset-0 pointer-events-none">
      {rows.map((rowFrags, idx) => {
        // Simple even spacing within the inner alcove
        // Assume average bottle aspect 3:4 => width ≈ bottleH * 0.75
        const estBottleW = Math.round(bottleH * 0.75);
        // Minimum gap 16px, scale up if there’s more room
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
            {rowFrags.map((fragrance) => {
              const imgSrc = fragrance.image_url?.startsWith('http')
                ? fragrance.image_url
                : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${fragrance.image_url}`;

              return (
                <img
                  key={fragrance.id}
                  src={imgSrc}
                  alt={`${fragrance.brand} — ${fragrance.name}`}
                  title={`${fragrance.brand} — ${fragrance.name}`}
                  className="object-contain hover:scale-[1.05] transition-transform duration-150"
                  style={{
                    height: `${bottleH}px`,
                    width: 'auto',
                    // Make JPG whites blend into the cream background (not perfect, but nicer)
                    mixBlendMode: 'multiply',
                    filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.15))',
                    pointerEvents: 'auto',
                    cursor: 'pointer',
                  }}
                  onClick={() => (window.location.href = `/fragrance/${fragrance.id}`)}
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
