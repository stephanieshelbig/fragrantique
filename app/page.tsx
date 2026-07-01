"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useState } from "react";
import { supabase } from "@/lib/supabase";

type SignupStatus = "idle" | "loading" | "success" | "error";

function SquareCard({
  href,
  icon,
  title,
  description,
  iconClassName,
  featured = false,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  iconClassName: string;
  featured?: boolean;
}) {
  return (
    <Link href={href} className="block h-full">
      <div
        className={`group relative h-full aspect-square overflow-hidden rounded-3xl border p-5 flex flex-col items-center justify-center text-center shadow-sm hover:-translate-y-1 transition-all duration-300 cursor-pointer ${
          featured
            ? "border-[#d9c39a] bg-gradient-to-br from-[#fff7ec] to-[#f7e8d4] hover:shadow-[0_0_35px_rgba(217,195,154,0.9)]"
            : "border-[#ead9b8] bg-white/90 hover:shadow-[0_0_25px_rgba(217,195,154,0.7)]"
        }`}
      >
        {featured && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(217,195,154,0.25),transparent_70%)]" />
        )}

        <div
          className={`relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-full shadow-inner ${iconClassName}`}
        >
          <span className="text-2xl">{icon}</span>
        </div>

        <div className="relative z-10 text-base md:text-lg font-semibold text-[#182A39] leading-snug">
          {title}
        </div>

        <div className="relative z-10 mt-2 text-xs md:text-sm text-[#182A39]/70 leading-relaxed">
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

    const { error } = await supabase
      .from("promotional_email_signups")
      .insert([{ email: trimmedEmail }]);

    if (error) {
      if (error.code === "23505") {
        setSignupStatus("success");
        setSignupMessage("You’re already signed up 💕");
        setEmail("");
        return;
      }

      setSignupStatus("error");
      setSignupMessage("Something went wrong. Please try again.");
      return;
    }

    setSignupStatus("success");
    setSignupMessage("Thank you! You’re signed up for Fragrantique emails 💕");
    setEmail("");
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
              Thank you so much for viewing my page! I have a large fragrance collection,
              and I sell decants of it to make some extra money. Click one
              of the buttons below to start browsing my collection. Feel free to contact me
              using the <span className="font-semibold">'Contact Me'</span> link at the top
              of the page💕
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <SquareCard
              href="/notes"
              icon="🔍"
              title="Search My Collection"
              description="Best for easy viewing on mobile"
              iconClassName="bg-gradient-to-br from-[#f5e2c3] to-[#d9b675]"
            />

            <SquareCard
              href="/brand"
              icon="🏷️"
              title="Sort by Brand"
              description="Display my collection by Brand Name"
              iconClassName="bg-gradient-to-br from-[#ffe9d9] to-[#f1bfa0]"
            />

            <SquareCard
              href="/new"
              icon="🆕"
              title="See What’s New"
              description="Browse fragrances added in the last 30 days"
              iconClassName="bg-gradient-to-br from-[#fff1d6] to-[#d9b675]"
            />

            <SquareCard
              href="/recommendations"
              icon="✨"
              title="Get Recommendations"
              description="Let me suggest something you might love"
              iconClassName="bg-gradient-to-br from-[#fbe5ff] to-[#e1b7ff]"
            />

            <SquareCard
              href="/fragrantique-ai"
              icon="🤖"
              title="Fragrantique AI"
              description="Get personalized fragrance matches powered by AI"
              iconClassName="bg-gradient-to-br from-[#fff1d6] to-[#e7cfa2]"
              featured
            />

            <SquareCard
              href="/requests"
              icon="🙏🏻"
              title="Request a Fragrance"
              description="Submit a request for a fragrance not on the site"
              iconClassName="bg-gradient-to-br from-[#fbe5ff] to-[#e1b7ff]"
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
          <div className="mt-8 rounded-3xl border border-[#d9c39a] bg-white/85 px-6 py-6 shadow-sm">
            <div className="text-center mb-4">
              <div className="text-xl md:text-2xl font-[family:var(--font-cormorant)] font-semibold tracking-[0.05em] text-[#182A39]">
                Join the Fragrantique List
              </div>

              <p className="mt-2 text-sm md:text-base text-[#4b5360] leading-relaxed">
                Sign up to receive promotional emails, new fragrance updates, special offers,
                and Fragrantique news.
              </p>
            </div>

            <form onSubmit={handleEmailSignup} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="min-w-0 flex-1 rounded-full border border-[#ead9b8] bg-white px-5 py-3 text-sm text-[#182A39] outline-none placeholder:text-[#182A39]/40 focus:border-[#b99254] focus:ring-2 focus:ring-[#d9c39a]/40"
              />

              <button
                type="submit"
                disabled={signupStatus === "loading"}
                className="rounded-full bg-[#182A39] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(24,42,57,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {signupStatus === "loading" ? "Signing up..." : "Sign Up"}
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
              By signing up, you agree to receive promotional emails from Fragrantique.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <a
              href="https://www.tiktok.com/@fragrantique.net"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Fragrantique on TikTok"
              className="group inline-flex items-center gap-2 rounded-full border border-[#ead9b8] bg-white/90 px-4 py-2.5 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(217,195,154,0.5)] transition-all duration-200"
            >
              <span className="text-sm font-medium text-[#182A39]">TikTok</span>
            </a>

            <a
              href="https://www.instagram.com/fragrantique_net"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Fragrantique on Instagram"
              className="group inline-flex items-center gap-2 rounded-full border border-[#ead9b8] bg-white/90 px-4 py-2.5 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(217,195,154,0.5)] transition-all duration-200"
            >
              <span className="text-sm font-medium text-[#182A39]">Instagram</span>
            </a>

            <a
              href="https://www.youtube.com/@fragrantique"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Fragrantique on YouTube"
              className="group inline-flex items-center gap-2 rounded-full border border-[#ead9b8] bg-white/90 px-4 py-2.5 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(217,195,154,0.5)] transition-all duration-200"
            >
              <span className="text-sm font-medium text-[#182A39]">YouTube</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
