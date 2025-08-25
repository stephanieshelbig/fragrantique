'use client';

import Image from 'next/image';

export default function BrandPage() {
  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      {/* Boutique Header */}
      <div className="relative w-full h-40 mb-4">
        <Image
          src="/StephaniesBoutiqueHeader.png"
          alt="Stephanie's Boutique Header"
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="p-6 text-center text-lg">
        <p>Brand Index will go here…</p>
      </div>
    </div>
  );
}
