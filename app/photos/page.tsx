import Image from 'next/image';

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

      {/* Photos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
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
      <section className="border-t pt-10">
        <h2 className="text-xl font-semibold mb-2">
          Watch my collection on TikTok
        </h2>

        <p className="text-sm text-gray-600 mb-8">
          Short videos featuring bottles, shelves, and favorites from my
          Fragrantique collection.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Video 1 */}
          <blockquote
            className="tiktok-embed"
            cite="https://www.tiktok.com/@fragrantique.net/video/7560452233553333559"
            data-video-id="7560452233553333559"
            style={{ maxWidth: '325px', margin: '0 auto' }}
          >
            <section />
          </blockquote>

          {/* Video 2 */}
          <blockquote
            className="tiktok-embed"
            cite="https://www.tiktok.com/@fragrantique.net/video/7576417419229433143"
            data-video-id="7576417419229433143"
            style={{ maxWidth: '325px', margin: '0 auto' }}
          >
            <section />
          </blockquote>

          {/* Video 3 */}
          <blockquote
            className="tiktok-embed"
            cite="https://www.tiktok.com/@fragrantique.net/video/7570841726231874871"
            data-video-id="7570841726231874871"
            style={{ maxWidth: '325px', margin: '0 auto' }}
          >
            <section />
          </blockquote>
        </div>
      </section>

      {/* TikTok embed script */}
      <script async src="https://www.tiktok.com/embed.js"></script>
    </main>
  );
}
