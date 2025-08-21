// app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import Logo from "../public/FragrantiqueLogo.png";
import Pic1 from "../public/1.jpg";
import Pic2 from "../public/2.jpg";
import Pic3 from "../public/3.jpg";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-800 px-6 py-12">
      {/* Logo */}
      <div className="mb-6">
        <Image
          src={Logo}
          alt="Fragrantique Logo"
          width={250}
          height={250}
          priority
        />
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold text-center mb-2">
        Welcome to my Fragrance Boutique
      </h1>
      <p className="text-lg text-center mb-6">
        I have a large fragrance collection and I'd love to share it with you!
      </p>

      {/* Call-to-action button */}
      <Link
        href="/u/stephanie"
        className="bg-pink-200 hover:bg-pink-300 text-gray-800 font-semibold px-6 py-3 rounded-2xl shadow-lg transition"
      >
        Click here to see fragrances and decants for sale
      </Link>

      {/* Image row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl w-full">
        <div className="relative w-full h-64">
          <Image
            src={Pic1}
            alt="Fragrance Collection 1"
            fill
            className="object-cover rounded-xl shadow-md"
          />
        </div>
        <div className="relative w-full h-64">
          <Image
            src={Pic2}
            alt="Fragrance Collection 2"
            fill
            className="object-cover rounded-xl shadow-md"
          />
        </div>
        <div className="relative w-full h-64">
          <Image
            src={Pic3}
            alt="Fragrance Collection 3"
            fill
            className="object-cover rounded-xl shadow-md"
          />
        </div>
      </div>
    </main>
  );
}
