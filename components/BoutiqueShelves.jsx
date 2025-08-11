import Image from 'next/image';

// Y positions in % from the top of the image
const SHELF_Y = [27.15, 38.09, 48.14, 58.20, 68.26, 77.54, 83.89];
// X bounds (percent from left/right) where bottles can appear
const SHELF_LEFT_PCT = 20;
const SHELF_RIGHT_PCT = 80;

export default function BoutiqueShelves({ fragrances }) {
  if (!fragrances || fragrances.length === 0) return null;

  const bottlesPerShelf = Math.ceil(fragrances.length / SHELF_Y.length);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {SHELF_Y.map((y, shelfIndex) => {
        const startIdx = shelfIndex * bottlesPerShelf;
        const endIdx = startIdx + bottlesPerShelf;
        const shelfFragrances = fragrances.slice(startIdx, endIdx);

        return shelfFragrances.map((frag, idx) => {
          const totalSpace = SHELF_RIGHT_PCT - SHELF_LEFT_PCT;
          const xPct =
            SHELF_LEFT_PCT + (idx + 0.5) * (totalSpace / bottlesPerShelf);

          return (
            <div
              key={`${shelfIndex}-${frag.id || idx}`}
              className="absolute"
              style={{
                top: `${y}%`,
                left: `${xPct}%`,
                transform: 'translate(-50%, -50%)',
                width: '6%', // bottle width relative to image
              }}
            >
              <Image
                src={frag.image_url || '/placeholder.png'}
                alt={frag.name}
                width={200}
                height={200}
                style={{
                  objectFit: 'contain',
                  backgroundColor: 'transparent',
                  mixBlendMode: 'multiply', // helps remove white BG if not transparent
                }}
              />
            </div>
          );
        });
      })}
    </div>
  );
}
