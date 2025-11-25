import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fdfcf9] flex flex-col items-center">
      {/* Header banner from /public */}
      <div className="w-full">
      </div>
<div className="mb-3 text-center text-sm">
        <Link href="/notes" className="font-semibold underline">
          Click here to search my collection (easy viewing for mobile users)
        </Link>
      </div>
      
      <div className="mb-3 text-center text-sm">
        <Link href="/recommendations" className="font-semibold underline">
          Click here for some recommendations
        </Link>
      </div>
      
      {/* CTA Buttons */}
      <div className="text-center mt-10 px-6 max-w-3xl space-y-6">
        {/* Existing boutiques button */}
        <Link href="/u">
          <button className="px-6 py-3 bg-[#b5985a] text-white rounded-xl shadow hover:bg-[#a2834d] transition">
            Click here to view the Fragrance Boutiques
          </button>
        </Link>

        
      </div>
    </main>
  );
}
