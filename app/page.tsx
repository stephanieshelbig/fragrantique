import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fdfcf9] flex flex-col items-center py-12 px-4">

      {/* Welcome Message */}
      <div className="max-w-2xl text-center mb-10">
        <h1 className="text-2xl font-bold text-[#182A39] mb-4">
          Welcome to Fragrantique 🌸
        </h1>
        <p className="text-lg text-[#182A39]/90 leading-relaxed">
          Thank you so much for viewing my page!  
          I have a large fragrance collection, and I sell decants of it to pay for school... 
          and more fragrances!  
          Click one of the buttons below to start browsing my collection.  
          Feel free to contact me using the <span className="font-semibold">'Contact Me'</span> link at the top of the page.💕
        </p>
      </div>

      {/* Buttons Container */}
      <div className="flex flex-col gap-6 w-full max-w-sm">

        {/* Search Collection */}
        <Link href="/notes">
          <div className="flex items-center gap-4 px-6 py-4 bg-[#b5985a] text-white rounded-xl shadow hover:bg-[#a2834d] transition cursor-pointer">
            <span className="text-2xl">🔍</span>
            <span className="text-lg font-semibold">
              Search My Collection
            </span>
          </div>
        </Link>

        {/* Recommendations */}
        <Link href="/recommendations">
          <div className="flex items-center gap-4 px-6 py-4 bg-[#b5985a] text-white rounded-xl shadow hover:bg-[#a2834d] transition cursor-pointer">
            <span className="text-2xl">✨</span>
            <span className="text-lg font-semibold">
              Get Recommendations
            </span>
          </div>
        </Link>

        {/* Boutiques */}
        <Link href="/u">
          <div className="flex items-center gap-4 px-6 py-4 bg-[#b5985a] text-white rounded-xl shadow hover:bg-[#a2834d] transition cursor-pointer">
            <span className="text-2xl">🏬</span>
            <span className="text-lg font-semibold">
              Browse Fragrance Boutiques
            </span>
          </div>
        </Link>
 
      </div>
    </main>
  );
}
