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

      {/* Single boutique logo that links to Stephanie's boutique */}
      <div className="flex flex-col items-center mt-10 px-6">
        <Link href="/u/stephanie" aria-label="Open Stephanie's boutique">
          <Image
            src="/BoutiqueLogo.png"
            alt="Stephanie's Boutique"
            width={420}
            height={420}
            className="w-[280px] md:w-[380px] lg:w-[420px] h-auto hover:scale-[1.02] transition"
            priority
          />
        </Link>

        <p className="mt-6 text-gray-600 text-base">
          More Boutiques coming soon...
        </p>
      </div>
    </main>
  );
}
