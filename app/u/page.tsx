import Image from "next/image";
import Link from "next/link";

export default function ExploreBoutiquesPage() {
  return (
    <main className="min-h-screen bg-[#fdfcf9] flex flex-col items-center">
      {/* Top header graphic for the boutiques page (from /public) */}
      <div className="w-full">
        {/* Use the filename you placed in /public.
           If your file is named 'BoutiquesHeader.png', keep the path below.
           (Place it at /public/BoutiquesHeader.png) */}
        <Image
          src="/BoutiquesHeader.png"
          alt="Explore the Fragrance Boutiques"
          width={1600}
          height={260}
          priority
          className="w-full object-cover"
        />
      </div>

      {/* Boutique logo with two static images to its right */}
      <div className="flex flex-col items-center mt-10 px-6">
        <div className="flex items-center gap-6 flex-wrap justify-center">
          <Link href="/notes" aria-label="Open Stephanie's boutique">
            <Image
              src="/BoutiqueLogo.png"
              alt="Stephanie's Boutique"
              width={420}
              height={420}
              className="w-[180px] md:w-[240px] lg:w-[280px] h-auto hover:scale-[1.50] transition"
              priority
            />
          </Link>

          {/* Two non-linked boutique preview images */}
          <Image
            src="/boutiques.bmp"
            alt="Boutique preview"
            width={280}
            height={280}
            className="w-[180px] md:w-[240px] lg:w-[280px] h-auto rounded-md shadow-sm"
          />
          <Image
            src="/boutiques.bmp"
            alt="Boutique preview"
            width={280}
            height={280}
            className="w-[180px] md:w-[240px] lg:w-[280px] h-auto rounded-md shadow-sm"
          />
        </div>

        <p className="mt-6 text-gray-600 text-base">
          More Boutiques coming soon...
        </p>
      </div>
    </main>
  );
}
