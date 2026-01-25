import Image from "next/image";
import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "My Collection • Fragrantique",
};

export default function MyCollectionPage() {
  const images = [
    { src: "/1.jpg", alt: "Collection photo 1" },
    { src: "/2.jpg", alt: "Collection photo 2" },
    { src: "/3.jpg", alt: "Collection photo 3" },
    { src: "/4.jpg", alt: "Collection photo 4" },
  ];

  const tiktoks = [
    {
      id: "7560452233553333559",
      url: "https://www.tiktok.com/@fragrantique.net/video/7560452233553333559",
      title: "Fragrantique TikTok #1",
    },
    {
      id: "7576417419229433143",
      url: "https://www.tiktok.com/@fragrantique.net/video/7576417419229433143",
      title: "Fragrantique TikTok #2",
    },
    {
      id: "7570841726231874871",
      url: "https://www.tiktok.com/@fragrantique.net/video/7570841726231874871",
      title: "Fragrantique TikTok #3",
    },
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
            <div
              key={v.id}
              className="rounded-2xl shadow overflow-hidden bg-white p-3"
            >
              <blockquote
                className="tiktok-embed"
                cite={v.url}
                data-video-id={v.id}
                style={{ maxWidth: 325, margin: "0 auto" }}
              >
                <section />
              </blockquote>

              {/* Fallback link so this section never looks broken */}
              <div className="mt-2 text-center text-xs text-gray-500">
                If it doesn’t load,{" "}
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-70"
                >
                  open on TikTok
                </a>
                .
              </div>
            </div>
          ))}
        </div>

        {/* TikTok embed script (Next.js-friendly) */}
        <Script src="https://www.tiktok.com/embed.js" strategy="afterInteractive" />
      </section>
    </main>
  );
}
