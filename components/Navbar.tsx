"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full bg-[#fdfcf9] border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Brand logo */}
        <Link href="/" className="text-2xl font-bold text-[#b5985a]">
          Fragrantique
        </Link>
      </div>
    </nav>
  );
}
