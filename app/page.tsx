import Image from "next/image";
import Link from "next/link";

// Header banner
import HeaderImage from "@/../public/Header.png";

// Gallery images (your collection photos)
import Photo1 from "@/../public/1.jpg";
import Photo2 from "@/../public/2.jpg";
import Photo3 from "@/../public/3.jpg";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fdfcf9] flex flex-col items-center">
      {/* Header banner */}
      <div className="w-full">
        <Image
          src={HeaderImage}
          alt="Fragrantique Header"
          width={1600}
          height={300}
          priority
          className="w-full object-cover"
        />
      </div>

      {/* Welcome section */}
      <div className="text-center mt-10 px-6 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome to my Fragrance Boutique
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          I have a large fragrance collection and I&apos;d love to share it with you!
        </p>

        {/* CTA Button */}
        <Link href="/u/stephanie">
          <button className="mt-8 px-6 py-3 bg-[#b5985a] text-white rounded-xl shadow hover:bg-[#a2834d] transition">
            Click here to see fragrances and decants for sale
          </button>
        </Link>
      </div>

      {/* Gallery */}
      <section className="w-full max-w-6xl px-6 mt-12 mb-16">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          A peek at my collection
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Photo 1 */}
          <figure className="bg-white rounded-xl shadow overflow-hidden">
            <Image
              src={Photo1}
              alt="Fragrance cabinet — shelf view 1"
              className="w-full h-[320px] object-cover"
              placeholder="blur"
            />
            <figcaption className="p-3 text-sm text-gray-600">
              One of my cabinet displays — lots of sparkle ✨
            </figcaption>
          </figure>

          {/* Photo 2 */}
          <figure className="bg-white rounded-xl shadow overflow-hidden">
            <Image
              src={Photo2}
              alt="Fragrance cabinet — close-up with bee bottles"
              className="w-full h-[320px] object-cover"
              placeholder="blur"
            />
            <figcaption className="p-3 text-sm text-gray-600">
              Close-ups of some favorite bottles and details
            </figcaption>
          </figure>

          {/* Photo 3 */}
          <figure className="bg-white rounded-xl shadow overflow-hidden">
            <Image
              src={Photo3}
              alt="Fragrance cabinet — shelf view 2"
              className="w-full h-[320px] object-cover"
              placeholder="blur"
            />
            <figcaption className="p-3 text-sm text-gray-600">
              More of my shelves — curated over years
            </figcaption>
          </figure>
        </div>
      </section>
    </main>
  );
}
