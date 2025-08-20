// app/page.jsx
'use client';

import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fdfcf9] flex flex-col items-center px-6 pb-16">
      {/* Header / Logo */}
      <section className="w-full max-w-6xl flex flex-col items-center text-center mt-10 md:mt-14">
        <img
          src="/FragrantiqueLogo.png"
          alt="Fragrantique logo"
          className="w-[280px] md:w-[360px] h-auto drop-shadow-sm"
        />
        <h1 className="mt-6 text-2xl md:text-3xl font-bold text-gray-800">
          Welcome to the Fragrance Boutique&nbsp;–&nbsp;Fragrantique
        </h1>

        {/* CTA Button */}
        <div className="mt-6">
          <Link
            href="/u/stephanie"
            className="inline-block rounded-2xl bg-[#f5cfe3] text-gray-900 hover:bg-[#f2bdd8] transition-colors px-5 py-3 text-base md:text-lg font-medium shadow"
          >
            Click here to see fragrances and decants for sale
          </Link>
        </div>
      </section>

      {/* Photo Grid */}
      <section className="w-full max-w-6xl mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <img
          src="/1.jpg"
          alt="Fragrance collection cabinet 1"
          className="rounded-2xl shadow-lg w-full h-auto object-cover"
        />
        <img
          src="/2.jpg"
          alt="Fragrance collection detail 2"
          className="rounded-2xl shadow-lg w-full h-auto object-cover"
        />
        <img
          src="/3.jpg"
          alt="Fragrance collection cabinet 3"
          className="rounded-2xl shadow-lg w-full h-auto object-cover"
        />
      </section>
    </main>
  );
}
