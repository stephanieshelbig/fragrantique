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
          <div className="rounded-3xl border border-[#d9c39a] shadow-xl px-6 md:px-8 py-10 bg-white/95">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <Image
                src="/FragrantiqueLogo3.png"
                alt="Fragrantique Logo"
                width={190}
                height={80}
                priority
              />
            </div>

            <div className="text-center space-y-3">
              <h1 className="text-2xl md:text-3xl font-semibold tracking-wide text-[#182A39]">
                FragrantiqueAI
              </h1>
              <p className="text-base md:text-lg text-[#182A39]">
                Tell me what you like and what you dislike
              </p>
              <p className="text-base md:text-lg text-[#182A39]">
                (fragrance, notes, brands, feelings, perfumers, etc)
              </p>
              <p className="text-base md:text-lg text-[#182A39]">
                and FragrantiqueAI will suggest fragrances from my collection.
              </p>
            </div>

            <div className="mt-8 grid gap-5">
              <div className="grid md:grid-cols-2 gap-4">
                <textarea
                  value={likesText}
                  onChange={(e) => setLikesText(e.target.value)}
                  placeholder="What you like (one item per line, as many lines as you want)"
                  className="min-h-[140px] rounded-xl border px-3 py-2"
                />
                <textarea
                  value={dislikesText}
                  onChange={(e) => setDislikesText(e.target.value)}
                  placeholder="What you dislike (one item per line, as many lines as you want)"
                  className="min-h-[140px] rounded-xl border px-3 py-2"
                />
              </div>

              <button
                onClick={handleRecommend}
                disabled={loading}
                className="self-center w-full sm:w-auto relative overflow-hidden rounded-2xl px-10 py-3.5 font-semibold text-[#182A39]
                           bg-gradient-to-br from-[#fff7ec] via-[#f6e7c8] to-[#e7cfa2]
                           border border-[#d9c39a]
                           shadow-md
                           hover:shadow-[0_0_30px_rgba(217,195,154,0.95)]
                           hover:-translate-y-0.5
                           transition-all duration-300
                           disabled:opacity-60 disabled:cursor-not-allowed
                           disabled:hover:translate-y-0"
                style={{
                  animation: loading ? "none" : "aiPulse 2.8s ease-in-out infinite",
                }}
              >
                <span className="absolute inset-0 rounded-2xl opacity-70 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,245,220,0.35),rgba(217,195,154,0.12)_45%,transparent_72%)]" />
                <span className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(217,195,154,0.38),transparent_70%)]" />
                <span className="absolute inset-y-0 -left-1/3 w-1/3 rotate-12 bg-white/30 blur-xl pointer-events-none animate-[aiShimmer_3.5s_ease-in-out_infinite]" />

                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>{loading ? "Thinking…" : "✨ Suggest Fragrances"}</span>
                </span>
              </button>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              {results.length > 0 && (
                <div className="grid gap-4">
                  {results.map((f, idx) => {
                    const accordsText = accordsToText(f.accords);
                    const href = `${FRAGRANCE_DETAIL_BASE}/${encodeURIComponent(String(f.id))}`;

                    return (
                      <Link
                        key={`${f.id}-${idx}`}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <div className="rounded-2xl border p-4 hover:shadow-lg transition cursor-pointer">
                          <div className="flex gap-4">
                            {f.image_url && (
                              <Image
                                src={f.image_url}
                                alt={f.name || ""}
                                width={64}
                                height={64}
                                className="rounded"
                              />
                            )}
                            <div>
                              <div className="text-sm opacity-70">{f.brand}</div>
                              <div className="font-semibold">{f.name}</div>
                              {accordsText && (
                                <div className="text-xs opacity-70">{accordsText}</div>
                              )}
                              {f.reason && (
                                <div className="text-sm mt-1">
                                  <strong>Why:</strong> {f.reason}
                                </div>
                              )}
                              <div className="text-xs opacity-60 mt-1">
                                Opens in a new tab →
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes aiPulse {
          0%, 100% {
            box-shadow:
              0 8px 20px rgba(0,0,0,0.08),
              0 0 0 0 rgba(217,195,154,0.35);
            transform: translateY(0);
          }
          50% {
            box-shadow:
              0 12px 28px rgba(0,0,0,0.12),
              0 0 22px 3px rgba(217,195,154,0.45);
            transform: translateY(-1px);
          }
        }

        @keyframes aiShimmer {
          0% {
            transform: translateX(-120%) rotate(12deg);
            opacity: 0;
          }
          20% {
            opacity: 0.45;
          }
          50% {
            transform: translateX(320%) rotate(12deg);
            opacity: 0.18;
          }
          100% {
            transform: translateX(320%) rotate(12deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
