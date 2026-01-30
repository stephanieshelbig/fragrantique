"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type RecommendedFragrance = {
  id: string | number;
  brand?: string | null;
  name?: string | null;
  image_url?: string | null;
  accords?: any;
  reason?: string | null;
};

function parseLines(input: string): string[] {
  return input
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);
}

function accordsToText(accords: any): string {
  if (!accords) return "";
  if (Array.isArray(accords)) {
    const names = accords
      .map((a) => (typeof a?.name === "string" ? a.name.trim() : ""))
      .filter(Boolean);
    return names.slice(0, 8).join(" • ");
  }
  return "";
}

export default function FragrantiqueAIPage() {
  const [likesText, setLikesText] = useState("");
  const [dislikesText, setDislikesText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecommendedFragrance[]>([]);

  const likes = useMemo(() => parseLines(likesText), [likesText]);
  const dislikes = useMemo(() => parseLines(dislikesText), [dislikesText]);

  // Adjust if your route differs
  const FRAGRANCE_DETAIL_BASE = "/fragrance";

  async function handleRecommend() {
    setError(null);
    setResults([]);

    if (likes.length === 0 && dislikes.length === 0) {
      setError("Please enter at least one fragrance you like or dislike.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/fragrantique-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ likes, dislikes, limit: 12 }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to generate recommendations.");

      setResults(Array.isArray(data?.recommendations) ? data.recommendations : []);
    } catch (e: any) {
      setError(e?.message || "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

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
            className="rounded-3xl border border-[#d9c39a] shadow-xl px-6 md:px-8 py-10 bg-white/95"
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

            {/* Title */}
            <div className="text-center space-y-3">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-wide text-[#182A39]">
                Fragrantique AI
              </h1>
              <p className="text-base md:text-lg text-[#182A39]/90 leading-relaxed">
                Tell me what you <span className="font-semibold">love</span> and what you{" "}
                <span className="font-semibold">don’t</span>, and I’ll suggest fragrances from my collection you
                might like.
              </p>
            </div>

            {/* Divider */}
            <div className="mt-8 mb-6 flex justify-center">
              <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#d9c39a] to-transparent" />
            </div>

            {/* Inputs */}
            <div className="grid gap-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#ead9b8] bg-white/85 p-4 shadow-sm">
                  <div className="text-sm font-semibold text-[#182A39] mb-2">Fragrances you like</div>
                  <textarea
                    value={likesText}
                    onChange={(e) => setLikesText(e.target.value)}
                    placeholder={`Examples:\nMind Games - The Forward\nParfums de Marly - Delina\nNishane - Ani`}
                    className="w-full min-h-[140px] rounded-xl border border-[#ead9b8] bg-white px-3 py-2 text-sm text-[#182A39] outline-none focus:ring-2 focus:ring-[#d9c39a]/60"
                  />
                </div>

                <div className="rounded-2xl border border-[#ead9b8] bg-white/85 p-4 shadow-sm">
                  <div className="text-sm font-semibold text-[#182A39] mb-2">Fragrances you dislike</div>
                  <textarea
                    value={dislikesText}
                    onChange={(e) => setDislikesText(e.target.value)}
                    placeholder={`Examples:\nAnything too smoky\nOverly sweet vanilla bombs\nStrong patchouli`}
                    className="w-full min-h-[140px] rounded-xl border border-[#ead9b8] bg-white px-3 py-2 text-sm text-[#182A39] outline-none focus:ring-2 focus:ring-[#d9c39a]/60"
                  />
                </div>
              </div>

              <button
                onClick={handleRecommend}
                disabled={loading}
                className="self-center rounded-2xl border border-[#ead9b8] bg-white/90 px-8 py-3 shadow-sm hover:shadow-[0_0_25px_rgba(217,195,154,0.7)] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-60"
              >
                <span className="font-semibold text-[#182A39]">
                  {loading ? "Thinking…" : "Suggest fragrances"}
                </span>
              </button>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Results */}
              {results.length > 0 && (
                <div className="mt-2">
                  <div className="text-center mb-4">
                    <h2 className="text-xl font-semibold text-[#182A39]">Suggestions</h2>
                    <p className="text-sm text-[#182A39]/75">
                      Click any fragrance to view full details.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {results.map((f, idx) => {
                      const accordsText = accordsToText(f.accords);
                      const href = `${FRAGRANCE_DETAIL_BASE}/${encodeURIComponent(String(f.id))}`;

                      return (
                        <Link key={`${f.id}-${idx}`} href={href} className="block">
                          <div className="rounded-2xl border border-[#ead9b8] bg-white/90 p-4 shadow-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_22px_rgba(217,195,154,0.6)]">
                            <div className="flex gap-4 items-start">
                              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#ead9b8] bg-white shrink-0">
                                {f.image_url ? (
                                  <Image
                                    src={f.image_url}
                                    alt={`${f.brand || ""} ${f.name || ""}`}
                                    fill
                                    sizes="64px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs text-[#182A39]/50">
                                    No image
                                  </div>
                                )}
                              </div>

                              <div className="flex-1">
                                <div className="text-sm text-[#182A39]/70">{f.brand}</div>
                                <div className="text-base font-semibold text-[#182A39]">{f.name}</div>

                                {accordsText && (
                                  <div className="mt-1 text-xs text-[#182A39]/70">{accordsText}</div>
                                )}

                                {f.reason && (
                                  <div className="mt-2 text-sm text-[#182A39]/90">
                                    <span className="font-semibold">Why:</span> {f.reason}
                                  </div>
                                )}

                                <div className="mt-2 text-xs text-[#182A39]/60">
                                  Tap to view fragrance →
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
