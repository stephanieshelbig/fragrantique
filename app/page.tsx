import Image from "next/image";
import Link from "next/link";
import HeaderImage from "@/../public/Header.png";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fdfcf9] flex flex-col items-center">
      {/* Header banner */}
      <div className="w-full">
        <Image
          src={HeaderImage}
          alt="Fragrantique Header"
          width={1600}
          height={300}
          priority
          className="w-full object-cover"
        />
      </div>

      {/* Welcome section */}
      <div className="text-center mt-10 px-6 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome to my Fragrance Boutique
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          I have a large fragrance collection and I'd love to share it with you!
        </p>

        {/* Button */}
        <Link href="/u/stephanie">
          <button className="mt-8 px-6 py-3 bg-[#b5985a] text-white rounded-xl shadow hover:bg-[#a2834d] transition">
            Click here to see fragrances and decants for sale
          </button>
        </Link>
      </div>
    </main>
  );
}
