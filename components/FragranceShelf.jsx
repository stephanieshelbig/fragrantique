'use client';

import { useRouter } from 'next/navigation';

export default function FragranceShelf({ fragrances }) {
  const router = useRouter();

  if (!fragrances?.length) {
    return <div className="text-sm opacity-70">No fragrances on your shelves yet.</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {fragrances.map((fragrance) => {
        const imgSrc = fragrance.image_url?.startsWith('http')
          ? fragrance.image_url
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${fragrance.image_url}`;

        return (
          <div
            key={fragrance.id}
            className="glass-card p-3 cursor-pointer hover:shadow-lg transition rounded-xl"
            onClick={() => router.push(`/fragrance/${fragrance.id}`)}
          >
            <div className="w-full aspect-[3/4] overflow-hidden rounded-md bg-white">
              <img
                src={imgSrc}
                alt={fragrance.name}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="mt-2 text-center">
              <div className="text-sm font-semibold truncate" title={fragrance.name}>
                {fragrance.name}
              </div>
              <div className="text-xs text-gray-500 truncate" title={fragrance.brand}>
                {fragrance.brand}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
