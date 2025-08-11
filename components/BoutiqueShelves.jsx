'use client';

const SHELF_Y = [16, 33, 51, 69, 86]; 
// % from top of background image — adjust to match your shelves
const BOTTLE_MAX_H = 120; // px — change to match shelf height

export default function BoutiqueShelves({ fragrances }) {
  // Distribute fragrances across shelves
  const rows = SHELF_Y.map(() => []);
  fragrances.forEach((f, i) => rows[i % rows.length].push(f));

  return (
    <div className="absolute inset-0 pointer-events-none">
      {rows.map((rowFrags, idx) => (
        <div
          key={idx}
          className="absolute left-0 right-0 flex justify-center gap-6"
          style={{
            top: `${SHELF_Y[idx]}%`,
            transform: 'translateY(-50%)',
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
                alt={fragrance.name}
                title={`${fragrance.brand} — ${fragrance.name}`}
                className="object-contain cursor-pointer hover:scale-105 transition-transform duration-200"
                style={{
                  maxHeight: `${BOTTLE_MAX_H}px`,
                  pointerEvents: 'auto',
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
