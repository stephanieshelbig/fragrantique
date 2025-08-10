'use client';

const SHELF_Y = [16, 33, 51, 69, 86]; 
// ^^^ % from the top of the image where each shelf sits (adjust these to match your photo)

const BOTTLE_MAX_W = 120; // px (adjust size to fit your shelf height)
const BOTTLE_ASPECT = 3 / 4; // keeps bottle cards 3:4

export default function BoutiqueShelves({ fragrances }) {
  // Split fragrances across rows (left→right, top→bottom)
  const rows = SHELF_Y.map(() => []);
  fragrances.forEach((f, i) => rows[i % rows.length].push(f));

  return (
    <div className="absolute inset-0 pointer-events-none">
      {rows.map((rowFrags, idx) => (
        <div
          key={idx}
          className="absolute left-0 right-0 flex flex-wrap justify-center gap-4"
          style={{
            top: `${SHELF_Y[idx]}%`,
            transform: 'translateY(-50%)',
            padding: '0 4%',
          }}
        >
          {rowFrags.map((fragrance) => {
            const imgSrc = fragrance.image_url?.startsWith('http')
              ? fragrance.image_url
              : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${fragrance.image_url}`;

            return (
              <div
                key={fragrance.id}
                className="bg-white/85 rounded-xl shadow-sm"
                style={{
                  width: BOTTLE_MAX_W,
                  height: BOTTLE_MAX_W / BOTTLE_ASPECT,
                  pointerEvents: 'auto', // clickable
                }}
                onClick={() => (window.location.href = `/fragrance/${fragrance.id}`)}
                title={`${fragrance.brand} — ${fragrance.name}`}
              >
                <div className="w-full h-full p-2">
                  <img
                    src={imgSrc}
                    alt={fragrance.name}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
