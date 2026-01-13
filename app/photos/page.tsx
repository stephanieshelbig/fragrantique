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
      <h1 className="text-2xl font-semibold mb-2">
        Here are some pics of my collection
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {images.map(({ src, alt }) => (
          <div
            key={src}
            className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl shadow"
          >
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

      {/* TikTok Section */}
      <section className="border-t pt-8">
        <h2 className="text-xl font-semibold mb-3">
          Watch my collection on TikTok
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Short videos featuring bottles, shelves, and favorites from my
          Fragrantique collection.
        </p>

        <ul className="space-y-3">
          <li>
            <Link
              href="https://www.tiktok.com/@fragrantique.net/video/7560452233553333559"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black underline hover:opacity-70"
            >
              TikTok Video #1 – Collection showcase
            </Link>
          </li>

          <li>
            <Link
              href="https://www.tiktok.com/@fragrantique.net/video/7576417419229433143"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black underline hover:opacity-70"
            >
              TikTok Video #2 – Shelf details & favorites
            </Link>
          </li>

          <li>
            <Link
              href="https://www.tiktok.com/@fragrantique.net/video/7570841726231874871"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black underline hover:opacity-70"
            >
              TikTok Video #3 – Bottles up close
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
