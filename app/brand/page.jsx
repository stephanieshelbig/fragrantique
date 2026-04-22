"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// --- helpers ---
const brandKey = (b: string | null | undefined) =>
  (b || "unknown")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const STOPWORDS = new Set([
  "paris", "london", "milan", "new", "york", "nyc", "roma", "rome",
  "perfume", "perfumes", "parfum", "parfums", "fragrance", "fragrances",
  "inc", "ltd", "llc", "co", "company", "laboratories", "laboratory", "lab", "labs",
  "edition", "editions", "house", "maison", "atelier", "collection", "collections",
]);

function canonicalBrandKey(b: string | null | undefined) {
  const strict = brandKey(b);
  const parts = strict.split("-").filter(Boolean);
  const kept = parts.filter((p) => !STOPWORDS.has(p));
  const canon = kept.join("-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return canon || strict;
}

type Owner = {
  id: string | null;
  username: string;
};

type FragranceLink = {
  id?: string;
  brand?: string;
  name?: string;
};

export default function BrandClient() {
  const [mounted, setMounted] = useState(false);
  const [owner, setOwner] = useState<Owner>({ id: null, username: "stephanie" });
  const [links, setLinks] = useState<FragranceLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", "stephanie")
        .maybeSingle();

      if (cancelled) return;

      if (prof?.id) {
        setOwner(prof);

        const { data: rows } = await supabase
          .from("user_fragrances")
          .select("fragrance:fragrances(id, brand, name)")
          .eq("user_id", prof.id);

        if (!cancelled) {
          setLinks(((rows || []) as any[]).map((r) => r.fragrance).filter(Boolean));
        }
      } else {
        setOwner({ id: null, username: "stephanie" });
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const brands = useMemo(() => {
    const map = new Map<string, { display: string; strict: string; count: number }>();

    for (const f of links) {
      const disp = f?.brand || "Unknown";
      const strict = brandKey(disp);
      const canon = canonicalBrandKey(disp);

      if (!map.has(canon)) {
        map.set(canon, { display: disp, strict, count: 0 });
      }

      map.get(canon)!.count += 1;
    }

    return Array.from(map.entries()).sort((a, b) =>
      a[1].display.toLowerCase().localeCompare(b[1].display.toLowerCase())
    );
  }, [links]);

  if (!mounted) {
    return (
      <div className="min-h-screen" suppressHydrationWarning>
        <div className="relative w-full h-40 sm:h-56 md:h-64 lg:h-72" />
        <div className="max-w-5xl mx-auto p-6 space-y-4">
          <div className="p-3 rounded border bg-white h-16" />
          <div className="space-y-2">
            <div className="h-6 w-44 bg-gray-200 rounded" />
            <div className="h-4 w-80 bg-gray-200 rounded" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="px-3 py-2 rounded bg-gray-200 h-8 animate-pulse" aria-hidden />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcf9]">
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="p-4 rounded-2xl border border-[#ead9b8] bg-white/95 shadow-sm flex flex-wrap items-center gap-5">
          {/* Left side: social icons */}
          <div className="flex items-center gap-3">
            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@fragrantique.net"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Fragrantique on TikTok"
              className="social-icon group"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-black fill-current" aria-hidden="true">
                <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.68h-3.274v13.37a2.96 2.96 0 1 1-2.96-2.96c.244 0 .48.03.707.086V9.157a6.236 6.236 0 0 0-.707-.04A6.233 6.233 0 1 0 15.818 15.35V8.568a8.048 8.048 0 0 0 4.71 1.52V6.686h-.939Z" />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/fragrantique_net"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Fragrantique on Instagram"
              className="social-icon group"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
                <defs>
                  <linearGradient id="brandPageInstagramGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#feda75" />
                    <stop offset="35%" stopColor="#fa7e1e" />
                    <stop offset="65%" stopColor="#d62976" />
                    <stop offset="85%" stopColor="#962fbf" />
                    <stop offset="100%" stopColor="#4f5bd5" />
                  </linearGradient>
                </defs>
                <path
                  fill="url(#brandPageInstagramGradient)"
                  d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.95 1.35a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Z"
                />
              </svg>
            </a>

            {/* YouTube */}
            <a
              href="https://www.youtube.com/@fragrantique"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Fragrantique on YouTube"
              className="social-icon group"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true" fill="#FF0000">
                <path d="M23.498 6.186a2.997 2.997 0 0 0-2.11-2.12C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.388.566a2.997 2.997 0 0 0-2.11 2.12C0 8.08 0 12 0 12s0 3.92.502 5.814a2.997 2.997 0 0 0 2.11 2.12C4.495 20.5 12 20.5 12 20.5s7.505 0 9.388-.566a2.997 2.997 0 0 0 2.11-2.12C24 15.92 24 12 24 12s0-3.92-.502-5.814ZM9.75 15.568V8.432L15.818 12 9.75 15.568Z" />
              </svg>
            </a>
          </div>

          {/* Right side: pretty buttons */}
          <div className="ml-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Link
              href="/notes"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-[#d9c39a] bg-gradient-to-br from-[#fff7ec] to-[#f7e8d4] px-5 py-2.5 text-sm font-semibold text-[#182A39] shadow-sm hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(217,195,154,0.45)] transition-all duration-200"
            >
              <span className="text-base">🔍</span>
              <span>Search by name, brand, or notes</span>
            </Link>

            <Link
              href="/recommendations"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-[#d9c39a] bg-gradient-to-br from-[#fbe5ff] to-[#f3d7ff] px-5 py-2.5 text-sm font-semibold text-[#182A39] shadow-sm hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(217,195,154,0.45)] transition-all duration-200"
            >
              <span className="text-base">✨</span>
              <span>Get recommendations</span>
            </Link>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#182A39]">Brand index</h1>
        <p className="opacity-70 text-sm text-[#182A39]">
          Showing brands from <span className="font-medium">@{owner.username}</span>’s boutique.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {loading &&
            Array.from({ length: 12 }).map((_, i) => (
              <div
                key={`s-${i}`}
                className="px-3 py-2 rounded bg-gray-200 animate-pulse h-8"
                aria-hidden
              />
            ))}

          {!loading && brands.length === 0 && (
            <div className="col-span-full p-4 border rounded bg-white">No brands yet.</div>
          )}

          {!loading &&
            brands.length > 0 &&
            brands.map(([canon, meta]) => {
              const href = `/u/${encodeURIComponent(owner.username)}/brand/${meta.strict}`;
              return (
                <Link
                  key={canon}
                  href={href}
                  className="px-3 py-2 rounded bg-[#182A39] text-white hover:opacity-90 text-sm"
                >
                  {meta.display} <span className="opacity-70">({meta.count})</span>
                </Link>
              );
            })}
        </div>
      </div>

      <style jsx global>{`
        .social-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.75rem;
          height: 2.75rem;
          border-radius: 9999px;
          border: 1px solid #ead9b8;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
          animation: socialFloat 3.6s ease-in-out infinite;
        }

        .social-icon:nth-child(2) {
          animation-delay: 0.35s;
        }

        .social-icon:nth-child(3) {
          animation-delay: 0.7s;
        }

        .social-icon:hover {
          transform: translateY(-3px) scale(1.08);
          box-shadow: 0 0 18px rgba(217, 195, 154, 0.45);
          background: #fffdf9;
        }

        @keyframes socialFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
}
