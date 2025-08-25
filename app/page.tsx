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

      {/* CTA Button only */}
      <div className="text-center mt-10 px-6 max-w-3xl">
        <Link href="/u">
          <button className="mt-8 px-6 py-3 bg-[#b5985a] text-white rounded-xl shadow hover:bg-[#a2834d] transition">
            Click here to view the Fragrance Boutiques
          </button>
        </Link>
      </div>
    </main>
  );
}
