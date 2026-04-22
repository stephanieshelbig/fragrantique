"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

// --- helpers ---
const brandKey = (b) =>
  (b || "unknown")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const STOPWORDS = new Set([
  "paris","london","milan","new","york","nyc","roma","rome",
  "perfume","perfumes","parfum","parfums","fragrance","fragrances",
  "inc","ltd","llc","co","company","laboratories","laboratory","lab","labs",
  "edition","editions","house","maison","atelier","collection","collections",
]);

function canonicalBrandKey(b) {
  const strict = brandKey(b);
  const parts = strict.split("-").filter(Boolean);
  const kept = parts.filter((p) => !STOPWORDS.has(p));
  const canon = kept.join("-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return canon || strict;
}

export default function BrandClient() {
  const [mounted, setMounted] = useState(false);
  const [owner, setOwner] = useState({ id: null, username: "stephanie" });
  const [links, setLinks] = useState([]);
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

        if (!cancelled) setLinks((rows || []).map((r) => r.fragrance).filter(Boolean));
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
    const map = new Map();
    for (const f of links) {
      const disp = f?.brand || "Unknown";
      const strict = brandKey(disp);
      const canon = canonicalBrandKey(disp);
      if (!map.has(canon)) map.set(canon, { display: disp, strict, count: 0 });
      map.get(canon).count += 1;
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
          <div className="p-3 rounded border bg-white h-12" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto p-6 space-y-4">

        {/* HEADER BAR */}
        <div className="p-3 rounded border bg-white flex flex-wrap items-center gap-5">

          {/* LEFT: SOCIAL ICONS */}
          <div className="flex items-center gap-3">

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@fragrantique.net"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:scale-110 transition-transform"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-black fill-current">
                <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.68h-3.274v13.37a2.96 2.96 0 1 1-2.96-2.96c.244 0 .48.03.707.086V9.157a6.236 6.236 0 0 0-.707-.04A6.233 6.233 0 1 0 15.818 15.35V8.568a8.048 8.048 0 0 0 4.71 1.52V6.686h-.939Z" />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/fragrantique_net"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:scale-110 transition-transform"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <defs>
                  <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#feda75"/>
                    <stop offset="50%" stopColor="#d62976"/>
                    <stop offset="100%" stopColor="#4f5bd5"/>
                  </linearGradient>
                </defs>
                <path fill="url(#ig)" d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Z"/>
              </svg>
            </a>

            {/* YouTube */}
            <a
              href="https://www.youtube.com/@fragrantique"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:scale-110 transition-transform"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-red-600">
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8ZM9.8 15.5v-7l6 3.5-6 3.5Z"/>
              </svg>
            </a>

          </div>

          {/* RIGHT SIDE LINKS */}
          <div className="ml-auto flex flex-col items-start sm:items-end gap-1">
            <Link href="/notes" className="font-semibold underline">
              Click here to search by name, brand, or notes
            </Link>
            <Link href="/recommendations" className="font-semibold underline">
              Click here for some recommendations
            </Link>
          </div>
        </div>

        <h1 className="text-2xl font-bold">Brand index</h1>
        <p className="opacity-70 text-sm">
          Showing brands from <span className="font-medium">@{owner.username}</span>’s boutique.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {loading && Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="px-3 py-2 rounded bg-gray-200 animate-pulse h-8" />
          ))}

          {!loading && brands.map(([canon, meta]) => {
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
    </div>
  );
}
