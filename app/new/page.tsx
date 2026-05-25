"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Fragrance = {
  id: string;
  brand: string | null;
  name: string | null;
  image_url: string | null;
  image_url_transparent: string | null;
  created_at: string | null;
};

export default function WhatsNewPage() {
  const [fragrances, setFragrances] = useState<Fragrance[]>([]);
  const [loading, setLoading] = useState(true);

  const thirtyDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString();
  }, []);

  useEffect(() => {
    async function loadNewFragrances() {
      setLoading(true);

      const { data, error } = await supabase
        .from("fragrances")
        .select("id, brand, name, image_url, image_url_transparent, created_at")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading new fragrances:", error);
        setFragrances([]);
      } else {
        setFragrances(data || []);
      }

      setLoading(false);
    }

    loadNewFragrances();
  }, [thirtyDaysAgo]);

  return (
    <main className="min-h-screen bg-[#fdfcf9] px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="mb-5 inline-block rounded-full border border-[#d9c39a] bg-white px-4 py-2 text-sm text-[#182A39] shadow-sm hover:shadow-md"
          >
            ← Back Home
          </Link>

          <h1 className="text-3xl font-semibold tracking-wide text-[#182A39]">
            See What&apos;s New
          </h1>

          <p className="mt-3 text-[#182A39]/75">
            Fragrances added in the last 30 days
          </p>
        </div>

        {loading ? (
          <div className="text-center text-[#182A39]/70">Loading new fragrances...</div>
        ) : fragrances.length === 0 ? (
          <div className="rounded-3xl border border-[#ead9b8] bg-white/90 p-8 text-center shadow-sm">
            <p className="text-[#182A39]">
              No fragrances have been added in the last 30 days.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {fragrances.map((fragrance) => {
              const image =
                fragrance.image_url_transparent || fragrance.image_url || "";

              return (
                <Link
  key={fragrance.id}
  href={`/fragrance/${fragrance.id}`}
  target="_blank"
  rel="noopener noreferrer"
  className="group rounded-3xl border border-[#ead9b8] bg-white/95 p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(217,195,154,0.55)]"
>
                  <div className="flex h-56 items-center justify-center rounded-2xl bg-[#fff8ee] p-4">
                    {image ? (
                      <Image
                        src={image}
                        alt={`${fragrance.brand || ""} ${fragrance.name || ""}`}
                        width={220}
                        height={220}
                        className="max-h-full w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="text-sm text-[#182A39]/50">No image</div>
                    )}
                  </div>

                  <div className="mt-4 text-center">
                    <div className="text-sm uppercase tracking-wide text-[#b99254]">
                      {fragrance.brand || "Unknown Brand"}
                    </div>
                    <div className="mt-1 text-base font-semibold text-[#182A39]">
                      {fragrance.name || "Unnamed Fragrance"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
