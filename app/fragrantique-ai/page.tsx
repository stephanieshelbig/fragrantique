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
              Fragrantique AI
            </h1>
            <p className="text-base md:text-lg text-[#182A39]/90">
              Tell me what you love and what you don’t, and I’ll suggest fragrances from my
              collection you might like.
            </p>
          </div>

          <div className="mt-8 grid gap-5">
            <div className="grid md:grid-cols-2 gap-4">
              <textarea
                value={likesText}
                onChange={(e) => setLikesText(e.target.value)}
                placeholder="Fragrances you like"
                className="min-h-[140px] rounded-xl border px-3 py-2"
              />
              <textarea
                value={dislikesText}
                onChange={(e) => setDislikesText(e.target.value)}
                placeholder="Fragrances you dislike"
                className="min-h-[140px] rounded-xl border px-3 py-2"
              />
            </div>

            <button
              onClick={handleRecommend}
              disabled={loading}
              className="self-center rounded-2xl border px-8 py-3"
            >
              {loading ? "Thinking…" : "Suggest fragrances"}
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
  );
}
