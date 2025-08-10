'use client';

import { useRouter } from 'next/navigation';

export default function FragranceShelf({ fragrances }) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-4 gap-4">
      {fragrances.map((fragrance) => {
        const imgSrc = fragrance.image_url?.startsWith('http')
          ? fragrance.image_url
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${fragrance.image_url}`;

        return (
          <div
            key={fragrance.id}
            className="flex flex-col items-center p-2 bg-white rounded shadow cursor-pointer hover:shadow-lg transition"
            onClick={() => router.push(`/fragrance/${fragrance.id}`)}
          >
            <img
              src={imgSrc}
              alt={fragrance.name}
              className="w-full h-auto object-contain"
            />
            <p className="mt-2 text-center font-semibold">{fragrance.name}</p>
            <p className="text-sm text-gray-500">{fragrance.brand}</p>
          </div>
        );
      })}
    </div>
  );
}
