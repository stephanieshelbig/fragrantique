"use client";

import Image from "next/image";
import Link from "next/link";

/**
 * Fixed footer with Footer.png background and four clickable hotspots:
 * HOME (/), BRANDS (/brand), CONTACT (/chat), CART (/cart)
 *
 * The image is treated as a background; we place absolutely-positioned
 * <Link> overlays on top of where the labels appear in the PNG.
 * Tweak hotspot positions if your PNG spacing changes.
 */
export default function FooterNav() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        // light frame behind to make it feel “mounted”
        boxShadow: "0 -6px 18px rgba(0,0,0,0.08)",
      }}
    >
      <div className="relative mx-auto w-full max-w-[1200px]">
        {/* Footer image */}
        <Image
          src="/Footer.png"
          alt="Fragrantique Footer Navigation"
          width={1200}
          height={310}
          priority
          className="w-full h-auto select-none pointer-events-none"
        />

        {/* Clickable hotspots (adjust percentages to match your art) */}
        <div className="absolute inset-0">
          {/* HOME */}
          <Link
            href="/"
            aria-label="Home"
            className="absolute"
            style={{
              left: "9%",
              bottom: "10%",
              width: "16%",
              height: "23%",
            }}
          />
          {/* BRANDS */}
          <Link
            href="/brand"
            aria-label="Brands"
            className="absolute"
            style={{
              left: "30%",
              bottom: "10%",
              width: "18%",
              height: "23%",
            }}
          />
          {/* CONTACT */}
          <Link
            href="/chat"
            aria-label="Contact"
            className="absolute"
            style={{
              left: "54%",
              bottom: "10%",
              width: "18%",
              height: "23%",
            }}
          />
          {/* CART */}
          <Link
            href="/cart"
            aria-label="Cart"
            className="absolute"
            style={{
              left: "78%",
              bottom: "10%",
              width: "14%",
              height: "23%",
            }}
          />
        </div>
      </div>
      {/* Spacer so content doesn’t hide behind the fixed footer */}
      <div className="h-[110px]" />
    </div>
  );
}
