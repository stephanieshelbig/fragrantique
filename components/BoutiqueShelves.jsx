'use client';

// --- TUNE THESE IF NEEDED ---
const SHELF_Y = [27.15, 38.09, 48.14, 58.20, 68.26, 77.54, 83.89]; // % from top
const SHELF_LEFT_PCT  = 20;  // left edge of the center alcove (percent of width)
const SHELF_RIGHT_PCT = 80;  // right edge of the center alcove (percent of width)
const GAP_PX = 20;           // space between bottles (px)
const MAX_BOTTLE_H_DESKTOP = 120; // px – fits your shelf height nicely
const MAX_BOTTLE_H_TABLET  = 100; // px
const MAX_BOTTLE_H_MOBILE  = 84;  // px
// --------------------------------

function bottleMaxH() {
  if (typeof window === 'undefined') return MAX_BOTTLE_H_DESKTOP;
  const w = window.innerWidth;
  if (w < 640) return MAX_BOTTLE_H_MOBILE;      // mobile
  if (w < 1024) return MAX_BOTTLE_H_TABLET;     // tablet
  return MAX_BOTTLE_H_DESKTOP;                  // desktop
}

export default function BoutiqueShelves({ fragrances }) {
  // distribute fragrances across rows (L→R, top→bottom)
  const rows = SHELF_Y.map(() => []);
  fragrances.forEach((f, i) => rows[i % rows.length].push(f));

  const maxH = bottleMaxH();

  return (
    // This overlay expects the PARENT to be a relative box with the background
    <div className="absolute inset-0 pointer-events-none">
      {rows.map((rowFrags, idx) => (
        <div
          key={idx}
          className="absolute flex flex-wrap justify-center"
          style={{
            top: `${SHELF_Y[idx]}%`,
            transform: 'translateY(-50%)',
            left: `${SHELF_LEFT_PCT}%`,
            right: `${100 - SHELF_RIGHT_PCT}%`,
            gap: `${GAP_PX}px`,
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
                className="object-contain cursor-pointer hover:scale-[1.06] transition-transform duration-150"
                style={{
                  maxHeight: `${maxH}px`,
                  height: `${maxH}px`,
                  width: 'auto',
                  pointerEvents: 'auto',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))',
                }}
                onClick={() => (window.location.href = `/fragrance/${fragrance.id}`)}
                loading="lazy"
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
