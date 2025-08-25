"use client";

import Image from "next/image";
import Link from "next/link";

/**
 * Responsive fixed footer using /public/Footer.png
 * - Scales from mobile → desktop
 * - Clickable hotspots:
 *   HOME  -> /
 *   BRANDS-> /brand
 *   CONTACT-> /chat
 *   CART  -> /cart
 *
 * Hotspots use % so they track with the image size.
 */
export default function FooterNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* Responsive width: 100% width up to 900px max, with gentle shadow */}
      <div
        className="relative mx-auto w-[92vw] max-w-[900px] sm:w-[88vw] md:w-[84vw]"
        style={{ boxShadow: "0 -6px 18px rgba(0,0,0,0.08)" }}
      >
        {/* Footer image */}
        <Image
          src="/Footer.png"
          alt="Fragrantique Footer Navigation"
          width={900}
          height={230}
          priority
          className="w-full h-auto select-none pointer-events-none"
        />

        {/* Clickable hotspots (positions as % of image area) */}
        <div className="absolute inset-0">
          {/* HOME */}
          <Link
            href="/"
            aria-label="Home"
            className="absolute"
            style={{
              left: "9.5%",
              bottom: "12%",
              width: "16%",
              height: "25%",
            }}
          />

          {/* BRANDS */}
          <Link
            href="/brand"
            aria-label="Brands"
            className="absolute"
            style={{
              left: "31%",
              bottom: "12%",
              width: "18%",
              height: "25%",
            }}
          />

          {/* CONTACT */}
          <Link
            href="/chat"
            aria-label="Contact"
            className="absolute"
            style={{
              left: "54%",
              bottom: "12%",
              width: "18%",
              height: "25%",
            }}
          />

          {/* CART */}
          <Link
            href="/cart"
            aria-label="Cart"
            className="absolute"
            style={{
              left: "78%",
              bottom: "12%",
              width: "14%",
              height: "25%",
            }}
          />
        </div>
      </div>

      {/* Spacer so page content doesn’t hide behind the fixed footer.
         Smaller on phones, larger on desktops. */}
      <div className="h-[64px] sm:h-[72px] md:h-[84px]" />
    </div>
  );
}
