import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'My Collection • Fragrantique',
};

export default function MyCollectionPage() {
  const images = [
    { src: '/1.jpg', alt: 'Collection photo 1' },
    { src: '/2.jpg', alt: 'Collection photo 2' },
    { src: '/3.jpg', alt: 'Collection photo 3' },
    { src: '/4.jpg', alt: 'Collection photo 4' },
  ];

  return (
    <main className="mx-auto max-w-6xl w-full px-3 py-6">
      <h1 className="text-2xl font-semibold mb-2">Here are some pics of my collection</h1>
      <p className="text-sm text-gray-600 mb-6">
        This page lives at <span className="font-mono">/photos</span>.{' '}
        <Link href="/photos" className="underline">Direct link</Link>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {images.map(({ src, alt }) => (
          <div key={src} className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl shadow">
            <Image
              src={src}
              alt={alt}
              fill
              priority
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </main>
  );
}
