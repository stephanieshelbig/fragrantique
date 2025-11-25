'use client';

import Link from 'next/link';

export default function HeaderBar() {
  return (
      <div className="sticky top-0 z-10 border-b bg-[#182A39]/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">

        {/* Left side: Enlarged Logo */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/FragrantiqueLogo3.png"
            alt="Fragrantique Logo"
            className="h-48 w-auto"
          />
        </div>

        {/* Right side: Text */}
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
