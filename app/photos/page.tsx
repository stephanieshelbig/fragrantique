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

  const tiktoks = [
    {
      id: '7560452233553333559',
      autoplay: 1, // plays automatically (if the browser allows)
      title: 'Fragrantique TikTok #1',
    },
    {
      id: '7576417419229433143',
      autoplay: 0, // paused on load
      title: 'Fragrantique TikTok #2',
    },
    {
      id: '7570841726231874871',
      autoplay: 0, // paused on load
      title: 'Fragrantique TikTok #3',
    },
  ];

  return (
    <main className="mx-auto max-w-6xl w-full px-3 py-6">
      <h1 className="text-2xl font-semibold mb-2">Here are some pics of my collection</h1>

      {/* Photos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
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

      {/* TikTok Section */}
      <section className="border-t pt-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h2 className="text-xl font-semibold">Watch my collection on TikTok</h2>

          <Link
            href="https://www.tiktok.com/@fragrantique.net"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-black px-5 py-2 text-sm font-medium text-black hover:opacity-70 transition"
          >
            Follow @fragrantique.net
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiktoks.map((v) => (
            <div key={v.id} className="rounded-2xl shadow overflow-hidden bg-white">
              <div className="relative w-full aspect-[9/16]">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`https://www.tiktok.com/player/v1/${v.id}?controls=1&autoplay=${v.autoplay}&loop=0`}
                  allow="fullscreen; autoplay"
                  title={v.title}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
