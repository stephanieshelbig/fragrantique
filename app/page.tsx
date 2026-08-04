"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useState } from "react";

type SignupStatus = "idle" | "loading" | "success" | "error";

function SquareCard({
  href,
  icon,
  title,
  description,
  iconClassName,
  cardClassName,
  featured = false,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  iconClassName: string;
  cardClassName: string;
  featured?: boolean;
}) {
  return (
    <Link href={href} className="block h-full">
      <div
        className={`group relative min-h-[170px] overflow-hidden rounded-2xl border-2 p-4 flex flex-col items-center justify-center text-center shadow-md hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 cursor-pointer ${cardClassName} ${
          featured ? "ring-2 ring-[#d9c39a]/60" : ""
        }`}
      >
        {featured && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(217,195,154,0.25),transparent_70%)]" />
        )}

        <div
          className={`relative z-10 mb-3 flex h-12 w-12 items-center justify-center rounded-full shadow-inner ${iconClassName}`}
        >
          <span className="text-xl">{icon}</span>
        </div>

        <div className="relative z-10 text-sm md:text-base font-semibold text-[#182A39] leading-snug">
          {title}
        </div>

        <div className="relative z-10 mt-1.5 text-xs text-[#182A39]/70 leading-relaxed">
          {description}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [signupStatus, setSignupStatus] = useState<SignupStatus>("idle");
  const [signupMessage, setSignupMessage] = useState("");

  async function handleEmailSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setSignupStatus("error");
      setSignupMessage("Please enter your email address.");
      return;
    }

    setSignupStatus("loading");
    setSignupMessage("");

    try {
      const response = await fetch("/api/email-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        setSignupStatus("error");
        setSignupMessage(result.error || "Something went wrong. Please try again.");
        return;
      }

      setSignupStatus("success");

      if (result.alreadySignedUp) {
        setSignupMessage("You’re already signed up 💕");
      } else {
        setSignupMessage("Thank you! You’re signed up for Fragrantique emails 💕");
      }

      setEmail("");
    } catch (error) {
      console.error(error);
      setSignupStatus("error");
      setSignupMessage("Something went wrong. Please try again.");
    }
  }

  return (
    <main
      className="min-h-screen flex justify-center px-4 py-12 bg-[#1B012F]"
      style={{
        backgroundImage: `
          radial-gradient(circle at top, rgba(217,195,154,0.10), transparent 35%),
          repeating-linear-gradient(
            45deg,
            rgba(255,255,255,0.03),
            rgba(255,255,255,0.03) 6px,
            transparent 6px,
            transparent 12px
          )
        `,
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
          <div className="text-center space-y-4">
            <h1 className="font-[family:var(--font-cormorant)] text-2xl md:text-3xl font-medium tracking-[0.08em] text-[#182A39]">
              Welcome to Fragrantique
            </h1>

            <p className="text-lg md:text-xl text-[#4b5360] leading-9 font-light italic max-w-2xl mx-auto">
              (Turn your phone to the side - it's best viewed in landscape mode)
              Thank you so much for viewing my page! I sell decants of my fragrance collection so everyone can enjoy. Click one
              of the buttons below to start browsing my collection💕
            </p>
          </div>

          <div className="text-center space-y-4 mt-4">
            <p className="text-base md:text-lg text-[#b99254]/90 leading-relaxed">
              *** I am in the US and can only ship to addresses in the US... for now.
            </p>
          </div>

          <div className="mt-8 mb-6 flex justify-center">
            <div className="h-px w-32 bg-gradient-to-r from-transparent via-[#d9c39a] to-transparent" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <SquareCard
              href="/notes"
              icon="🔍"
              title="Search My Collection"
              description="Best for easy viewing on mobile"
              iconClassName="bg-gradient-to-br from-[#dce7ff] to-[#9eb8f4]"
              cardClassName="border-[#9eb8f4] bg-gradient-to-br from-[#f4f7ff] to-[#e5ecff] hover:border-[#021E61]"
            />
            <SquareCard
              href="/brand"
              icon="🏷️"
              title="Sort by Brand"
              description="Display my collection by Brand Name"
              iconClassName="bg-gradient-to-br from-[#eadcff] to-[#c7a4ef]"
              cardClassName="border-[#c7a4ef] bg-gradient-to-br from-[#fbf7ff] to-[#efe4ff] hover:border-[#390379]"
            />
            <SquareCard
              href="/new"
              icon="🆕"
              title="See What’s New"
              description="Browse fragrances added in the last 30 days"
              iconClassName="bg-gradient-to-br from-[#dff3e7] to-[#9ecfb2]"
              cardClassName="border-[#9ecfb2] bg-gradient-to-br from-[#f7fcf8] to-[#e7f6ec] hover:border-[#4e8b69]"
            />
            <SquareCard
              href="/recommendations"
              icon="✨"
              title="Get Recommendations"
              description="Let me suggest something you might love"
              iconClassName="bg-gradient-to-br from-[#fff0c9] to-[#dfbd6f]"
              cardClassName="border-[#dfbd6f] bg-gradient-to-br from-[#fffaf0] to-[#f8ebca] hover:border-[#b99254]"
            />
            <SquareCard
              href="/fragrantique-ai"
              icon="🤖"
              title="Fragrantique AI"
              description="Get personalized fragrance matches powered by AI"
              iconClassName="bg-gradient-to-br from-[#ffe9ad] to-[#c99f3d]"
              cardClassName="border-[#c99f3d] bg-gradient-to-br from-[#fff8e5] to-[#f0d996] hover:border-[#8f6b1d] hover:shadow-[0_0_28px_rgba(201,159,61,0.45)]"
              featured
            />
            <SquareCard
              href="/requests"
              icon="🙏🏻"
              title="Request a Fragrance"
              description="Submit a request for a fragrance not on the site"
              iconClassName="bg-gradient-to-br from-[#f8dce5] to-[#d9a3b6]"
              cardClassName="border-[#d9a3b6] bg-gradient-to-br from-[#fff7fa] to-[#f8e5ec] hover:border-[#9d4f69]"
            />
          </div>

          <Link href="/photos" className="block mt-8">
            <div className="group relative overflow-hidden rounded-3xl border border-[#ead9b8] bg-white/90 px-6 py-6 shadow-sm hover:shadow-[0_0_25px_rgba(217,195,154,0.7)] hover:-translate-y-1 transition-all duration-300 cursor-pointer">
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#fbe5ff] to-[#e1b7ff] shadow-inner">
                  <span className="text-2xl">📸</span>
                </div>

                <div>
                  <div className="text-lg md:text-xl font-semibold text-[#182A39]">
                    Pictures of My Collection
                  </div>

                  <div className="text-sm md:text-base text-[#182A39]/70 mt-1">
                    See photos of my fragrance collection
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <div className="mt-8 relative overflow-hidden rounded-3xl border-2 border-[#d9c39a] bg-gradient-to-br from-[#fff7ec] to-[#f7e8d4] px-8 py-8 shadow-[0_0_35px_rgba(217,195,154,0.35)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,195,154,0.18),transparent_60%)]" />

            <div className="relative z-10">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#fff1d6] to-[#e7cfa2] shadow-inner text-3xl">
                  💌
                </div>
              </div>

              <div className="text-center mb-5">
                <div className="text-3xl md:text-4xl font-[family:var(--font-cormorant)] font-semibold tracking-[0.08em] text-[#182A39]">
                  Join the Fragrantique List
                </div>

                <p className="mt-3 text-sm md:text-base text-[#4b5360] leading-relaxed max-w-xl mx-auto">
                  Be the first to hear about new fragrance arrivals and special offers.
                </p>
              </div>

              <form onSubmit={handleEmailSignup} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="min-w-0 flex-1 rounded-full border border-[#d9c39a] bg-white px-5 py-3 text-sm text-[#182A39] outline-none placeholder:text-[#182A39]/40 focus:border-[#b99254] focus:ring-2 focus:ring-[#d9c39a]/40"
                />

                <button
                  type="submit"
                  disabled={signupStatus === "loading"}
                  className="rounded-full bg-gradient-to-r from-[#182A39] to-[#24384b] px-8 py-3 text-sm font-semibold tracking-[0.08em] text-white shadow-md hover:shadow-[0_0_20px_rgba(24,42,57,0.4)] hover:-translate-y-0.5 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signupStatus === "loading" ? "SIGNING UP..." : "SIGN UP"}
                </button>
              </form>

              {signupMessage && (
                <p
                  className={`mt-3 text-center text-sm ${
                    signupStatus === "error" ? "text-red-700" : "text-[#b99254]"
                  }`}
                >
                  {signupMessage}
                </p>
              )}

              <p className="mt-3 text-center text-xs text-[#182A39]/55">
                By signing up, you agree to receive promotional emails from Fragrantique. I will <strong>never</strong> sell your info.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <a href="https://www.tiktok.com/@fragrantique.net" target="_blank" rel="noopener noreferrer" aria-label="Visit Fragrantique on TikTok" className="group inline-flex items-center gap-2 rounded-full border border-[#ead9b8] bg-white/90 px-4 py-2.5 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(217,195,154,0.5)] transition-all duration-200">
              <span className="text-sm font-medium text-[#182A39]">TikTok</span>
            </a>

            <a href="https://www.instagram.com/fragrantique_net" target="_blank" rel="noopener noreferrer" aria-label="Visit Fragrantique on Instagram" className="group inline-flex items-center gap-2 rounded-full border border-[#ead9b8] bg-white/90 px-4 py-2.5 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(217,195,154,0.5)] transition-all duration-200">
              <span className="text-sm font-medium text-[#182A39]">Instagram</span>
            </a>

            <a href="https://www.youtube.com/@fragrantique" target="_blank" rel="noopener noreferrer" aria-label="Visit Fragrantique on YouTube" className="group inline-flex items-center gap-2 rounded-full border border-[#ead9b8] bg-white/90 px-4 py-2.5 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(217,195,154,0.5)] transition-all duration-200">
              <span className="text-sm font-medium text-[#182A39]">YouTube</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
