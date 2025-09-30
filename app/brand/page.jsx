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
  // Mount guard ensures first client render matches server fallback skeleton
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

  // While not mounted, mirror the server-side skeleton exactly.
  if (!mounted) {
    return (
      <div className="min-h-screen" suppressHydrationWarning>
        <div className="relative w-full h-40 sm:h-56 md:h-64 lg:h-72" />
        <div className="max-w-5xl mx-auto p-6 space-y-4">
          <div className="p-3 rounded border bg-white h-12" />
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

  // Mounted -> render the real page
  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="relative w-full h-40 sm:h-56 md:h-64 lg:h-72">
        <Image
          src="/FragrantiqueHeader.png"
          alt="Fragrantique"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="p-3 rounded border bg-white flex flex-wrap items-center gap-5">
          <Link href="/decants" className="font-semibold underline">
            Click here to view all available decants
          </Link>
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
            <div key={`s-${i}`} className="px-3 py-2 rounded bg-gray-200 animate-pulse h-8" aria-hidden />
          ))}

          {!loading && brands.length === 0 && (
            <div className="col-span-full p-4 border rounded bg-white">No brands yet.</div>
          )}

          {!loading && brands.length > 0 && brands.map(([canon, meta]) => {
            const href = `/u/${encodeURIComponent(owner.username)}/brand/${meta.strict}`;
            return (
              <Link
                key={canon}
                href={href}
                className="px-3 py-2 rounded bg-black text-white hover:opacity-90 text-sm"
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
