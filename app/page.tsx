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

              {/* Fragrantique AI */}
              <Link href="/fragrantique-ai">
                <div className="group relative overflow-hidden flex items-center gap-5 rounded-2xl border border-[#d9c39a] bg-gradient-to-br from-[#fff7ec] to-[#f7e8d4] px-6 py-5 shadow-md hover:shadow-[0_0_35px_rgba(217,195,154,0.9)] hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                  {/* Glow accent */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(217,195,154,0.25),transparent_70%)]" />

                  {/* Icon */}
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#fff1d6] to-[#e7cfa2] shadow-inner text-xl">
                    ✨
                  </div>

                  {/* Text */}
                  <div className="relative z-10">
                    <div className="text-lg md:text-xl font-semibold text-[#182A39] tracking-wide">
                      Fragrantique AI
                    </div>
                    <div className="text-sm md:text-base text-[#182A39]/80">
                      Get personalized fragrance matches powered by AI
                    </div>
                  </div>
                </div>
              </Link>

              {/* Social Buttons */}
              <div className="flex flex-wrap justify-center gap-3 -mt-1">
                {/* TikTok */}
                <a
                  href="https://www.tiktok.com/@fragrantique.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit Fragrantique on TikTok"
                  className="group inline-flex items-center gap-2 rounded-full border border-[#ead9b8] bg-white/90 px-4 py-2.5 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(217,195,154,0.5)] transition-all duration-200"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    aria-hidden="true"
                    fill="currentColor"
                  >
                    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.68h-3.274v13.37a2.96 2.96 0 1 1-2.96-2.96c.244 0 .48.03.707.086V9.157a6.236 6.236 0 0 0-.707-.04A6.233 6.233 0 1 0 15.818 15.35V8.568a8.048 8.048 0 0 0 4.71 1.52V6.686h-.939Z" />
                  </svg>
                  <span className="text-sm font-medium text-[#182A39]">TikTok</span>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/fragrantique_net"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit Fragrantique on Instagram"
                  className="group inline-flex items-center gap-2 rounded-full border border-[#ead9b8] bg-white/90 px-4 py-2.5 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(217,195,154,0.5)] transition-all duration-200"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="instagramGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#feda75" />
                        <stop offset="35%" stopColor="#fa7e1e" />
                        <stop offset="65%" stopColor="#d62976" />
                        <stop offset="85%" stopColor="#962fbf" />
                        <stop offset="100%" stopColor="#4f5bd5" />
                      </linearGradient>
                    </defs>
                    <path
                      fill="url(#instagramGradient)"
                      d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.95 1.35a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-[#182A39]">Instagram</span>
                </a>

                {/* YouTube */}
                <a
                  href="https://www.youtube.com/@fragrantique"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit Fragrantique on YouTube"
                  className="group inline-flex items-center gap-2 rounded-full border border-[#ead9b8] bg-white/90 px-4 py-2.5 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(217,195,154,0.5)] transition-all duration-200"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    aria-hidden="true"
                    fill="#FF0000"
                  >
                    <path d="M23.498 6.186a2.997 2.997 0 0 0-2.11-2.12C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.388.566a2.997 2.997 0 0 0-2.11 2.12C0 8.08 0 12 0 12s0 3.92.502 5.814a2.997 2.997 0 0 0 2.11 2.12C4.495 20.5 12 20.5 12 20.5s7.505 0 9.388-.566a2.997 2.997 0 0 0 2.11-2.12C24 15.92 24 12 24 12s0-3.92-.502-5.814ZM9.75 15.568V8.432L15.818 12 9.75 15.568Z" />
                  </svg>
                  <span className="text-sm font-medium text-[#182A39]">YouTube</span>
                </a>
              </div>
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
