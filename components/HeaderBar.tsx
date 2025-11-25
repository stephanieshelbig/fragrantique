'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function HeaderBar() {
  const pathname = usePathname();
  const isNotesPage = pathname?.startsWith('/notes');
  const isRecommendationsPage = pathname?.startsWith('/recommendations');

  const containerClasses = isNotesPage
    ? 'relative z-10 border-b bg-[#182A39]/90 backdrop-blur'
    : 'sticky top-0 z-10 border-b bg-[#182A39]/90 backdrop-blur';

  return (
    <div className={containerClasses}>
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
        <nav className="flex flex-col items-end gap-2 text-[15px] font-medium text-[#F2D2A4]">
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
