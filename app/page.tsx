"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <main
        className="min-h-screen flex justify-center px-4 py-12 bg-[#fdfcf9]"
        style={{
          backgroundImage:
            "radial-gradient(circle at top, #f5ebdc 0, #fdfcf9 40%, #fdfcf9 100%), repeating-linear-gradient(45deg, rgba(217,195,154,0.08), rgba(217,195,154,0.08) 6px, transparent 6px, transparent 12px)",
          backgroundBlendMode: "soft-light",
        }}
      >
        <div className="w-full max-w-3xl">
          <div
            className="rounded-3xl border border-[#d9c39a] shadow-xl px-8 py-10 bg-white/95"
            style={{
              backgroundImage:
                "radial-gradient(circle at top, #fff7ec 0, #fdf7ee 40%, #f7e8d4 100%), repeating-linear-gradient(135deg, rgba(217,195,154,0.10), rgba(217,195,154,0.10) 8px, transparent 8px, transparent 16px)",
              backgroundBlendMode: "soft-light",
            }}
          >
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div
                className="rounded-full border border-[#e3cfaa] bg-white/80 shadow-md px-6 py-4 transform transition-transform duration-700 hover:scale-105 hover:shadow-2xl"
                style={{
                  animation: "floatLogo 6s ease-in-out infinite, logoGlow 6s ease-in-out infinite",
                }}
              >
                <Image
                  src="/FragrantiqueLogo3.png"
                  alt="Fragrantique Logo"
                  width={190}
                  height={80}
                  priority
                />
              </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-4">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-wide text-[#182A39]">
                Welcome to Fragrantique
              </h1>
              <p className="text-base md:text-lg text-[#182A39]/90 leading-relaxed">
                Thank you so much for viewing my page! I have a large fragrance collection,
                and I sell decants of it to make some extra money. Click one
                of the buttons below to start browsing my collection. Feel free to contact me
                using the <span className="font-semibold">'Contact Me'</span> link at the top
                of the page💕
              </p>
            </div>

            <div className="text-center space-y-4 mt-4">
              <p className="text-base md:text-lg text-[#182A39]/90 leading-relaxed">
                *** I am in the US and can only ship to addresses in the US... for now.
              </p>
            </div>

            {/* Divider */}
            <div className="mt-8 mb-6 flex justify-center">
              <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#d9c39a] to-transparent" />
            </div>

            {/* Buttons */}
            <div className="grid gap-4">

              {/* Search Collection */}
              <Link href="/notes">
                <div className="group relative overflow-hidden flex items-center gap-4 rounded-2xl border border-[#ead9b8] bg-white/90 px-6 py-4 shadow-sm hover:shadow-[0_0_25px_rgba(217,195,154,0.7)] hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#f5e2c3] to-[#d9b675] shadow-inner">
                    <span className="text-xl">🔍</span>
                  </div>
                  <div>
                    <div className="text-base md:text-lg font-semibold text-[#182A39]">
                      Search My Collection
                    </div>
                    <div className="text-xs md:text-sm text-[#182A39]/70">
                      Best for easy viewing on mobile
                    </div>
                  </div>
                </div>
              </Link>

              {/* Sort by Brand */}
              <Link href="/brand">
                <div className="group relative overflow-hidden flex items-center gap-4 rounded-2xl border border-[#ead9b8] bg-white/90 px-6 py-4 shadow-sm hover:shadow-[0_0_25px_rgba(217,195,154,0.7)] hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#ffe9d9] to-[#f1bfa0] shadow-inner">
                    <span className="text-xl">🏷️</span>
                  </div>
                  <div>
                    <div className="text-base md:text-lg font-semibold text-[#182A39]">
                      Sort by Brand
                    </div>
                    <div className="text-xs md:text-sm text-[#182A39]/70">
                      Display my collection by Brand Name
                    </div>
                  </div>
                </div>
              </Link>

              {/* Recommendations */}
              <Link href="/recommendations">
                <div className="group relative overflow-hidden flex items-center gap-4 rounded-2xl border border-[#ead9b8] bg-white/90 px-6 py-4 shadow-sm hover:shadow-[0_0_25px_rgba(217,195,154,0.7)] hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#fbe5ff] to-[#e1b7ff] shadow-inner">
                    <span className="text-xl">✨</span>
                  </div>
                  <div>
                    <div className="text-base md:text-lg font-semibold text-[#182A39]">
                      Get Recommendations
                    </div>
                    <div className="text-xs md:text-sm text-[#182A39]/70">
                      Let me suggest something you might love
                    </div>
                  </div>
                </div>
              </Link>

              {/* NEW: Fragrantique AI */}
              <Link href="/fragrantique-ai">
                <div className="group flex items-center gap-4 rounded-xl border border-[#ead9b8] bg-white/80 px-6 py-3 shadow-sm hover:shadow-[0_0_18px_rgba(217,195,154,0.5)] hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#fff1d6] to-[#e7cfa2] shadow-inner">
                    <span className="text-lg">🤍</span>
                  </div>
                  <div>
                    <div className="text-sm md:text-base font-semibold text-[#182A39]">
                      Fragrantique AI
                    </div>
                    <div className="text-xs text-[#182A39]/70">
                      Personalized suggestions based on what you love & dislike
                    </div>
                  </div>
                </div>
              </Link>

            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes floatLogo {
          0% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0); }
        }

        @keyframes logoGlow {
          0%,100% {
            box-shadow: 0 10px 24px rgba(0,0,0,0.08),
            0 0 0 0 rgba(217,195,154,0.4);
          }
          50% {
            box-shadow: 0 14px 36px rgba(0,0,0,0.12),
            0 0 18px 4px rgba(217,195,154,0.6);
          }
        }
      `}</style>
    </>
  );
}
