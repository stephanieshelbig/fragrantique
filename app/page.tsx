import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fdfcf9] flex flex-col items-center">
      {/* Header banner from /public */}
      <div className="w-full">
        <Image
          src="/Header.png"
          alt="Fragrantique Header"
          width={1600}
          height={300}
          priority
          className="w-full object-cover"
        />
      </div>

      {/* CTA Buttons */}
      <div className="text-center mt-10 px-6 max-w-3xl space-y-6">
        {/* Existing boutiques button */}
        <Link href="/u">
          <button className="px-6 py-3 bg-[#b5985a] text-white rounded-xl shadow hover:bg-[#a2834d] transition">
            Click here to view the Fragrance Boutiques
          </button>
        </Link>

        {/* New Musk Anosmia button */}
        <Link href="/muskAnosmia">
          <button className="px-6 py-3 bg-pink-700 text-white rounded-xl shadow hover:bg-pink-800 transition">
            Musk Anosmia
          </button>
        </Link>
      </div>
    </main>
  );
}
