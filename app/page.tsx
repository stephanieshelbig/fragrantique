import Image from "next/image";
import Link from "next/link";

// Header banner
import HeaderImage from "@/../public/Header.png";

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

      {/* CTA Button only */}
      <div className="text-center mt-10 px-6 max-w-3xl">
        <Link href="/u/stephanie">
          <button className="mt-8 px-6 py-3 bg-[#b5985a] text-white rounded-xl shadow hover:bg-[#a2834d] transition">
            Click here to view the Fragrance Boutiques
          </button>
        </Link>
      </div>
    </main>
  );
}
