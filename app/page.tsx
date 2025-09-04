'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fdfcf9] flex flex-col items-center justify-center p-6">
      {/* Header image */}
      <img
        src="/Header.png"
        alt="Fragrantique Header"
        className="w-full max-h-72 object-cover mb-10"
      />

      {/* Welcome text */}
      <h1 className="text-3xl font-bold mb-4 text-center">
        Welcome to my Fragrance Boutique
      </h1>
      <p className="text-lg opacity-80 mb-8 text-center max-w-2xl">
        I have a large fragrance collection and I'd love to share it with you!
      </p>

      {/* Main CTA */}
      <Link
        href="/u/stephanie"
        className="px-6 py-3 rounded bg-[#b5985a] text-white hover:bg-[#a58749] transition"
      >
        Click here to view the Fragrance Boutiques
      </Link>

      {/* New Musk Anosmia button */}
      <div className="mt-6">
        <Link
          href="/muskAnosmia"
          className="px-6 py-3 rounded bg-pink-700 text-white hover:bg-pink-800 transition"
        >
          Musk Anosmia
        </Link>
      </div>
    </div>
  );
}
