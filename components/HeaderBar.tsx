'use client';

import Link from 'next/link';

export default function HeaderBar() {
  return (
    <div className="relative z-10 border-b bg-[#182A39]">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">

        {/* Left side: Clickable Logo */}
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/FragrantiqueLogo3.png"
            alt="Fragrantique Logo"
            className="h-48 w-auto cursor-pointer"
          />
        </Link>

        {/* Right side: Stacked vertical links */}
        <nav className="flex flex-col items-end gap-2 text-[15px] font-medium text-[#D4A774]">
          <Link href="/muskAnosmia" className="hover:underline">
            Musk Anosmia
          </Link>
          <Link href="/photos" className="hover:underline">
            My Collection
          </Link>
          <Link href="/brand" className="hover:underline">
            Brand Index
          </Link>
          <Link href="/chat" className="hover:underline">
            Contact Me
          </Link>
          <Link href="/cart" className="hover:underline">
            Cart
          </Link>
        </nav>

      </div>
    </div>
  );
}
