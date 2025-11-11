'use client';

import Link from 'next/link';

export default function HeaderBar() {
  return (
    <div className="w-full bg-white/90 backdrop-blur sticky top-0 z-40 border-b">
      <div className="mx-auto max-w-6xl w-full px-3 py-3 flex items-center justify-between">
        {/* Left: brand text */}
        <div className="text-[15px] font-semibold">
          Fragrantique <span className="font-normal">- the Fragrance Boutique  TikTok @fragrantique.net Insta @fragrantique_net</span>
        </div>

        {/* Right: nav links */}
        <nav className="flex items-center gap-4 text-[15px] font-medium">
          <Link href="/muskAnosmia" className="hover:underline">Musk Anosmia</Link>
          <Link href="/photos" className="hover:underline">My Collection</Link>
          <Link href="/brand" className="hover:underline">Brand Index</Link>
          <Link href="/chat" className="hover:underline">Contact Me</Link>
          <Link href="/cart" className="hover:underline">Cart</Link>
        </nav>
      </div>
    </div>
  );
}
